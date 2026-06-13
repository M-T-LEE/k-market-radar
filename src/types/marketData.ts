import type { Alert, Issue } from "./portfolio.js";
import type { Stock } from "./stock.js";

export type DataSourceState = "live" | "partial" | "fallback" | "error" | "disabled";

export type Quote = {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "UNKNOWN";
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  marketCap?: number;
  source: "NAVER_DELAYED" | "KRX_DAILY" | "REFERENCE" | "FMP" | "STOOQ";
  sourceLabel: string;
  isRealtime: boolean;
  isDelayed: boolean;
  updatedAt: string;
};

export interface MarketIndexSnapshot {
  name: "KOSPI" | "KOSDAQ" | "S&P500" | "NASDAQ100" | "DOW";
  value: number;
  change: number;
  changeRate: number;
  baseDate: string;
  source: "NAVER_DELAYED" | "KRX" | "REFERENCE" | "STOOQ";
  sourceLabel: string;
  isRealtime: boolean;
  isDelayed: boolean;
  updatedAt: string;
}

export interface MarketDataSourceStatus {
  naverDelayedIndexProvider: DataSourceState;
  naverDelayedQuoteProvider: DataSourceState;
  naverUniverseProvider: DataSourceState;
  krxDailyProvider: DataSourceState;
  dartDisclosureProvider: DataSourceState;
  brokerRealtimeProvider: DataSourceState;
  referenceQuoteProvider: DataSourceState;
  fmpUniverseProvider: DataSourceState;
  fmp: DataSourceState;
  stooqQuoteProvider: DataSourceState;
  stooqIndexProvider: DataSourceState;
  krx: DataSourceState;
  openDart: DataSourceState;
  naverSearch: DataSourceState;
  newsApi: DataSourceState;
  sec: DataSourceState;
}

export interface MarketDataSnapshot {
  generatedAt: string;
  indices: MarketIndexSnapshot[];
  stocks: Stock[];
  issues: Issue[];
  alerts: Alert[];
  sourceStatus: MarketDataSourceStatus;
  warnings: string[];
}
