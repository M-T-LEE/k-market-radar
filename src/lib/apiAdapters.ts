import type { MarketDataSnapshot } from "../types/marketData";
import type { Issue } from "../types/portfolio";
import type { Stock } from "../types/stock";

export interface MarketDataAdapter {
  getSnapshot(): Promise<MarketDataSnapshot>;
  getStocks(): Promise<Stock[]>;
  getIssues(stockId?: string): Promise<Issue[]>;
}

export class LiveMarketDataAdapter implements MarketDataAdapter {
  async getSnapshot() {
    const response = await fetch("/api/market-data");
    if (!response.ok) {
      throw new Error(`market-data ${response.status}`);
    }

    return (await response.json()) as MarketDataSnapshot;
  }

  async getStocks() {
    return (await this.getSnapshot()).stocks;
  }

  async getIssues(stockId?: string) {
    const issues = (await this.getSnapshot()).issues;
    return stockId ? issues.filter((issue) => issue.stockId === stockId) : issues;
  }
}

export const marketDataAdapter: MarketDataAdapter = new LiveMarketDataAdapter();
