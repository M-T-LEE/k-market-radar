import type { Quote } from "../types/marketData";
import { parseKoreanAmount, parseNumber, toKoreanMarketCapUnit } from "./providerUtils";
import { getKrxDailyQuote } from "./krxDailyProvider";
import { getReferenceQuote } from "./referenceQuoteProvider";

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { expiresAt: number; quote: Quote }>();

type NaverBasicQuote = Record<string, any>;
type NaverIntegrationQuote = {
  totalInfos?: Array<Record<string, string>>;
};

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("naverDelayedQuoteProvider must be called server-side only");
  }
}

function getInfoValue(rawData: NaverIntegrationQuote | undefined, patterns: string[]) {
  return rawData?.totalInfos?.find((item) =>
    patterns.some((pattern) => item.key?.includes(pattern) || item.code?.includes(pattern))
  )?.value;
}

function mapMarket(rawData: NaverBasicQuote): Quote["market"] {
  const value = rawData.stockExchangeName ?? rawData.stockExchangeType?.name ?? rawData.stockExchangeType?.nameEng;
  if (value === "KOSPI") return "KOSPI";
  if (value === "KOSDAQ") return "KOSDAQ";
  if (value === "NASDAQ") return "NASDAQ";
  if (value === "NYSE") return "NYSE";
  return "UNKNOWN";
}

async function fetchNaverRawQuote(symbol: string) {
  assertServerSide();

  const headers = {
    "User-Agent": "K-Market Radar delayed quote provider"
  };
  const [basicResponse, integrationResponse, priceResponse] = await Promise.all([
    fetch(`https://m.stock.naver.com/api/stock/${encodeURIComponent(symbol)}/basic`, { headers }),
    fetch(`https://m.stock.naver.com/api/stock/${encodeURIComponent(symbol)}/integration`, { headers }),
    fetch(`https://m.stock.naver.com/api/stock/${encodeURIComponent(symbol)}/price?pageSize=1&page=1`, { headers })
  ]);

  if (!basicResponse.ok) {
    throw new Error(`Naver delayed quote ${basicResponse.status}`);
  }

  const basic = (await basicResponse.json()) as NaverBasicQuote;
  const integration = integrationResponse.ok
    ? ((await integrationResponse.json()) as NaverIntegrationQuote)
    : undefined;
  const priceRows = priceResponse.ok ? ((await priceResponse.json()) as Array<Record<string, any>>) : [];

  return { basic, integration, latestPrice: priceRows[0] };
}

export function normalizeNaverQuote(rawData: {
  basic: NaverBasicQuote;
  integration?: NaverIntegrationQuote;
  latestPrice?: Record<string, any>;
}): Quote {
  const marketCapText = getInfoValue(rawData.integration, ["시가총액", "marketValue", "marketSum"]);
  const volumeText = getInfoValue(rawData.integration, ["거래량", "accumulatedTradingVolume"]);
  const volume = parseKoreanAmount(volumeText) || parseNumber(rawData.latestPrice?.accumulatedTradingVolume);

  return {
    symbol: rawData.basic.itemCode ?? rawData.basic.reutersCode ?? "UNKNOWN",
    name: rawData.basic.stockName ?? rawData.basic.itemName ?? "UNKNOWN",
    market: mapMarket(rawData.basic),
    price: parseNumber(rawData.basic.closePrice),
    change: parseNumber(rawData.basic.compareToPreviousClosePrice),
    changeRate: parseNumber(rawData.basic.fluctuationsRatio),
    volume,
    marketCap: marketCapText ? toKoreanMarketCapUnit(parseKoreanAmount(marketCapText)) : undefined,
    source: "NAVER_DELAYED",
    sourceLabel: "네이버페이증권 지연시세",
    isRealtime: false,
    isDelayed: true,
    updatedAt: rawData.basic.localTradedAt ?? new Date().toISOString()
  };
}

export function isNaverQuoteAvailable() {
  return typeof fetch === "function";
}

export async function getNaverDelayedQuote(symbol: string) {
  const cached = cache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const quote = normalizeNaverQuote(await fetchNaverRawQuote(symbol));
  cache.set(symbol, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    quote
  });

  return quote;
}

export async function getNaverDelayedQuotes(symbols: string[]) {
  const settled = await Promise.allSettled(symbols.map((symbol) => getNaverDelayedQuote(symbol)));
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function getQuoteWithFallback(symbol: string) {
  try {
    return await getNaverDelayedQuote(symbol);
  } catch {
    try {
      return await getKrxDailyQuote(symbol);
    } catch {
      return getReferenceQuote(symbol);
    }
  }
}
