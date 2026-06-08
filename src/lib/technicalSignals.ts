import type { Stock, StockTechnicalSignal, TechnicalSignalKind } from "../types/stock";

export type TechnicalSignalFilter =
  | "전체"
  | "기술 이벤트 있음"
  | "거래량 급증 추정"
  | "신고가 추정";

export type TechnicalSignalWindow =
  | "권장 기준"
  | "최근 5거래일"
  | "최근 10거래일"
  | "최근 20거래일"
  | "최근 60거래일";

export const technicalSignalOptions: TechnicalSignalFilter[] = [
  "전체",
  "기술 이벤트 있음",
  "거래량 급증 추정",
  "신고가 추정"
];

export const technicalWindowOptions: TechnicalSignalWindow[] = [
  "권장 기준",
  "최근 5거래일",
  "최근 10거래일",
  "최근 20거래일",
  "최근 60거래일"
];

export const recommendedTechnicalWindows: Record<TechnicalSignalKind, number> = {
  allTimeHighVolume: 10,
  fiftyTwoWeekHighVolume: 10,
  allTimeHigh: 20,
  fiftyTwoWeekHigh: 20,
  volumeSurgeEstimate: 10,
  priceHighProximity: 20
};

const filterToKind: Partial<Record<TechnicalSignalFilter, TechnicalSignalKind>> = {
  "거래량 급증 추정": "volumeSurgeEstimate",
  "신고가 추정": "priceHighProximity"
};

const exactVolumeKinds = new Set<TechnicalSignalKind>(["allTimeHighVolume", "fiftyTwoWeekHighVolume"]);
const exactPriceKinds = new Set<TechnicalSignalKind>(["allTimeHigh", "fiftyTwoWeekHigh"]);

export function technicalFilterToKind(filter: TechnicalSignalFilter) {
  return filterToKind[filter];
}

export function isExactHistoricalTechnicalFilter(_filter?: TechnicalSignalFilter) {
  return false;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function technicalWindowToDays(window: TechnicalSignalWindow, kind: TechnicalSignalKind) {
  if (window === "최근 5거래일") return 5;
  if (window === "최근 10거래일") return 10;
  if (window === "최근 20거래일") return 20;
  if (window === "최근 60거래일") return 60;
  return recommendedTechnicalWindows[kind];
}

function estimateDaysAgo(strength: number, maxDays: number) {
  if (strength >= 92) return 1;
  if (strength >= 84) return Math.min(maxDays, 3);
  if (strength >= 74) return Math.min(maxDays, 7);
  return Math.min(maxDays, Math.max(10, Math.round(maxDays * 0.75)));
}

function marketValue(stock: Stock) {
  return stock.marketCap * 100_000_000;
}

function turnoverRate(stock: Stock) {
  const tradedValue = stock.currentPrice * Math.max(stock.volume ?? 0, 0);
  return (tradedValue / Math.max(marketValue(stock), 1)) * 100;
}

function addSignal(
  signals: StockTechnicalSignal[],
  signal: Omit<StockTechnicalSignal, "source"> & { source?: StockTechnicalSignal["source"] }
) {
  const normalized = {
    ...signal,
    strength: Math.round(clamp(signal.strength)),
    daysAgo: Math.max(0, Math.round(signal.daysAgo)),
    source: signal.source ?? "DERIVED"
  };
  const existingIndex = signals.findIndex((item) => item.kind === normalized.kind && item.source === normalized.source);

  if (existingIndex >= 0) {
    if (signals[existingIndex].strength < normalized.strength) {
      signals[existingIndex] = normalized;
    }
    return;
  }

  signals.push(normalized);
}

export function getTechnicalSignals(stock: Stock): StockTechnicalSignal[] {
  if (stock.technicalSignals?.length) {
    return [...stock.technicalSignals].sort((a, b) => b.strength - a.strength);
  }

  const signals: StockTechnicalSignal[] = [];
  const priceToHigh = stock.currentPrice / Math.max(stock.fiftyTwoWeekHigh, 1);
  const dailyMove = stock.dailyChangeRate ?? stock.priceChange3M;
  const source = "DERIVED";

  const priceProximity = clamp((priceToHigh - 0.965) / 0.035, 0, 1);
  const trendScore = Math.max(stock.priceChange3M, 0) * 0.35 + Math.max(stock.priceChange6M, 0) * 0.12;
  const highBreakoutScore =
    44 + priceProximity * 38 + trendScore + Math.max(stock.ma200Gap, 0) * 0.35 + Math.max(dailyMove, 0) * 1.1;

  if (priceToHigh >= 0.975 && stock.ma200Gap >= -2 && stock.priceChange3M >= 5 && dailyMove >= -3) {
    addSignal(signals, {
      kind: "priceHighProximity",
      label: priceToHigh >= 0.993 ? "신고가 돌파권 추정" : "신고가 근접 추정",
      daysAgo: estimateDaysAgo(highBreakoutScore, recommendedTechnicalWindows.priceHighProximity),
      strength: highBreakoutScore,
      source,
      note: "현재가의 52주 고점 접근도, 3개월 추세, 200일선 괴리율, 당일 움직임을 함께 본 추정 신호입니다."
    });
  }

  const turnover = turnoverRate(stock);
  const directionalMove = Math.max(dailyMove, 0);
  const absoluteMove = Math.abs(dailyMove);
  const volumeShock =
    clamp(turnover * 18, 0, 70) + directionalMove * 5.5 + absoluteMove * 1.2 + Math.max(stock.priceChange3M, 0) * 0.18;

  if ((stock.volume ?? 0) > 0 && turnover >= 0.35 && absoluteMove >= 1.5 && volumeShock >= 52) {
    addSignal(signals, {
      kind: "volumeSurgeEstimate",
      label: volumeShock >= 76 ? "거래량 급증 강한 추정" : "거래량 급증 추정",
      daysAgo: estimateDaysAgo(volumeShock, recommendedTechnicalWindows.volumeSurgeEstimate),
      strength: volumeShock,
      source,
      note: "거래대금 회전율, 당일 변동률, 중기 추세를 결합해 거래량 이벤트 가능성을 추정합니다."
    });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

export function getTechnicalSignalStrength(stock: Stock) {
  const signals = getTechnicalSignals(stock);
  return signals.length ? Math.max(...signals.map((signal) => signal.strength)) : 0;
}

export function isTechnicalVerificationCandidate(stock: Stock, kind?: TechnicalSignalKind) {
  if (!kind) return true;

  const signals = getTechnicalSignals(stock);
  const signalKinds = new Set(signals.map((signal) => signal.kind));
  const dailyMove = Math.abs(stock.dailyChangeRate ?? stock.priceChange3M);
  const turnover = turnoverRate(stock);
  const priceToHigh = stock.currentPrice / Math.max(stock.fiftyTwoWeekHigh, 1);

  if (exactVolumeKinds.has(kind)) {
    return signalKinds.has("volumeSurgeEstimate") || turnover >= 0.5 || dailyMove >= 3 || stock.priceChange3M >= 12;
  }

  if (exactPriceKinds.has(kind)) {
    return signalKinds.has("priceHighProximity") || priceToHigh >= 0.96 || stock.priceChange3M >= 10;
  }

  return true;
}

export function matchesTechnicalSignal(
  stock: Stock,
  filter: TechnicalSignalFilter,
  window: TechnicalSignalWindow
) {
  if (filter === "전체") return true;

  const signals = getTechnicalSignals(stock);
  const matchesWindow = (signal: StockTechnicalSignal) => signal.daysAgo <= technicalWindowToDays(window, signal.kind);

  if (filter === "기술 이벤트 있음") {
    return signals.some(matchesWindow);
  }

  const kind = filterToKind[filter];
  return kind ? signals.some((signal) => signal.kind === kind && matchesWindow(signal)) : true;
}
