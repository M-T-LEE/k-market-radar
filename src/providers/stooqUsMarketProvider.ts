import { createStockFromUniverseQuote } from "../lib/stockUniverseFactory";
import type { MarketIndexSnapshot } from "../types/marketData";
import type { Stock } from "../types/stock";
import {
  largeCapSymbols,
  referenceExchanges,
  referenceMarketCapsUsd,
  referenceNames
} from "./fmpUniverseProvider";
import { parseNumber } from "./providerUtils";

const CACHE_TTL_MS = 10 * 60 * 1000;
const STOOQ_BATCH_CHUNK_SIZE = 80;
const STOOQ_SOURCE_LABEL = "Stooq 지연/참고 시세";

type StooqRow = {
  Symbol: string;
  Date: string;
  Time: string;
  Open: string;
  High: string;
  Low: string;
  Close: string;
  Volume: string;
  Prev?: string;
};

export type StooqFailure = {
  symbol: string;
  message: string;
};

export type StooqUniverseResult = {
  stocks: Stock[];
  requested: number;
  loaded: number;
  failures: StooqFailure[];
  warning?: string;
};

const quoteCache = new Map<string, { expiresAt: number; row: StooqRow }>();
let universeCache: { key: string; expiresAt: number; result: StooqUniverseResult } | null = null;
let indexCache: { expiresAt: number; indices: MarketIndexSnapshot[] } | null = null;

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("stooqUsMarketProvider must be called server-side only");
  }
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\.US$/, "").replace(/\./g, "-");
}

function toStooqSymbol(symbol: string) {
  if (symbol.trim().startsWith("^")) return symbol.trim().toLowerCase();
  return `${symbol.trim().toLowerCase().replace(".", "-")}.us`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseStooqCsv(text: string): StooqRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {}) as StooqRow;
  });
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchStooqRows(symbols: string[]) {
  const requestSymbols = symbols.map(toStooqSymbol).join("+");
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(requestSymbols).replace(/%2B/g, "+")}&f=sd2t2ohlcvp&h&e=csv`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "K-Market Radar delayed quote adapter"
    }
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Stooq quote request failed: ${response.status} ${text.slice(0, 180)}`);
  }

  return parseStooqCsv(text);
}

async function getRowsWithCache(symbols: string[]) {
  const now = Date.now();
  const cachedRows = new Map<string, StooqRow>();
  const missing = symbols.filter((symbol) => {
    const normalized = normalizeSymbol(symbol);
    const cached = quoteCache.get(normalized);
    if (cached && cached.expiresAt > now) {
      cachedRows.set(normalized, cached.row);
      return false;
    }
    return true;
  });

  if (missing.length) {
    const rows = (
      await Promise.all(chunkArray(missing, STOOQ_BATCH_CHUNK_SIZE).map((chunk) => fetchStooqRows(chunk)))
    ).flat();
    rows.forEach((row) => {
      const symbol = normalizeSymbol(row.Symbol);
      if (!symbol) return;
      quoteCache.set(symbol, { expiresAt: now + CACHE_TTL_MS, row });
      cachedRows.set(symbol, row);
    });
  }

  return symbols.map((symbol) => cachedRows.get(normalizeSymbol(symbol))).filter(Boolean) as StooqRow[];
}

function buildUpdatedAt(row: StooqRow) {
  if (!row.Date || row.Date === "N/D") return new Date().toISOString();
  const time = row.Time && row.Time !== "N/D" ? row.Time : "00:00:00";
  const date = new Date(`${row.Date}T${time}Z`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeStooqStock(row: StooqRow, requestedSymbol: string) {
  const symbol = normalizeSymbol(requestedSymbol);
  const close = parseNumber(row.Close);
  const previous = parseNumber(row.Prev);
  const marketCap = referenceMarketCapsUsd[symbol] ?? 0;

  if (!close || row.Close === "N/D") {
    throw new Error("Stooq close price unavailable");
  }
  if (!marketCap) {
    throw new Error("reference marketCap unavailable");
  }

  const change = previous ? close - previous : 0;
  const changeRate = previous ? (change / previous) * 100 : 0;

  return createStockFromUniverseQuote({
    name: referenceNames[symbol] ?? symbol,
    ticker: symbol,
    market: marketCap >= 100_000_000_000 ? "US Large Cap" : "US Growth",
    exchange: referenceExchanges[symbol] ?? "US",
    price: close,
    change,
    changeRate,
    volume: parseNumber(row.Volume),
    marketCap: marketCap / 100_000_000,
    source: "STOOQ",
    sourceLabel: STOOQ_SOURCE_LABEL,
    updatedAt: buildUpdatedAt(row),
    assetType: ["TSM", "ASML", "NVO", "ARM"].includes(symbol) ? "ADR" : "COMMON"
  });
}

function buildWarning(stocks: Stock[], failures: StooqFailure[], requested: number) {
  if (!failures.length) return undefined;
  const sample = failures
    .slice(0, 5)
    .map((failure) => `${failure.symbol} ${failure.message}`)
    .join("; ");
  return `Stooq partial: ${stocks.length}/${requested} loaded. sample failures: ${sample}`;
}

export async function getStooqUsUniverseResult(symbols = largeCapSymbols, options: { forceRefresh?: boolean } = {}) {
  assertServerSide();

  const normalizedSymbols = Array.from(new Set(symbols.map(normalizeSymbol).filter(Boolean)));
  const cacheKey = normalizedSymbols.join(",");
  if (!options.forceRefresh && universeCache?.key === cacheKey && universeCache.expiresAt > Date.now()) {
    return universeCache.result;
  }

  const rows = await getRowsWithCache(normalizedSymbols);
  const rowsBySymbol = new Map(rows.map((row) => [normalizeSymbol(row.Symbol), row]));
  const stocks: Stock[] = [];
  const failures: StooqFailure[] = [];

  normalizedSymbols.forEach((symbol) => {
    const row = rowsBySymbol.get(symbol);
    if (!row) {
      failures.push({ symbol, message: "Stooq quote missing symbol" });
      return;
    }

    try {
      stocks.push(normalizeStooqStock(row, symbol));
    } catch (error) {
      failures.push({ symbol, message: error instanceof Error ? error.message : String(error) });
    }
  });

  if (!stocks.length) {
    const sample = failures.slice(0, 5).map((failure) => `${failure.symbol} ${failure.message}`).join("; ");
    throw new Error(`Stooq US universe is empty. sample failures: ${sample || "no response details"}`);
  }

  const result: StooqUniverseResult = {
    stocks,
    requested: normalizedSymbols.length,
    loaded: stocks.length,
    failures,
    warning: buildWarning(stocks, failures, normalizedSymbols.length)
  };
  universeCache = { key: cacheKey, expiresAt: Date.now() + CACHE_TTL_MS, result };
  return result;
}

function normalizeStooqIndex(row: StooqRow): MarketIndexSnapshot | null {
  const sourceSymbol = row.Symbol.toUpperCase();
  const name =
    sourceSymbol === "^SPX" ? "S&P500" :
    sourceSymbol === "^NDQ" ? "NASDAQ100" :
    sourceSymbol === "^DJI" ? "DOW" :
    null;
  if (!name) return null;

  const close = parseNumber(row.Close);
  const previous = parseNumber(row.Prev);
  if (!close) return null;
  const change = previous ? close - previous : 0;

  return {
    name,
    value: close,
    change,
    changeRate: previous ? (change / previous) * 100 : 0,
    baseDate: row.Date || "stooq",
    source: "STOOQ",
    sourceLabel: STOOQ_SOURCE_LABEL,
    isRealtime: false,
    isDelayed: true,
    updatedAt: buildUpdatedAt(row)
  };
}

export async function getStooqUsIndices(options: { forceRefresh?: boolean } = {}) {
  assertServerSide();
  if (!options.forceRefresh && indexCache && indexCache.expiresAt > Date.now()) {
    return indexCache.indices;
  }

  const rows = await fetchStooqRows(["^spx", "^ndq", "^dji"]);
  const indices = rows.map(normalizeStooqIndex).filter(Boolean) as MarketIndexSnapshot[];
  if (!indices.length) {
    throw new Error("Stooq US indices unavailable");
  }

  indexCache = { expiresAt: Date.now() + CACHE_TTL_MS, indices };
  return indices;
}
