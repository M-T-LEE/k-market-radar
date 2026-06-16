import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { alerts as fallbackAlerts, issues as fallbackIssues } from "../data/issues";
import { stocks as fallbackStocks } from "../data/stocks";
import { filterActionableAlerts } from "../lib/alertFilters";
import type { MarketDataSnapshot } from "../types/marketData";

const SNAPSHOT_STORAGE_KEY = "k-market-radar:market-data-snapshot";
const SNAPSHOT_STORAGE_TTL_MS = 2 * 60 * 1000;
const FAST_MARKET_DATA_TIMEOUT_MS = 700;
const FULL_MARKET_DATA_TIMEOUT_MS = 8 * 1000;
const INITIAL_REFRESH_DELAY_MS = 80;

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
  warnings: ["API 연결 확인 전까지 보완 데이터를 먼저 표시합니다."]
};

interface MarketDataContextValue extends MarketDataSnapshot {
  loading: boolean;
  refresh: (options?: { showLoading?: boolean }) => Promise<void>;
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

function shouldCacheSnapshot(snapshot: MarketDataSnapshot) {
  return (
    snapshot.sourceStatus.krx === "live" ||
    snapshot.sourceStatus.krx === "partial" ||
    snapshot.sourceStatus.naverUniverseProvider === "live" ||
    snapshot.sourceStatus.fmpUniverseProvider === "live" ||
    snapshot.sourceStatus.fmpUniverseProvider === "partial" ||
    snapshot.stocks.length > fallbackStocks.length
  );
}

function writeCachedSnapshot(snapshot: MarketDataSnapshot) {
  if (typeof window === "undefined" || !shouldCacheSnapshot(snapshot)) return;

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

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchSnapshot(path: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, { signal: controller.signal, cache: "default" });

    if (!response.ok) {
      throw new Error(`market-data ${response.status}`);
    }

    return sanitizeMarketDataSnapshot((await response.json()) as MarketDataSnapshot);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function waitForIdle(timeoutMs = 700) {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: timeoutMs });
      return;
    }

    globalThis.setTimeout(resolve, Math.min(timeoutMs, 700));
  });
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MarketDataSnapshot>(
    () => readCachedSnapshot() ?? sanitizeMarketDataSnapshot(fallbackSnapshot)
  );
  const [loading, setLoading] = useState(false);
  const refreshRunRef = useRef(0);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const refreshRun = refreshRunRef.current + 1;
    refreshRunRef.current = refreshRun;

    const shouldShowLoading = options?.showLoading ?? true;
    if (shouldShowLoading) {
      setLoading(true);
    }

    let fastSnapshotApplied = false;

    try {
      const fastData = await fetchSnapshot("/api/market-data?mode=fast", FAST_MARKET_DATA_TIMEOUT_MS);
      if (refreshRun !== refreshRunRef.current) return;

      fastSnapshotApplied = true;
      startTransition(() => setSnapshot(fastData));
      writeCachedSnapshot(fastData);
    } catch (error) {
      if (shouldShowLoading && refreshRun === refreshRunRef.current) {
        const message = isAbortError(error)
          ? "빠른 API 응답이 지연되어 직전 데이터를 먼저 유지합니다."
          : "빠른 API 연결 확인 필요: 현재 표시 중인 데이터를 유지합니다.";
        setSnapshot((current) => appendWarning(current, message));
      }
    } finally {
      if (shouldShowLoading && refreshRun === refreshRunRef.current) {
        setLoading(false);
      }
    }

    void waitForIdle().then(async () => {
      if (refreshRun !== refreshRunRef.current) return;

      try {
        const fullData = await fetchSnapshot("/api/market-data", FULL_MARKET_DATA_TIMEOUT_MS);
        if (refreshRun !== refreshRunRef.current) return;

        writeCachedSnapshot(fullData);
        startTransition(() => setSnapshot(fullData));
      } catch (error) {
        if (refreshRun !== refreshRunRef.current || !shouldShowLoading) return;

        const message = isAbortError(error)
          ? "전체 API 응답이 지연되어 빠른 데이터셋을 유지합니다."
          : "전체 API 연결 확인 필요: 현재 표시 중인 데이터를 유지합니다.";
        setSnapshot((current) =>
          appendWarning(
            current,
            fastSnapshotApplied ? message : "API 연결 확인 필요: 보완 데이터를 사용 중입니다."
          )
        );
      }
    });
  }, []);

  useEffect(() => {
    const timerId = globalThis.setTimeout(() => {
      void refresh({ showLoading: false });
    }, INITIAL_REFRESH_DELAY_MS);

    return () => globalThis.clearTimeout(timerId);
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
