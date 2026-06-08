import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { alerts as fallbackAlerts, issues as fallbackIssues } from "../data/issues";
import { stocks as fallbackStocks } from "../data/stocks";
import { filterActionableAlerts } from "../lib/alertFilters";
import type { MarketDataSnapshot } from "../types/marketData";

const fallbackSnapshot: MarketDataSnapshot = {
  generatedAt: new Date().toISOString(),
  indices: [
    {
      name: "KOSPI",
      value: 0,
      change: 0,
      changeRate: 0,
      baseDate: "fallback",
      source: "REFERENCE",
      sourceLabel: "참고 지수",
      isRealtime: false,
      isDelayed: true,
      updatedAt: new Date().toISOString()
    },
    {
      name: "KOSDAQ",
      value: 0,
      change: 0,
      changeRate: 0,
      baseDate: "fallback",
      source: "REFERENCE",
      sourceLabel: "참고 지수",
      isRealtime: false,
      isDelayed: true,
      updatedAt: new Date().toISOString()
    }
  ],
  stocks: fallbackStocks,
  issues: fallbackIssues,
  alerts: fallbackAlerts,
  sourceStatus: {
    naverDelayedIndexProvider: "fallback",
    naverDelayedQuoteProvider: "fallback",
    naverUniverseProvider: "fallback",
    krxDailyProvider: "fallback",
    dartDisclosureProvider: "fallback",
    brokerRealtimeProvider: "disabled",
    referenceQuoteProvider: "fallback",
    fmpUniverseProvider: "fallback",
    fmp: "fallback",
    stooqQuoteProvider: "fallback",
    stooqIndexProvider: "fallback",
    krx: "fallback",
    openDart: "fallback",
    naverSearch: "fallback",
    newsApi: "fallback",
    sec: "disabled"
  },
  warnings: ["API 서버에 연결되지 않아 기본 데이터를 표시합니다."]
};

interface MarketDataContextValue extends MarketDataSnapshot {
  loading: boolean;
  refresh: () => Promise<void>;
}

function sanitizeMarketDataSnapshot(snapshot: MarketDataSnapshot): MarketDataSnapshot {
  return {
    ...snapshot,
    alerts: filterActionableAlerts(snapshot.alerts, snapshot.stocks)
  };
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MarketDataSnapshot>(() => sanitizeMarketDataSnapshot(fallbackSnapshot));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market-data");
      if (!response.ok) {
        throw new Error(`market-data ${response.status}`);
      }

      const data = (await response.json()) as MarketDataSnapshot;
      setSnapshot(sanitizeMarketDataSnapshot(data));
    } catch {
      const sanitizedFallback = sanitizeMarketDataSnapshot(fallbackSnapshot);
      setSnapshot((current) => ({
        ...sanitizedFallback,
        generatedAt: current.generatedAt,
        warnings: ["API 서버 응답을 받지 못해 기본 데이터를 표시합니다."]
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...snapshot,
      loading,
      refresh
    }),
    [loading, refresh, snapshot]
  );

  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>;
}

export function useMarketData() {
  const context = useContext(MarketDataContext);

  if (!context) {
    throw new Error("useMarketData must be used within MarketDataProvider");
  }

  return context;
}
