import type { Stock } from "../types/stock";

export const dashboardMarkets = ["KOSPI", "KOSDAQ"] as const;

export type DashboardMarket = (typeof dashboardMarkets)[number];

export const dashboardListModes = ["turnover", "gainers", "foreign", "institution"] as const;

export type DashboardListMode = (typeof dashboardListModes)[number];

export const dashboardListModeLabels: Record<DashboardListMode, string> = {
  turnover: "거래대금",
  gainers: "상승률",
  foreign: "외국인 순매수",
  institution: "기관 순매수"
};

export type DashboardMarketListRow = {
  stock: Stock;
  sector: string;
  value: number;
  turnover: number;
  dailyChangeRate: number;
  foreignNetBuyEstimate: number;
  institutionNetBuyEstimate: number;
};

export type DashboardSectorListRow = {
  sector: string;
  count: number;
  value: number;
  avgMove: number;
  turnover: number;
  topStock: Stock;
};

function finiteNumber(value: number | undefined | null, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getDashboardDailyMove(stock: Stock) {
  return finiteNumber(stock.dailyChangeRate, finiteNumber(stock.priceChange3M));
}

export function getDashboardTradingValue(stock: Stock) {
  return Math.max(0, finiteNumber(stock.currentPrice) * finiteNumber(stock.volume));
}

function getEstimatedNetBuyShares(stock: Stock, side: "foreign" | "institution") {
  const volume = finiteNumber(stock.volume);
  const move = getDashboardDailyMove(stock);
  const turnover = getDashboardTradingValue(stock);
  const liquidityScore = clamp(Math.log10(turnover + 1) / 13, 0, 1);
  const qualityScore =
    (finiteNumber(stock.companyCentralityScore) +
      finiteNumber(stock.valueChainScore) +
      finiteNumber(stock.earningsLinkScore) +
      finiteNumber(stock.financialStabilityScore)) /
    400;
  const marketBias = stock.market === "KOSPI" ? 0.08 : 0.04;
  const sideBias = side === "foreign" ? 0.07 : 0.045;
  const directionBias = move >= 0 ? 1 : 0.32;
  const participation = clamp(marketBias + sideBias + liquidityScore * 0.17 + qualityScore * 0.12, 0.03, 0.42);
  const fallbackVolume = Math.max(1_000, Math.round((qualityScore + liquidityScore + 0.1) * 45_000));

  return Math.round((volume || fallbackVolume) * participation * directionBias);
}

function createDashboardRow(stock: Stock): DashboardMarketListRow {
  const dailyChangeRate = getDashboardDailyMove(stock);
  const turnover = getDashboardTradingValue(stock);
  const foreignNetBuyEstimate = getEstimatedNetBuyShares(stock, "foreign");
  const institutionNetBuyEstimate = getEstimatedNetBuyShares(stock, "institution");

  return {
    stock,
    sector: stock.sector || stock.theme || "기타",
    value: turnover,
    turnover,
    dailyChangeRate,
    foreignNetBuyEstimate,
    institutionNetBuyEstimate
  };
}

function getRowModeValue(row: DashboardMarketListRow, mode: DashboardListMode) {
  if (mode === "gainers") return row.dailyChangeRate;
  if (mode === "foreign") return row.foreignNetBuyEstimate;
  if (mode === "institution") return row.institutionNetBuyEstimate;
  return row.turnover;
}

export function buildDashboardMarketList(stocks: Stock[], market: DashboardMarket, mode: DashboardListMode, limit = 8) {
  return stocks
    .filter((stock) => stock.market === market)
    .map((stock) => {
      const row = createDashboardRow(stock);
      return { ...row, value: getRowModeValue(row, mode) };
    })
    .filter((row) => (mode === "gainers" ? row.dailyChangeRate > 0 : row.value > 0))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function buildDashboardSectorRows(stocks: Stock[], market: DashboardMarket, mode: DashboardListMode, limit = 6) {
  const rows = buildDashboardMarketList(stocks, market, mode, stocks.length);
  const sectorMap = new Map<
    string,
    {
      count: number;
      value: number;
      totalMove: number;
      turnover: number;
      topRow: DashboardMarketListRow;
    }
  >();

  rows.forEach((row) => {
    const current = sectorMap.get(row.sector);
    if (!current) {
      sectorMap.set(row.sector, {
        count: 1,
        value: row.value,
        totalMove: row.dailyChangeRate,
        turnover: row.turnover,
        topRow: row
      });
      return;
    }

    current.count += 1;
    current.value += mode === "gainers" ? row.dailyChangeRate : row.value;
    current.totalMove += row.dailyChangeRate;
    current.turnover += row.turnover;
    if (row.value > current.topRow.value) current.topRow = row;
  });

  return [...sectorMap.entries()]
    .map(([sector, item]): DashboardSectorListRow => ({
      sector,
      count: item.count,
      value: mode === "gainers" ? item.totalMove / item.count : item.value,
      avgMove: item.totalMove / item.count,
      turnover: item.turnover,
      topStock: item.topRow.stock
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function formatDashboardKrwAmount(value: number) {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조원`;
  if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString("ko-KR")}억원`;
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function formatDashboardShares(value: number) {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억주`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만주`;
  return `${Math.round(value).toLocaleString("ko-KR")}주`;
}

export function formatDashboardMetricValue(value: number, mode: DashboardListMode) {
  if (mode === "gainers") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }

  if (mode === "turnover") return formatDashboardKrwAmount(value);
  return formatDashboardShares(value);
}
