import type { StockTechnicalSignal, TechnicalSignalKind } from "../types/stock.js";

type DailyCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type HistoricalCacheEntry = {
  expiresAt: number;
  candles: DailyCandle[];
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BATCH_CONCURRENCY = 8;
const HISTORY_START = "19900101";
const TRADING_DAYS_IN_YEAR = 252;
const cache = new Map<string, HistoricalCacheEntry>();

const exactKindLabels: Record<Extract<TechnicalSignalKind, "allTimeHighVolume" | "allTimeHigh" | "fiftyTwoWeekHighVolume" | "fiftyTwoWeekHigh">, string> = {
  allTimeHighVolume: "역대 최고 거래량",
  allTimeHigh: "역대 신고가",
  fiftyTwoWeekHighVolume: "52주 최고 거래량",
  fiftyTwoWeekHigh: "52주 신고가"
};

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("naverHistoricalPriceProvider must be called server-side only");
  }
}

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function parseNaverSiseJson(text: string): DailyCandle[] {
  const candles: DailyCandle[] = [];
  const rowPattern =
    /\["(\d{8})",\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),/g;

  for (const match of text.matchAll(rowPattern)) {
    candles.push({
      date: match[1],
      open: Number(match[2]),
      high: Number(match[3]),
      low: Number(match[4]),
      close: Number(match[5]),
      volume: Number(match[6])
    });
  }

  return candles.filter((candle) => candle.date && Number.isFinite(candle.high) && Number.isFinite(candle.volume));
}

function formatDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0
  }).format(value);
}

function buildSignal(
  kind: Extract<TechnicalSignalKind, "allTimeHighVolume" | "allTimeHigh" | "fiftyTwoWeekHighVolume" | "fiftyTwoWeekHigh">,
  candle: DailyCandle,
  daysAgo: number,
  benchmark: number
): StockTechnicalSignal {
  const isVolumeSignal = kind.includes("Volume");
  const eventValue = isVolumeSignal ? candle.volume : candle.high;
  const ratio = benchmark > 0 ? eventValue / benchmark : 1;

  return {
    kind,
    label: exactKindLabels[kind],
    daysAgo,
    strength: Math.min(100, Math.max(75, Math.round(84 + Math.max(0, ratio - 1) * 28 + (daysAgo <= 2 ? 5 : 0)))),
    source: "HISTORICAL",
    note: `네이버페이증권 일별 차트 기준 ${formatDate(candle.date)}에 ${
      isVolumeSignal ? `거래량 ${compactNumber(candle.volume)}주` : `고가 ${compactNumber(candle.high)}원`
    }로 이전 기준을 경신했습니다.`
  };
}

function findRecentBreakoutRecord(
  candles: DailyCandle[],
  windowDays: number,
  selector: (candle: DailyCandle) => number,
  lookbackDays?: number
) {
  const recentStart = Math.max(0, candles.length - windowDays);

  for (let index = candles.length - 1; index >= recentStart; index -= 1) {
    const currentValue = selector(candles[index]);
    if (currentValue <= 0) continue;

    const priorStart = lookbackDays ? Math.max(0, index - lookbackDays) : 0;
    const priorCandles = candles.slice(priorStart, index);
    const priorMax = priorCandles.length ? Math.max(...priorCandles.map(selector).filter((value) => value > 0)) : 0;

    if (currentValue > priorMax) {
      return {
        candle: candles[index],
        daysAgo: candles.length - index,
        benchmark: Math.max(currentValue, priorMax)
      };
    }
  }

  return null;
}

export async function getNaverDailyCandles(symbol: string) {
  assertServerSide();

  const normalizedSymbol = symbol.trim();
  const cached = cache.get(normalizedSymbol);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.candles;
  }

  const params = new URLSearchParams({
    symbol: normalizedSymbol,
    requestType: "1",
    startTime: HISTORY_START,
    endTime: todayYmd(),
    timeframe: "day"
  });
  const url = `https://api.finance.naver.com/siseJson.naver?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 K-Market Radar historical technical provider",
      Accept: "text/plain, */*",
      Referer: `https://finance.naver.com/item/sise_day.naver?code=${encodeURIComponent(normalizedSymbol)}`
    }
  });

  if (!response.ok) {
    throw new Error(`Naver daily chart ${normalizedSymbol}: ${response.status}`);
  }

  const candles = parseNaverSiseJson(await response.text());
  if (!candles.length) {
    throw new Error(`Naver daily chart is empty: ${normalizedSymbol}`);
  }

  cache.set(normalizedSymbol, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    candles
  });

  return candles;
}

export function calculateHistoricalTechnicalSignals(candles: DailyCandle[], windowDays: number) {
  if (!candles.length) return [];

  const signals: StockTechnicalSignal[] = [];
  const allTimeVolumeRecord = findRecentBreakoutRecord(candles, windowDays, (candle) => candle.volume);
  if (allTimeVolumeRecord) {
    signals.push(buildSignal("allTimeHighVolume", allTimeVolumeRecord.candle, allTimeVolumeRecord.daysAgo, allTimeVolumeRecord.benchmark));
  }

  const allTimeHighRecord = findRecentBreakoutRecord(candles, windowDays, (candle) => candle.high);
  if (allTimeHighRecord) {
    signals.push(buildSignal("allTimeHigh", allTimeHighRecord.candle, allTimeHighRecord.daysAgo, allTimeHighRecord.benchmark));
  }

  const yearlyVolumeRecord = findRecentBreakoutRecord(candles, windowDays, (candle) => candle.volume, TRADING_DAYS_IN_YEAR);
  if (yearlyVolumeRecord) {
    signals.push(buildSignal("fiftyTwoWeekHighVolume", yearlyVolumeRecord.candle, yearlyVolumeRecord.daysAgo, yearlyVolumeRecord.benchmark));
  }

  const yearlyHighRecord = findRecentBreakoutRecord(candles, windowDays, (candle) => candle.high, TRADING_DAYS_IN_YEAR);
  if (yearlyHighRecord) {
    signals.push(buildSignal("fiftyTwoWeekHigh", yearlyHighRecord.candle, yearlyHighRecord.daysAgo, yearlyHighRecord.benchmark));
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

export async function getNaverHistoricalTechnicalSignals(symbol: string, windowDays: number) {
  const candles = await getNaverDailyCandles(symbol);
  return calculateHistoricalTechnicalSignals(candles, windowDays);
}

export async function getNaverHistoricalTechnicalSignalsBatch(symbols: string[], options: {
  windowDays: number;
  kind?: TechnicalSignalKind;
}) {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean)));
  const matches: Array<{ symbol: string; signals: StockTechnicalSignal[] }> = [];
  const errors: string[] = [];

  for (let index = 0; index < uniqueSymbols.length; index += BATCH_CONCURRENCY) {
    const chunk = uniqueSymbols.slice(index, index + BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(async (symbol) => {
        const signals = await getNaverHistoricalTechnicalSignals(symbol, options.windowDays);
        return {
          symbol,
          signals: options.kind ? signals.filter((signal) => signal.kind === options.kind) : signals
        };
      })
    );

    settled.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.signals.length) {
          matches.push(result.value);
        }
      } else if (errors.length < 8) {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    });
  }

  return {
    sourceLabel: "네이버페이증권 일별 차트 참고 데이터",
    windowDays: options.windowDays,
    checkedCount: uniqueSymbols.length,
    matchedCount: matches.length,
    errorCount: errors.length,
    matches,
    errors
  };
}
