import type { Stock, ValuationStatus } from "../types/stock";
import {
  calculateConsensusSyncRatio,
  calculateMarketExpectedNetIncome,
  calculatePriceJustificationRatio,
  calculateRequiredProfitGrowth,
  calculateRequiredRevenue
} from "./scoring";

export interface ValuationMetrics {
  expectedNetIncome: number;
  requiredProfitGrowth: number;
  requiredRevenue: number;
  priceJustificationRatio: number;
  consensusSyncRatio: number;
}

export function buildValuationMetrics(stock: Stock): ValuationMetrics {
  const expectedNetIncome = calculateMarketExpectedNetIncome(
    stock.marketCap,
    stock.industryAvgPer
  );
  const requiredProfitGrowth = calculateRequiredProfitGrowth(
    expectedNetIncome,
    stock.currentNetIncome
  );
  const requiredOperatingProfit = expectedNetIncome / 0.72;
  const requiredRevenue = calculateRequiredRevenue(
    requiredOperatingProfit,
    stock.targetOperatingMargin
  );

  return {
    expectedNetIncome,
    requiredProfitGrowth,
    requiredRevenue,
    priceJustificationRatio: calculatePriceJustificationRatio(
      stock.netIncomeGrowth3Y,
      stock.priceChange12M
    ),
    consensusSyncRatio: calculateConsensusSyncRatio(
      stock.epsEstimateGrowthRate,
      stock.priceChange12M
    )
  };
}

export function getValuationPosition(status: ValuationStatus) {
  const positions: Record<ValuationStatus, number> = {
    저평가: 14,
    적정: 36,
    "기대 반영": 60,
    과열: 82,
    "버블 위험": 94
  };

  return positions[status];
}

export function getValuationNarrative(stock: Stock) {
  const metrics = buildValuationMetrics(stock);

  if (stock.valuationStatus === "저평가") {
    return `${stock.name}의 현재 가격은 보수적 실적 시나리오 대비 할인되어 있으며, EPS 컨센서스 상향이 유지되면 리레이팅 여지가 있습니다.`;
  }

  if (stock.valuationStatus === "적정") {
    return `현재 가격은 기본 실적 시나리오를 대체로 반영한 수준입니다. 추가 상승은 이익 상향 또는 밸류체인 핵심성 재평가가 필요합니다.`;
  }

  if (stock.valuationStatus === "기대 반영") {
    return `낙관 시나리오의 일부가 이미 가격에 반영되어 있습니다. 컨센서스 동행률 ${Math.round(
      metrics.consensusSyncRatio * 100
    )}%가 유지되는지 확인해야 합니다.`;
  }

  if (stock.valuationStatus === "과열") {
    return `주가가 이익 증가 속도보다 빠르게 움직였습니다. 고객사 투자 지연, 마진 둔화, 수급 약화가 확인되면 조정 리스크가 커집니다.`;
  }

  return `현재 시총을 정당화하려면 극단적인 성장 가정이 필요합니다. 실적 연결성보다 기대가 앞선 구간으로 분류됩니다.`;
}
