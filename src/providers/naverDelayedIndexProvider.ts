import type { MarketIndexSnapshot } from "../types/marketData.js";
import { parseNumber } from "./providerUtils.js";

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { expiresAt: number; index: MarketIndexSnapshot }>();

type NaverIndexRaw = Record<string, any>;
type DomesticIndexName = Extract<MarketIndexSnapshot["name"], "KOSPI" | "KOSDAQ">;

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("naverDelayedIndexProvider must be called server-side only");
  }
}

export function normalizeNaverIndex(rawData: NaverIndexRaw): MarketIndexSnapshot {
  const name = rawData.itemCode === "KOSDAQ" ? "KOSDAQ" : "KOSPI";
  const now = new Date().toISOString();

  return {
    name,
    value: parseNumber(rawData.closePrice),
    change: parseNumber(rawData.compareToPreviousClosePrice),
    changeRate: parseNumber(rawData.fluctuationsRatio),
    baseDate: rawData.localTradedAt ?? now,
    source: "NAVER_DELAYED",
    sourceLabel: "네이버페이증권 지연지수",
    isRealtime: false,
    isDelayed: true,
    updatedAt: rawData.localTradedAt ?? now
  };
}

export function isNaverIndexAvailable() {
  return typeof fetch === "function";
}

async function fetchNaverRawIndex(name: DomesticIndexName) {
  assertServerSide();

  const response = await fetch(`https://m.stock.naver.com/api/index/${name}/basic`, {
    headers: {
      "User-Agent": "K-Market Radar delayed index provider"
    }
  });

  if (!response.ok) {
    throw new Error(`Naver delayed index ${name} ${response.status}`);
  }

  return (await response.json()) as NaverIndexRaw;
}

export async function getNaverDelayedIndex(name: DomesticIndexName) {
  const cached = cache.get(name);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.index;
  }

  const index = normalizeNaverIndex(await fetchNaverRawIndex(name));
  cache.set(name, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    index
  });

  return index;
}

export async function getNaverDelayedIndices(names: DomesticIndexName[] = ["KOSPI", "KOSDAQ"]) {
  const settled = await Promise.allSettled(names.map((name) => getNaverDelayedIndex(name)));
  const indices = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  if (!indices.length) {
    throw new Error("Naver delayed indices unavailable");
  }

  return indices;
}
