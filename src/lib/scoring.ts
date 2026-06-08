import type { FinalDecision, Stock } from "../types/stock";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const roundScore = (value: number) => Math.round(clamp(value));

const curveScore = (value: number, center = 62, slope = 1.08) =>
  clamp(center + (clamp(value) - center) * slope);

export interface ScoreProfile {
  scenarioScore: number;
  valueChainScore: number;
  companyCentralityScore: number;
  marketAttentionScore: number;
  earningsLinkScore: number;
  financialStabilityScore: number;
  valuationJustificationScore: number;
  preReflectionRiskScore: number;
  riskBufferScore: number;
  dataReliabilityScore: number;
  marketResponseScore: number;
  structuralCompositeScore: number;
  finalScore: number;
}

function hasFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function calculateDataReliabilityScore(stock: Stock) {
  const numericFields: Array<keyof Stock> = [
    "marketCap",
    "currentPrice",
    "fiftyTwoWeekLow",
    "fiftyTwoWeekHigh",
    "threeYearLow",
    "priceChange3M",
    "priceChange6M",
    "priceChange12M",
    "ma200Gap",
    "revenueGrowth3Y",
    "operatingProfitGrowth3Y",
    "netIncomeGrowth3Y",
    "quarterlyRevenueGrowth",
    "quarterlyOperatingProfitGrowth",
    "operatingMargin",
    "netMargin",
    "roe",
    "roic",
    "debtRatio",
    "fcf",
    "forwardPer",
    "industryAvgPer",
    "psr",
    "epsEstimateGrowthRate"
  ];
  const coverage = numericFields.filter((field) => hasFiniteNumber(stock[field])).length / numericFields.length;
  const sourceScore =
    stock.quoteProvider === "naverDelayedQuoteProvider" ||
    stock.quoteProvider === "naverUniverseProvider" ||
    stock.quoteProvider === "fmpQuoteProvider" ||
    stock.quoteProvider === "fmpUniverseProvider"
      ? 22
      : stock.quoteProvider === "krxDailyProvider"
        ? 18
        : stock.quoteProvider === "referenceQuoteProvider"
          ? 8
          : 10;
  const historyScore = Math.min(14, (stock.valuationHistory?.length ?? 0) * 2);
  const liquidityScore = stock.volume && stock.volume > 0 ? 10 : 2;
  const technicalScore = (stock.technicalSignals?.length ?? 0) > 0 ? 6 : 2;

  return roundScore(coverage * 48 + sourceScore + historyScore + liquidityScore + technicalScore);
}

function calculateStructuralCompositeScore({
  scenarioScore,
  valueChainScore,
  companyCentralityScore,
  earningsLinkScore,
  financialStabilityScore,
  valuationJustificationScore,
  riskBufferScore
}: Pick<
  ScoreProfile,
  | "scenarioScore"
  | "valueChainScore"
  | "companyCentralityScore"
  | "earningsLinkScore"
  | "financialStabilityScore"
  | "valuationJustificationScore"
  | "riskBufferScore"
>) {
  return roundScore(
    scenarioScore * 0.18 +
      valueChainScore * 0.16 +
      companyCentralityScore * 0.14 +
      earningsLinkScore * 0.18 +
      financialStabilityScore * 0.12 +
      valuationJustificationScore * 0.12 +
      riskBufferScore * 0.1
  );
}

function calculateMarketResponseScore(structuralCompositeScore: number, marketAttentionScore: number, risk: number) {
  const divergence = Math.abs(structuralCompositeScore - marketAttentionScore);
  const riskConflict = marketAttentionScore >= 72 && risk >= 72 ? 10 : 0;
  const neglectedQualityPenalty = structuralCompositeScore >= 72 && marketAttentionScore < 42 ? 12 : 0;
  const speculativePenalty = marketAttentionScore >= 78 && structuralCompositeScore < 50 ? 16 : 0;
  return roundScore(94 - divergence * 0.72 - riskConflict - neglectedQualityPenalty - speculativePenalty);
}

function capFinalScoreByWeakLinks({
  score,
  scenarioScore,
  valueChainScore,
  companyCentralityScore,
  marketAttentionScore,
  earningsLinkScore,
  financialStabilityScore,
  valuationJustificationScore,
  preReflectionRiskScore
}: Pick<
  ScoreProfile,
  | "scenarioScore"
  | "valueChainScore"
  | "companyCentralityScore"
  | "marketAttentionScore"
  | "earningsLinkScore"
  | "financialStabilityScore"
  | "valuationJustificationScore"
  | "preReflectionRiskScore"
> & {
  score: number;
}) {
  let ceiling = 100;
  const structuralMinimum = Math.min(scenarioScore, valueChainScore, companyCentralityScore);

  if (valuationJustificationScore < 30) ceiling = Math.min(ceiling, 72);
  else if (valuationJustificationScore < 45) ceiling = Math.min(ceiling, 80);
  else if (valuationJustificationScore < 60) ceiling = Math.min(ceiling, 88);

  if (earningsLinkScore < 30) ceiling = Math.min(ceiling, 74);
  else if (earningsLinkScore < 45) ceiling = Math.min(ceiling, 82);
  else if (earningsLinkScore < 60) ceiling = Math.min(ceiling, 90);

  if (financialStabilityScore < 30) ceiling = Math.min(ceiling, 74);
  else if (financialStabilityScore < 45) ceiling = Math.min(ceiling, 84);
  else if (financialStabilityScore < 58) ceiling = Math.min(ceiling, 92);

  if (preReflectionRiskScore >= 78) ceiling = Math.min(ceiling, 80);
  else if (preReflectionRiskScore >= 68) ceiling = Math.min(ceiling, 88);
  else if (preReflectionRiskScore >= 58) ceiling = Math.min(ceiling, 94);

  if (marketAttentionScore < 35) ceiling = Math.min(ceiling, 78);
  else if (marketAttentionScore < 50) ceiling = Math.min(ceiling, 88);

  if (structuralMinimum < 45) ceiling = Math.min(ceiling, 82);
  else if (structuralMinimum < 58) ceiling = Math.min(ceiling, 90);

  return roundScore(Math.min(score, ceiling));
}

function sizeQuality(stock: Stock) {
  if (stock.assetType === "ETF") return 1;
  if (stock.market.startsWith("US")) {
    return stock.marketCap >= 5000 ? 8 : stock.marketCap >= 1200 ? 5 : stock.marketCap >= 300 ? 2 : -4;
  }
  return stock.marketCap >= 500000 ? 8 : stock.marketCap >= 100000 ? 5 : stock.marketCap >= 10000 ? 2 : -5;
}

function isEtfLike(stock: Pick<Stock, "assetType" | "sector" | "theme" | "name">) {
  return stock.assetType === "ETF" || stock.sector.startsWith("ETF") || stock.theme === "ETF" || /ETF|ETN|TIGER|KODEX|RISE|SOL|ACE|HANARO/i.test(stock.name);
}

function etfMarketScale(stock: Stock) {
  if (stock.market.startsWith("US")) {
    return stock.marketCap >= 1500 ? 18 : stock.marketCap >= 500 ? 13 : stock.marketCap >= 150 ? 8 : stock.marketCap >= 40 ? 4 : -4;
  }
  return stock.marketCap >= 50000 ? 18 : stock.marketCap >= 15000 ? 13 : stock.marketCap >= 5000 ? 8 : stock.marketCap >= 1200 ? 4 : -4;
}

function etfTurnoverScore(stock: Stock) {
  const tradedValue = stock.currentPrice * Math.max(stock.volume ?? 0, 0);
  const marketValue = Math.max(stock.marketCap, 1) * 100_000_000;
  const turnover = (tradedValue / marketValue) * 100;
  return clamp(turnover * 8, 0, 18);
}

function productStructurePenalty(stock: Stock) {
  const name = stock.name.toUpperCase();
  let penalty = 0;
  if (/레버리지|2X|3X|인버스|곱버스|선물|FUTURES|ETN/.test(name)) penalty += 42;
  if (/TOP10|TOP 10|10/.test(name)) penalty += 6;
  if (/합성|SYNTHETIC/.test(name)) penalty += 8;
  if (stock.marketCap < 1200 && !stock.market.startsWith("US")) penalty += 8;
  if (stock.marketCap < 40 && stock.market.startsWith("US")) penalty += 8;
  return penalty;
}

function turnoverScore(stock: Stock) {
  const tradedValue = stock.currentPrice * Math.max(stock.volume ?? 0, 0);
  const marketValue = Math.max(stock.marketCap, 1) * 100_000_000;
  const turnover = (tradedValue / marketValue) * 100;
  return clamp(turnover * 9, 0, 18);
}

function highProximityScore(stock: Stock) {
  const proximity = (stock.currentPrice / Math.max(stock.fiftyTwoWeekHigh, stock.currentPrice, 1)) * 100;
  if (proximity >= 98) return 18;
  if (proximity >= 92) return 14;
  if (proximity >= 84) return 9;
  if (proximity >= 72) return 4;
  if (proximity < 45) return -10;
  return 0;
}

export function calculateMarketAttentionScore(stock: Stock) {
  const dailyMove = stock.dailyChangeRate ?? 0;
  const shortTrend = stock.priceChange3M;
  const midTrend = stock.priceChange6M;
  const yearlyTrend = stock.priceChange12M;
  const maTrend = stock.ma200Gap;

  return roundScore(
    43 +
      dailyMove * 3.2 +
      Math.max(shortTrend, -25) * 0.5 +
      Math.max(midTrend, -35) * 0.18 +
      Math.max(yearlyTrend, -45) * 0.07 +
      maTrend * 0.2 +
      turnoverScore(stock) +
      highProximityScore(stock)
  );
}

function buildEtfScoreProfile(stock: Stock): ScoreProfile {
  const baseRisk = calculatePreReflectionRisk(stock);
  const marketScale = etfMarketScale(stock);
  const turnover = etfTurnoverScore(stock);
  const structurePenalty = productStructurePenalty(stock);
  const broadThemeBoost = stock.theme !== "ETF" && stock.theme !== "기타" ? 8 : -4;
  const momentum = clamp(
    54 +
      Math.max(stock.priceChange3M, -20) * 0.32 +
      Math.max(stock.priceChange12M, -30) * 0.08 +
      (stock.dailyChangeRate ?? 0) * 0.6 +
      Math.max(stock.ma200Gap, -20) * 0.14,
    15,
    96
  );

  const themeExposureScore = roundScore(
    stock.scenarioScore * 0.52 +
      stock.valueChainScore * 0.24 +
      stock.companyCentralityScore * 0.08 +
      broadThemeBoost +
      marketScale * 0.38
  );
  const holdingQualityScore = roundScore(
    stock.valueChainScore * 0.42 +
      stock.companyCentralityScore * 0.28 +
      stock.earningsLinkScore * 0.18 +
      marketScale * 0.5 -
      (stock.theme === "ETF" ? 6 : 0)
  );
  const liquidityAumScore = roundScore(52 + marketScale * 1.55 + turnover + ((stock.volume ?? 0) > 0 ? 4 : -8));
  const diversificationScore = roundScore(
    74 -
      (/TOP10|TOP 10|10/i.test(stock.name) ? 12 : 0) -
      (stock.theme === "ETF" ? 8 : 0) +
      (stock.sector.includes("/") ? 5 : 0) -
      Math.max(stock.preReflectionRiskScore - 65, 0) * 0.12
  );
  const costTrackingScore = roundScore(
    72 +
      (stock.quoteProvider === "naverUniverseProvider" || stock.quoteProvider === "fmpUniverseProvider" ? 5 : 0) +
      marketScale * 0.35 -
      structurePenalty * 0.42
  );
  const momentumFlowScore = roundScore(momentum);
  const productRisk = roundScore(baseRisk * 0.54 + structurePenalty + Math.max(0, -marketScale) * 1.6);
  const riskBufferScore = roundScore(100 - productRisk);
  const structuralCompositeScore = calculateStructuralCompositeScore({
    scenarioScore: themeExposureScore,
    valueChainScore: holdingQualityScore,
    companyCentralityScore: liquidityAumScore,
    earningsLinkScore: diversificationScore,
    financialStabilityScore: costTrackingScore,
    valuationJustificationScore: momentumFlowScore,
    riskBufferScore
  });
  const dataReliabilityScore = calculateDataReliabilityScore(stock);
  const marketResponseScore = calculateMarketResponseScore(structuralCompositeScore, momentumFlowScore, productRisk);

  const rawFinalScore =
    themeExposureScore * 0.25 +
      holdingQualityScore * 0.2 +
      liquidityAumScore * 0.15 +
      diversificationScore * 0.12 +
      costTrackingScore * 0.1 +
      momentumFlowScore * 0.11 +
      riskBufferScore * 0.06 +
      marketResponseScore * 0.03 +
      dataReliabilityScore * 0.01 -
      (productRisk >= 78 ? 8 : productRisk >= 65 ? 4 : 0);
  const finalScore = capFinalScoreByWeakLinks({
    score: rawFinalScore,
    scenarioScore: themeExposureScore,
    valueChainScore: holdingQualityScore,
    companyCentralityScore: liquidityAumScore,
    marketAttentionScore: momentumFlowScore,
    earningsLinkScore: diversificationScore,
    financialStabilityScore: costTrackingScore,
    valuationJustificationScore: momentumFlowScore,
    preReflectionRiskScore: productRisk
  });

  return {
    scenarioScore: themeExposureScore,
    valueChainScore: holdingQualityScore,
    companyCentralityScore: liquidityAumScore,
    marketAttentionScore: momentumFlowScore,
    earningsLinkScore: diversificationScore,
    financialStabilityScore: costTrackingScore,
    valuationJustificationScore: momentumFlowScore,
    preReflectionRiskScore: productRisk,
    riskBufferScore,
    dataReliabilityScore,
    marketResponseScore,
    structuralCompositeScore,
    finalScore
  };
}

export function buildScoreProfile(stock: Stock): ScoreProfile {
  if (isEtfLike(stock)) {
    return buildEtfScoreProfile(stock);
  }

  const risk = calculatePreReflectionRisk(stock);
  const size = sizeQuality(stock);
  const etfPenalty = stock.assetType === "ETF" ? 8 : 0;
  const preferredPenalty = stock.assetType === "PREFERRED" ? 5 : 0;
  const valuationPremium = stock.forwardPer / Math.max(stock.industryAvgPer, 1);
  const priceMove = stock.dailyChangeRate ?? stock.priceChange3M;
  const positiveRevenueGrowth = Math.max(stock.quarterlyRevenueGrowth, stock.revenueGrowth3Y, 0);
  const positiveProfitGrowth = Math.max(stock.quarterlyOperatingProfitGrowth, stock.operatingProfitGrowth3Y, 0);
  const scenarioMomentum =
    Math.max(stock.priceChange3M, 0) * 0.08 +
    Math.max(stock.priceChange12M, 0) * 0.035 +
    Math.max(priceMove, 0) * 0.12;
  const marketAttentionScore = calculateMarketAttentionScore(stock);

  const scenarioScore = roundScore(
    curveScore(
      stock.scenarioScore * 0.86 +
        stock.valueChainScore * 0.08 +
        positiveRevenueGrowth * 0.12 +
        scenarioMomentum +
        size * 0.65 -
        etfPenalty * 0.25,
      62,
      1.14
    )
  );

  const valueChainScore = roundScore(
    curveScore(
      stock.valueChainScore * 0.82 +
        stock.companyCentralityScore * 0.14 +
        stock.earningsLinkScore * 0.08 +
        size * 0.35 -
        etfPenalty * 0.55 -
        preferredPenalty,
      61,
      1.12
    )
  );

  const companyCentralityScore = roundScore(
    curveScore(
      stock.companyCentralityScore +
        size * 1.15 +
        (stock.assetType === "COMMON" ? 4 : 0) -
        etfPenalty * 0.85 -
        preferredPenalty,
      60,
      1.1
    )
  );

  const earningsLinkScore = roundScore(
    stock.earningsLinkScore * 0.46 +
      positiveProfitGrowth * 0.2 +
      stock.operatingMargin * 0.48 +
      stock.netMargin * 0.24 +
      (stock.fcf > 0 ? 5 : -7) -
      Math.max(stock.debtRatio - 140, 0) * 0.045 -
      etfPenalty * 0.5
  );

  const financialStabilityScore = roundScore(
    stock.financialStabilityScore * 0.42 +
      Math.max(stock.roe, -20) * 0.32 +
      Math.max(stock.roic, -20) * 0.3 +
      Math.max(stock.netMargin, -20) * 0.22 +
      (stock.fcf > 0 ? 8 : -10) -
      Math.max(stock.debtRatio - 120, 0) * 0.055 +
      (stock.assetType === "ETF" ? 4 : 0)
  );

  const valuationJustificationScore = roundScore(
    stock.valuationJustificationScore * 0.42 +
      Math.max(0, 100 - risk) * 0.22 +
      Math.max(0, stock.epsEstimateGrowthRate) * 0.2 +
      Math.max(0, stock.netIncomeGrowth3Y) * 0.08 -
      Math.max(0, valuationPremium - 1) * 15 -
      Math.max(0, stock.psr - 6) * 2
  );

  const riskBufferScore = roundScore(100 - risk);
  const structuralCompositeScore = calculateStructuralCompositeScore({
    scenarioScore,
    valueChainScore,
    companyCentralityScore,
    earningsLinkScore,
    financialStabilityScore,
    valuationJustificationScore,
    riskBufferScore
  });
  const dataReliabilityScore = calculateDataReliabilityScore(stock);
  const marketResponseScore = calculateMarketResponseScore(structuralCompositeScore, marketAttentionScore, risk);
  const gatePenalty =
    (earningsLinkScore < 30 ? 7 : earningsLinkScore < 45 ? 3 : 0) +
    (financialStabilityScore < 28 ? 6 : financialStabilityScore < 42 ? 3 : 0) +
    (valuationJustificationScore < 28 ? 6 : valuationJustificationScore < 42 ? 3 : 0) +
    (risk >= 84 ? 9 : risk >= 68 ? 4 : 0) +
    (stock.assetType === "PREFERRED" ? 3 : 0);
  const leadershipBoost =
    marketAttentionScore >= 78 && scenarioScore >= 70
      ? 6
      : marketAttentionScore >= 68 && scenarioScore >= 62
        ? 4
        : scenarioScore >= 84 && valueChainScore >= 80 && companyCentralityScore >= 78
          ? 5
          : scenarioScore >= 78 && valueChainScore >= 74 && earningsLinkScore >= 68
            ? 3
            : 0;
  const weakIndustryPenalty =
    marketAttentionScore >= 68 ? 0 : scenarioScore < 48 && valueChainScore < 52 ? 6 : scenarioScore < 56 ? 3 : 0;

  const rawFinalScore =
    scenarioScore * 0.13 +
    valueChainScore * 0.1 +
    companyCentralityScore * 0.1 +
    marketAttentionScore * 0.22 +
    earningsLinkScore * 0.14 +
    financialStabilityScore * 0.08 +
    valuationJustificationScore * 0.12 +
    riskBufferScore * 0.08 +
    marketResponseScore * 0.02 +
    dataReliabilityScore * 0.01 +
    leadershipBoost -
    weakIndustryPenalty -
    gatePenalty;
  const finalScore = capFinalScoreByWeakLinks({
    score: rawFinalScore,
    scenarioScore,
    valueChainScore,
    companyCentralityScore,
    marketAttentionScore,
    earningsLinkScore,
    financialStabilityScore,
    valuationJustificationScore,
    preReflectionRiskScore: risk
  });

  return {
    scenarioScore,
    valueChainScore,
    companyCentralityScore,
    marketAttentionScore,
    earningsLinkScore,
    financialStabilityScore,
    valuationJustificationScore,
    preReflectionRiskScore: risk,
    riskBufferScore,
    dataReliabilityScore,
    marketResponseScore,
    structuralCompositeScore,
    finalScore
  };
}

export function calculateFinalScore(stock: Stock) {
  return buildScoreProfile(stock).finalScore;
}

export function getFinalDecision(
  score: number,
  preReflectionRiskScore: number,
  earningsLinkScore?: number,
  assetType?: Stock["assetType"]
): FinalDecision {
  if (assetType === "ETF") {
    if (score < 48) return "제외";
    if (preReflectionRiskScore >= 62) return "상품 구조 확인";
    if (preReflectionRiskScore >= 54) return "분할 접근";
    if (score >= 80 && preReflectionRiskScore < 42) return "테마 노출 검토";
    if (score >= 66) return "분할 접근";
    if (score >= 54) return "관망";
    return "제외";
  }

  if (score < 52) return "제외";
  if (preReflectionRiskScore >= 72) return "과열 경고";
  if (earningsLinkScore !== undefined && score >= 58 && earningsLinkScore < 55) {
    return "실적 확인 대기";
  }
  if (score >= 82 && preReflectionRiskScore < 35) return "매수 검토";
  if (score >= 68 && preReflectionRiskScore <= 62) return "조정 대기";
  if (score >= 55) return "실적 확인 대기";
  return "제외";
}

export function calculatePreReflectionRisk(stock: Stock) {
  const riseFrom52WeekLow =
    ((stock.currentPrice - stock.fiftyTwoWeekLow) / Math.max(stock.fiftyTwoWeekLow, 1)) * 100;
  const riseFromThreeYearLow =
    ((stock.currentPrice - stock.threeYearLow) / Math.max(stock.threeYearLow, 1)) * 100;
  const profitGrowthProxy = Math.max(
    stock.netIncomeGrowth3Y,
    stock.quarterlyOperatingProfitGrowth,
    0
  );
  const priceProfitGap = stock.priceChange12M - profitGrowthProxy;
  const forwardPerPremium =
    ((stock.forwardPer - stock.industryAvgPer) / Math.max(stock.industryAvgPer, 1)) * 100;
  const consensusSyncRatio = calculateConsensusSyncRatio(
    stock.epsEstimateGrowthRate,
    Math.max(stock.priceChange12M, 1)
  );

  let risk = 0;
  risk += riseFrom52WeekLow > 150 ? 20 : riseFrom52WeekLow > 90 ? 14 : riseFrom52WeekLow > 55 ? 8 : 3;
  risk += riseFromThreeYearLow > 300 ? 18 : riseFromThreeYearLow > 180 ? 12 : riseFromThreeYearLow > 90 ? 7 : 2;
  risk += stock.ma200Gap > 45 ? 16 : stock.ma200Gap > 25 ? 10 : stock.ma200Gap > 10 ? 5 : 1;
  risk += priceProfitGap > 70 ? 16 : priceProfitGap > 35 ? 10 : priceProfitGap > 10 ? 5 : 1;
  risk += forwardPerPremium > 80 ? 14 : forwardPerPremium > 35 ? 9 : forwardPerPremium > 10 ? 4 : 1;
  risk += stock.psr > 18 ? 10 : stock.psr > 10 ? 7 : stock.psr > 5 ? 4 : 1;
  risk += consensusSyncRatio < 0.35 ? 8 : consensusSyncRatio < 0.65 ? 4 : 1;

  return Math.round(clamp(risk));
}

export function calculateMarketExpectedNetIncome(
  marketCap: number,
  industryAvgPer: number
) {
  return marketCap / Math.max(industryAvgPer, 1);
}

export function calculateRequiredProfitGrowth(
  expectedNetIncome: number,
  currentNetIncome: number
) {
  return expectedNetIncome / Math.max(currentNetIncome, 1);
}

export function calculateRequiredRevenue(
  requiredOperatingProfit: number,
  targetOperatingMargin: number
) {
  return requiredOperatingProfit / Math.max(targetOperatingMargin / 100, 0.01);
}

export function calculatePriceJustificationRatio(
  profitGrowthRate: number,
  priceGrowthRate: number
) {
  return profitGrowthRate / Math.max(priceGrowthRate, 1);
}

export function calculateConsensusSyncRatio(
  epsEstimateGrowthRate: number,
  priceGrowthRate: number
) {
  return epsEstimateGrowthRate / Math.max(priceGrowthRate, 1);
}
