import { createStockFromUniverseQuote, type UniverseAssetType } from "../lib/stockUniverseFactory";
import type { Stock } from "../types/stock";
import { parseNumber, toKoreanMarketCapUnit } from "./providerUtils";

const CACHE_TTL_MS = 15 * 60 * 1000;
const PAGE_SIZE = 20;
const DEFAULT_MIN_MARKET_CAP_KRW = 100_000_000_000;
const DEFAULT_MAX_PAGES_PER_MARKET = 90;

type DomesticMarket = "KOSPI" | "KOSDAQ";

type NaverMarketValueRow = {
  itemCode?: string;
  stockName?: string;
  closePriceRaw?: string | number;
  compareToPreviousClosePriceRaw?: string | number;
  fluctuationsRatio?: string | number;
  accumulatedTradingVolumeRaw?: string | number;
  marketValueRaw?: string | number;
  localTradedAt?: string;
  stockEndType?: string;
  stockType?: string;
  tradeStopType?: { name?: string };
};

type NaverMarketValueResponse = {
  totalCount?: number;
  stocks?: NaverMarketValueRow[];
};

let cache: { expiresAt: number; stocks: Stock[] } | null = null;

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("naverUniverseProvider must be called server-side only");
  }
}

function headersForMarket(market: DomesticMarket) {
  return {
    "User-Agent": "Mozilla/5.0 K-Market Radar delayed universe provider",
    Accept: "application/json, text/plain, */*",
    Referer: `https://m.stock.naver.com/domestic/marketValue/${market}`
  };
}

function isAllowedAsset(row: NaverMarketValueRow) {
  const endType = String(row.stockEndType ?? "").toLowerCase();
  return endType === "stock" || endType === "etf";
}

function isPreferred(name: string) {
  return /우$|우B$|우C$|우선/.test(name);
}

function getAssetType(row: NaverMarketValueRow): UniverseAssetType {
  if (String(row.stockEndType ?? "").toLowerCase() === "etf") return "ETF";
  if (isPreferred(row.stockName ?? "")) return "PREFERRED";
  return "COMMON";
}

function isTradable(row: NaverMarketValueRow) {
  return (row.tradeStopType?.name ?? "TRADING") === "TRADING";
}

function isExcludedName(name: string) {
  return /스팩|SPAC|ETN|ELW|선물|인버스|곱버스/i.test(name);
}

async function fetchMarketPage(market: DomesticMarket, page: number) {
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=${PAGE_SIZE}`;
  const response = await fetch(url, { headers: headersForMarket(market) });

  if (!response.ok) {
    throw new Error(`Naver market value ${market} page ${page}: ${response.status}`);
  }

  return (await response.json()) as NaverMarketValueResponse;
}

async function fetchDomesticMarket(market: DomesticMarket, minMarketCapKrw: number, maxPages: number) {
  const stocks: Stock[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await fetchMarketPage(market, page);
    const rows = data.stocks ?? [];

    if (!rows.length) break;

    const qualifyingRows = rows.filter((row) => {
      const name = row.stockName ?? "";
      const marketCap = parseNumber(row.marketValueRaw);
      return (
        row.itemCode &&
        name &&
        isAllowedAsset(row) &&
        isTradable(row) &&
        !isExcludedName(name) &&
        marketCap >= minMarketCapKrw
      );
    });

    qualifyingRows.forEach((row) => {
      stocks.push(
        createStockFromUniverseQuote({
          name: row.stockName!,
          ticker: row.itemCode!,
          market,
          price: parseNumber(row.closePriceRaw),
          change: parseNumber(row.compareToPreviousClosePriceRaw),
          changeRate: parseNumber(row.fluctuationsRatio),
          volume: parseNumber(row.accumulatedTradingVolumeRaw),
          marketCap: toKoreanMarketCapUnit(parseNumber(row.marketValueRaw)),
          source: "NAVER_DELAYED",
          sourceLabel: "네이버페이증권 지연시세",
          updatedAt: row.localTradedAt,
          assetType: getAssetType(row)
        })
      );
    });

    const lastMarketCap = parseNumber(rows[rows.length - 1]?.marketValueRaw);
    if (lastMarketCap < minMarketCapKrw || rows.length < PAGE_SIZE) break;
  }

  return stocks;
}

export async function getNaverDomesticUniverse(options: {
  markets?: DomesticMarket[];
  minMarketCapKrw?: number;
  maxPagesPerMarket?: number;
  forceRefresh?: boolean;
} = {}) {
  assertServerSide();

  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.stocks;
  }

  const markets = options.markets ?? ["KOSPI", "KOSDAQ"];
  const minMarketCapKrw = options.minMarketCapKrw ?? DEFAULT_MIN_MARKET_CAP_KRW;
  const maxPages = options.maxPagesPerMarket ?? DEFAULT_MAX_PAGES_PER_MARKET;
  const settled = await Promise.allSettled(
    markets.map((market) => fetchDomesticMarket(market, minMarketCapKrw, maxPages))
  );
  const stocks = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (!stocks.length) {
    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
    throw new Error(errors.join(" / ") || "Naver domestic universe is empty");
  }

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    stocks
  };

  return stocks;
}
