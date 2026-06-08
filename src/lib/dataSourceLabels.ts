import type { DataSourceState } from "../types/marketData";

export const providerLabels: Record<string, string> = {
  naverDelayedIndexProvider: "네이버페이증권 지연지수",
  naverDelayedQuoteProvider: "네이버페이증권 지연시세",
  naverUniverseProvider: "네이버페이증권 종목 universe",
  krxDailyProvider: "KRX 일별 시세",
  dartDisclosureProvider: "OpenDART 공시",
  brokerRealtimeProvider: "브로커 실시간 후보",
  referenceQuoteProvider: "참고 시세",
  fmpUniverseProvider: "FMP 미국 핵심 상장사 universe",
  fmp: "FMP",
  stooqQuoteProvider: "Stooq 미국 지연시세",
  stooqIndexProvider: "Stooq 미국 지수",
  krx: "KRX",
  openDart: "OpenDART",
  naverSearch: "Naver Search",
  newsApi: "NewsAPI",
  sec: "SEC EDGAR"
};

export const sourceStateLabels: Record<DataSourceState, string> = {
  live: "연결",
  partial: "부분 연결",
  fallback: "보완",
  error: "오류",
  disabled: "비활성"
};

export function getSourceStateLabel(status: string) {
  return sourceStateLabels[status as DataSourceState] ?? status;
}

export function formatQuoteTime(value?: string) {
  if (!value) return "업데이트 시각 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
