import { SEC_DEFAULT_ACCEPT_ENCODING, SEC_MAX_REQUESTS_PER_SECOND, SecEdgarClient } from "../lib/api/secEdgar.js";
import type { Stock } from "../types/stock.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEC_COMPANY_TICKERS_EXCHANGE_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

export type SecTickerRecord = {
  cik: string;
  ticker: string;
  name: string;
  exchange: string;
};

export type SecTickerMap = Map<string, SecTickerRecord>;

let cache: { expiresAt: number; map: SecTickerMap } | null = null;

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("secCompanyTickerProvider must be called server-side only");
  }
}

function normalizeSymbol(symbol: unknown) {
  return String(symbol ?? "").trim().toUpperCase().replace(/\./g, "-");
}

function normalizeExchange(exchange: unknown) {
  const value = String(exchange ?? "").trim().toUpperCase();
  if (value.includes("NASDAQ")) return "NASDAQ";
  if (value.includes("NYSE")) return "NYSE";
  if (value.includes("AMEX")) return "AMEX";
  if (value.includes("OTC")) return "OTC";
  return value || undefined;
}

function parseSecTickerPayload(payload: unknown): SecTickerMap {
  if (!payload || typeof payload !== "object") {
    throw new Error("SEC company ticker payload is empty");
  }

  const record = payload as { fields?: unknown; data?: unknown };
  if (!Array.isArray(record.fields) || !Array.isArray(record.data)) {
    throw new Error("SEC company ticker payload shape is invalid");
  }

  const fields = record.fields.map((field) => String(field).toLowerCase());
  const cikIndex = fields.indexOf("cik");
  const nameIndex = fields.indexOf("name");
  const tickerIndex = fields.indexOf("ticker");
  const exchangeIndex = fields.indexOf("exchange");

  if (cikIndex < 0 || nameIndex < 0 || tickerIndex < 0 || exchangeIndex < 0) {
    throw new Error("SEC company ticker payload fields are incomplete");
  }

  const map: SecTickerMap = new Map();
  record.data.forEach((row) => {
    if (!Array.isArray(row)) return;
    const ticker = normalizeSymbol(row[tickerIndex]);
    if (!ticker) return;
    map.set(ticker, {
      cik: String(row[cikIndex] ?? "").padStart(10, "0"),
      ticker,
      name: String(row[nameIndex] ?? ""),
      exchange: normalizeExchange(row[exchangeIndex]) ?? "US"
    });
  });

  if (!map.size) {
    throw new Error("SEC company ticker map is empty");
  }

  return map;
}

export async function getSecCompanyTickerMap(options: {
  userAgent?: string;
  acceptEncoding?: string;
  requestsPerSecond?: number;
  forceRefresh?: boolean;
} = {}) {
  assertServerSide();

  if (!options.userAgent) {
    throw new Error("SEC User-Agent is missing");
  }
  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.map;
  }

  const client = new SecEdgarClient({
    userAgent: options.userAgent,
    acceptEncoding: options.acceptEncoding ?? SEC_DEFAULT_ACCEPT_ENCODING,
    requestsPerSecond: Math.min(options.requestsPerSecond ?? SEC_MAX_REQUESTS_PER_SECOND, SEC_MAX_REQUESTS_PER_SECOND)
  });
  const payload = await client.getJson<unknown>(SEC_COMPANY_TICKERS_EXCHANGE_URL);
  const map = parseSecTickerPayload(payload);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, map };
  return map;
}

export function enrichUsStocksWithSecMetadata(stocks: Stock[], tickerMap: SecTickerMap) {
  return stocks.map((stock) => {
    if (!stock.market.startsWith("US")) return stock;
    const record = tickerMap.get(normalizeSymbol(stock.ticker));
    if (!record) return stock;

    return {
      ...stock,
      cik: record.cik,
      exchange: record.exchange || stock.exchange,
      name: stock.name || record.name
    };
  });
}
