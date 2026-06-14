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

const SNAPSHOT_STORAGE_KEY = "k-market-radar:market-data-snapshot";
const SNAPSHOT_STORAGE_TTL_MS = 15 * 60 * 1000;
const MARKET_DATA_FETCH_TIMEOUT_MS = 8 * 1000;

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
      sourceLabel: "보완 데이터",
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
      sourceLabel: "보완 데이터",
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
  warnings: ["API 연결 대기 중입니다. 보완 데이터를 먼저 표시합니다."]
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

function readCachedSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { savedAt?: number; snapshot?: MarketDataSnapshot };
    if (!parsed.savedAt || !parsed.snapshot) return null;
    if (Date.now() - parsed.savedAt > SNAPSHOT_STORAGE_TTL_MS) return null;

    return sanitizeMarketDataSnapshot(parsed.snapshot);
  } catch {
    return null;
  }
}

function writeCachedSnapshot(snapshot: MarketDataSnapshot) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        snapshot
      })
    );
  } catch {
    // localStorage may be disabled in some embedded browsers.
  }
}

function appendWarning(snapshot: MarketDataSnapshot, message: string): MarketDataSnapshot {
  return {
    ...snapshot,
    warnings: Array.from(new Set([message, ...snapshot.warnings])).slice(0, 8)
  };
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MarketDataSnapshot>(
    () => readCachedSnapshot() ?? sanitizeMarketDataSnapshot(fallbackSnapshot)
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const shouldShowLoading = options?.showLoading ?? true;
    if (shouldShowLoading) {
      setLoading(true);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MARKET_DATA_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch("/api/market-data", { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`market-data ${response.status}`);
      }

      const data = sanitizeMarketDataSnapshot((await response.json()) as MarketDataSnapshot);
      writeCachedSnapshot(data);
      setSnapshot(data);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "API 응답이 지연되어 직전 데이터를 먼저 표시합니다."
          : "API 연결 확인 필요: 보완 데이터를 유지합니다.";
      setSnapshot((current) => appendWarning(current, message));
    } finally {
      window.clearTimeout(timeoutId);
      if (shouldShowLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh({ showLoading: false });
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
