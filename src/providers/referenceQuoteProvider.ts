import type { Quote } from "../types/marketData.js";
import type { Stock } from "../types/stock.js";

export function getReferenceQuote(symbol: string, stock?: Stock): Quote {
  return {
    symbol,
    name: stock?.name ?? symbol,
    market: stock?.market === "KOSPI" || stock?.market === "KOSDAQ" ? stock.market : "UNKNOWN",
    price: stock?.currentPrice ?? 0,
    change: 0,
    changeRate: stock?.priceChange3M ?? 0,
    volume: stock?.volume ?? 0,
    marketCap: stock?.marketCap,
    source: "REFERENCE",
    sourceLabel: "참고 시세",
    isRealtime: false,
    isDelayed: true,
    updatedAt: new Date().toISOString()
  };
}
