import type { Stock } from "../../src/types/stock.js";
import type { DomesticQuote } from "./types.js";
import { fetchJson, numeric, parseKoreanNumber, toKoreanMarketCap } from "./utils.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_SYMBOL_INTERVAL_MS = 12 * 1000;

const quoteCache = new Map<string, { expiresAt: number; fetchedAt: number; quote: DomesticQuote }>();

function getTotalInfoValue(items: Array<Record<string, string>> | undefined, patterns: string[]) {
  return items?.find((item) =>
    patterns.some((pattern) => item.key?.includes(pattern) || item.code?.includes(pattern))
  )?.value;
}

async function fetchIntegration(ticker: string) {
  return fetchJson<{
    totalInfos?: Array<Record<string, string>>;
  }>(`https://m.stock.naver.com/api/stock/${ticker}/integration`, {
    headers: {
      "User-Agent": "Market Cycle Radar research dashboard"
    }
  });
}

async function fetchBasic(ticker: string) {
  return fetchJson<Record<string, any>>(`https://m.stock.naver.com/api/stock/${ticker}/basic`, {
    headers: {
      "User-Agent": "Market Cycle Radar research dashboard"
    }
  });
}

export const naverDelayedQuoteProvider = {
  id: "naverDelayedQuoteProvider" as const,
  label: "네이버페이증권 지연시세",

  getCachedQuote(ticker: string) {
    const cached = quoteCache.get(ticker);
    if (!cached) return null;
    return cached.expiresAt > Date.now() ? cached.quote : null;
  },

  async getDomesticQuote(stock: Stock): Promise<DomesticQuote> {
    const cached = quoteCache.get(stock.ticker);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.quote;
    }

    if (cached && Date.now() - cached.fetchedAt < MIN_SYMBOL_INTERVAL_MS) {
      return cached.quote;
    }

    const [basic, integration] = await Promise.all([
      fetchBasic(stock.ticker),
      fetchIntegration(stock.ticker).catch(() => ({ totalInfos: [] }))
    ]);

    const totalInfos = integration.totalInfos;
    const volumeValue = getTotalInfoValue(totalInfos, ["거래량", "accumulatedTradingVolume"]);
    const marketCapValue = getTotalInfoValue(totalInfos, ["시가총액", "marketValue", "marketSum"]);
    const now = new Date().toISOString();
    const quote: DomesticQuote = {
      ticker: stock.ticker,
      currentPrice: numeric(basic.closePrice),
      change: numeric(basic.compareToPreviousClosePrice),
      changeRate: numeric(basic.fluctuationsRatio),
      volume: parseKoreanNumber(volumeValue),
      marketCap: marketCapValue ? toKoreanMarketCap(parseKoreanNumber(marketCapValue)) : undefined,
      asOf: basic.localTradedAt ?? now,
      updatedAt: now,
      provider: "naverDelayedQuoteProvider",
      label: "네이버페이증권 지연시세",
      isRealtime: false,
      note:
        "공식 Open API가 아닌 참고용 지연시세 Provider입니다. 자동매매, 고빈도 매매, 체결 판단에는 사용하지 않습니다."
    };

    quoteCache.set(stock.ticker, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      fetchedAt: Date.now(),
      quote
    });

    return quote;
  }
};
