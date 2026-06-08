import type { MarketIndexSnapshot } from "../../src/types/marketData";
import type { Alert } from "../../src/types/portfolio";
import type { Stock } from "../../src/types/stock";

export type Env = Record<string, string | undefined>;
export type KrxRow = Record<string, string>;

export interface DomesticQuote {
  ticker: string;
  currentPrice: number;
  change?: number;
  changeRate?: number;
  volume?: number;
  marketCap?: number;
  asOf: string;
  updatedAt: string;
  provider: NonNullable<Stock["quoteProvider"]>;
  label: string;
  isRealtime: false;
  note: string;
}

export interface KrxDailyData {
  indices: MarketIndexSnapshot[];
  stockRows: Map<string, KrxRow>;
  quotes: Map<string, DomesticQuote>;
}

export interface DisclosureProviderResult {
  alerts: Alert[];
  status: "live" | "fallback" | "error" | "disabled";
}
