import { getKrxDailyQuote } from "../providers/krxDailyProvider.js";
import { getReferenceQuote } from "../providers/referenceQuoteProvider.js";
import {
  getNaverDelayedQuote,
  getNaverDelayedQuotes,
  getQuoteWithFallback
} from "../providers/naverDelayedQuoteProvider.js";
import type { Quote } from "../types/marketData.js";
import type { Stock } from "../types/stock.js";

export type MarketDataRoute =
  | "DOMESTIC_QUOTE"
  | "DOMESTIC_DAILY"
  | "DOMESTIC_DISCLOSURE"
  | "US_DATA";

export const marketDataRoutes: Record<MarketDataRoute, string[]> = {
  DOMESTIC_QUOTE: ["naverDelayedQuoteProvider", "krxDailyProvider", "referenceQuoteProvider"],
  DOMESTIC_DAILY: ["krxDailyProvider"],
  DOMESTIC_DISCLOSURE: ["dartDisclosureProvider"],
  US_DATA: ["fmpProvider", "secEdgarProvider"]
};

export function isDomesticStock(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

export async function getDomesticQuote(symbol: string, stock?: Stock) {
  try {
    return await getNaverDelayedQuote(symbol);
  } catch {
    try {
      return await getKrxDailyQuote(symbol, stock);
    } catch {
      return getReferenceQuote(symbol, stock);
    }
  }
}

export async function getDomesticQuotes(stocks: Stock[]) {
  const domesticStocks = stocks.filter(isDomesticStock);
  const naverQuotes = new Map<string, Quote>();
  const settled = await Promise.allSettled(
    domesticStocks.map(async (stock) => ({
      stock,
      quote: await getNaverDelayedQuote(stock.ticker)
    }))
  );

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      naverQuotes.set(result.value.stock.ticker, result.value.quote);
    }
  });

  const fallbackResults = await Promise.allSettled(
    domesticStocks
      .filter((stock) => !naverQuotes.has(stock.ticker))
      .map(async (stock) => ({
        stock,
        quote: await getDomesticQuote(stock.ticker, stock)
      }))
  );

  const quotes = new Map<string, Quote>();
  domesticStocks.forEach((stock) => {
    const quote = naverQuotes.get(stock.ticker);
    if (quote) quotes.set(stock.id, quote);
  });

  fallbackResults.forEach((result) => {
    if (result.status === "fulfilled") {
      quotes.set(result.value.stock.id, result.value.quote);
    }
  });

  return quotes;
}

export { getNaverDelayedQuote, getNaverDelayedQuotes, getQuoteWithFallback };
