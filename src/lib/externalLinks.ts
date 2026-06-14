import type { Stock } from "../types/stock";

export function isKoreanStock(stock: Pick<Stock, "market">) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

export function getStockExternalUrl(stock: Pick<Stock, "market" | "ticker">) {
  const ticker = stock.ticker.trim();

  if (isKoreanStock(stock)) {
    return `https://finance.naver.com/item/main.naver?code=${encodeURIComponent(ticker)}`;
  }

  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

export function getStockExternalLabel(stock: Pick<Stock, "market">) {
  return isKoreanStock(stock) ? "네이버증권" : "Yahoo Finance";
}

export function getScreenerUrl(filters: {
  market?: string;
  theme?: string;
  scenario?: string;
  query?: string;
  valuation?: string;
  decision?: string;
  assetType?: string;
  capture?: string;
  favorite?: string;
  stock?: string;
  technical?: string;
  technicalWindow?: string;
}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `/screener?${queryString}` : "/screener";
}

export function getValueChainUrl(filters: {
  scenario?: string;
  query?: string;
  chain?: string;
  company?: string;
}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `/value-chain?${queryString}` : "/value-chain";
}
