import {
  disclosureValueChainImpacts,
  earningsCalendarEvents,
  governanceChangeWatchlist,
  macroIssues,
  representativeChangeHistory
} from "../data/marketBriefing";
import { buildScoreProfile } from "./scoring";
import { getTechnicalSignals } from "./technicalSignals";
import type { PortfolioHolding } from "../types/portfolio";
import type { Stock } from "../types/stock";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const round = (value: number) => Math.round(clamp(value));

const getMove = (stock: Stock) => stock.dailyChangeRate ?? stock.priceChange3M ?? 0;

const isEtf = (stock: Stock) =>
  stock.assetType === "ETF" || /ETF|ETN|TIGER|KODEX|RISE|SOL|ACE|HANARO/i.test(stock.name);

export function getScoreTrend(stock: Stock) {
  const profile = buildScoreProfile(stock);
  const history = stock.valuationHistory?.slice(-5) ?? [];
  if (!history.length) {
    return [
      { label: "T-4", score: round(profile.finalScore - 8) },
      { label: "T-3", score: round(profile.finalScore - 5) },
      { label: "T-2", score: round(profile.finalScore - 3) },
      { label: "T-1", score: round(profile.finalScore - 1) },
      { label: "오늘", score: round(profile.finalScore) }
    ];
  }

  return history.map((point, index) => {
    const epsPulse = point.epsConsensus ? Math.min(12, point.epsConsensus * 0.05) : 0;
    const pricePulse = point.price ? Math.min(10, (point.price / Math.max(stock.currentPrice, 1)) * 6) : 0;
    return {
      label: index === history.length - 1 ? "오늘" : point.date.slice(5),
      score: round(profile.finalScore - (history.length - 1 - index) * 2 + epsPulse + pricePulse - 8)
    };
  });
}

export function getScoreContributions(stock: Stock) {
  const profile = buildScoreProfile(stock);
  const riskBuffer = 100 - profile.preReflectionRiskScore;
  const rows = [
    {
      label: "시장 주도성",
      value: profile.marketAttentionScore,
      weight: 24,
      description: "당일 등락률, 중기 추세, 52주 고점 근접, 거래대금 추정"
    },
    {
      label: "산업·밸류체인",
      value: Math.round((profile.scenarioScore + profile.valueChainScore + profile.companyCentralityScore) / 3),
      weight: 26,
      description: "산업 시나리오, 병목 구간, 기업 중심성"
    },
    {
      label: "실적 연결",
      value: profile.earningsLinkScore,
      weight: 16,
      description: "매출·이익 성장, 마진, 현금흐름"
    },
    {
      label: "밸류 부담",
      value: profile.valuationJustificationScore,
      weight: 14,
      description: "Forward PER, PSR, 컨센서스 동행"
    },
    {
      label: "리스크 여유",
      value: riskBuffer,
      weight: 12,
      description: "선반영 위험을 차감한 여유"
    },
    {
      label: "데이터 신뢰",
      value: profile.dataReliabilityScore,
      weight: 8,
      description: "시세·재무·기술 신호 커버리지"
    }
  ];

  return rows.map((row) => ({
    ...row,
    weighted: Math.round((row.value * row.weight) / 100),
    tone: (row.value >= 75 ? "strong" : row.value >= 55 ? "neutral" : "weak") as "strong" | "neutral" | "weak"
  }));
}

export function getCaptureHistory(stock: Stock) {
  const profile = buildScoreProfile(stock);
  const signals = getTechnicalSignals(stock);
  const primarySignal = signals[0]?.label;
  return [
    {
      date: "오늘",
      title: "현재 포착 사유",
      detail: primarySignal
        ? `${primarySignal}과 시장 주도성 ${profile.marketAttentionScore}점이 함께 확인됩니다.`
        : `시장 주도성 ${profile.marketAttentionScore}점, 종합 점수 ${profile.finalScore}점 기준으로 관찰합니다.`
    },
    {
      date: "전일",
      title: "점수 변화 체크",
      detail: `실적 연결 ${profile.earningsLinkScore}점, 밸류 부담 ${profile.valuationJustificationScore}점으로 약한 축을 분리했습니다.`
    },
    {
      date: "최근 1주",
      title: "산업 위치",
      detail: `${stock.theme} 안에서 밸류체인 핵심성 ${profile.valueChainScore}점, 기업 중심성 ${profile.companyCentralityScore}점입니다.`
    }
  ];
}

export function getStockWarnings(stock: Stock) {
  const profile = buildScoreProfile(stock);
  const warnings: Array<{ title: string; description: string; tone: "warning" | "danger" | "watch" }> = [];

  if (profile.marketAttentionScore >= 78 && profile.earningsLinkScore < 55) {
    warnings.push({
      title: "가격은 강하지만 실적 연결은 약함",
      description: "가격·수급은 먼저 움직였지만 실적 확인이 늦으면 변동성이 커질 수 있습니다.",
      tone: "warning"
    });
  }

  if (profile.structuralCompositeScore >= 72 && profile.marketAttentionScore < 48) {
    warnings.push({
      title: "구조는 좋지만 시장 반응이 약함",
      description: "산업 구조상 위치는 좋으나 아직 시장이 인정하지 않은 후행 관찰 후보입니다.",
      tone: "watch"
    });
  }

  if (profile.preReflectionRiskScore >= 65) {
    warnings.push({
      title: "선반영 위험 확인",
      description: "상승분이 이미 기대를 많이 반영했는지 밸류에이션과 실적 이벤트를 같이 확인해야 합니다.",
      tone: "danger"
    });
  }

  return warnings;
}

export function getHighProximityLiquidity(stock: Stock) {
  const signals = getTechnicalSignals(stock);
  const hasHighProximity = signals.some((signal) => signal.kind === "priceHighProximity");
  const hasVolumeSurge = signals.some((signal) => signal.kind === "volumeSurgeEstimate");
  const tradedValue = stock.currentPrice * Math.max(stock.volume ?? 0, 0);
  const marketValue = Math.max(stock.marketCap, 1) * 100_000_000;
  const turnover = (tradedValue / marketValue) * 100;

  return {
    hasHighProximity,
    hasVolumeSurge,
    turnover,
    label: hasHighProximity
      ? hasVolumeSurge
        ? "신고가 근접 + 거래대금 동반"
        : "신고가 근접, 거래대금 확인 필요"
      : hasVolumeSurge
        ? "거래량 급증 추정"
        : "특이 신호 없음"
  };
}

export function buildIndustryMoneyFlowRanking(stocks: Stock[]) {
  const map = new Map<string, Stock[]>();
  stocks.forEach((stock) => {
    if (isEtf(stock)) return;
    map.set(stock.theme, [...(map.get(stock.theme) ?? []), stock]);
  });

  return Array.from(map.entries())
    .map(([theme, items]) => {
      const avgMove = items.reduce((sum, stock) => sum + getMove(stock), 0) / Math.max(items.length, 1);
      const upRatio = (items.filter((stock) => getMove(stock) > 0).length / Math.max(items.length, 1)) * 100;
      const leadership = items.reduce((sum, stock) => sum + buildScoreProfile(stock).marketAttentionScore, 0) / Math.max(items.length, 1);
      const moneyFlowScore = round(48 + avgMove * 4 + (upRatio - 50) * 0.35 + (leadership - 55) * 0.35);
      const leader = [...items].sort((a, b) => buildScoreProfile(b).marketAttentionScore - buildScoreProfile(a).marketAttentionScore)[0];
      return {
        theme,
        count: items.length,
        avgMove,
        upRatio,
        moneyFlowScore,
        leader
      };
    })
    .sort((a, b) => b.moneyFlowScore - a.moneyFlowScore);
}

export function buildValueChainComparison(stocks: Stock[]) {
  const grouped = buildIndustryMoneyFlowRanking(stocks);
  return {
    strong: grouped.slice(0, 5),
    weak: [...grouped].sort((a, b) => a.moneyFlowScore - b.moneyFlowScore).slice(0, 5)
  };
}

export function buildEtfExposureMap(stocks: Stock[]) {
  const map = new Map<string, { common: Stock[]; etf: Stock[] }>();
  stocks.forEach((stock) => {
    const current = map.get(stock.theme) ?? { common: [], etf: [] };
    if (isEtf(stock)) current.etf.push(stock);
    else current.common.push(stock);
    map.set(stock.theme, current);
  });

  return Array.from(map.entries())
    .map(([theme, items]) => {
      const commonLeader = [...items.common].sort((a, b) => buildScoreProfile(b).finalScore - buildScoreProfile(a).finalScore)[0];
      const etfLeader = [...items.etf].sort((a, b) => buildScoreProfile(b).finalScore - buildScoreProfile(a).finalScore)[0];
      return {
        theme,
        commonCount: items.common.length,
        etfCount: items.etf.length,
        commonLeader,
        etfLeader,
        exposureBalance: round(50 + items.common.length * 1.2 - items.etf.length * 0.45)
      };
    })
    .sort((a, b) => b.commonCount + b.etfCount - (a.commonCount + a.etfCount))
    .slice(0, 12);
}

export function buildOverheatMatrix(stocks: Stock[]) {
  return buildIndustryMoneyFlowRanking(stocks)
    .map((item) => {
      const themeStocks = stocks.filter((stock) => stock.theme === item.theme && !isEtf(stock));
      const overheat = Math.round(
        themeStocks.reduce((sum, stock) => sum + buildScoreProfile(stock).preReflectionRiskScore, 0) /
          Math.max(themeStocks.length, 1)
      );
      const earningsNeed = Math.round(
        100 -
          themeStocks.reduce((sum, stock) => sum + buildScoreProfile(stock).earningsLinkScore, 0) /
            Math.max(themeStocks.length, 1)
      );
      return {
        ...item,
        overheat,
        earningsNeed
      };
    })
    .sort((a, b) => b.overheat + b.earningsNeed - (a.overheat + a.earningsNeed))
    .slice(0, 8);
}

export function buildNewlyRecognizedIndustries(stocks: Stock[]) {
  return buildIndustryMoneyFlowRanking(stocks)
    .filter((item) => item.moneyFlowScore >= 60 || item.avgMove > 1.5)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      reason:
        item.upRatio >= 65
          ? "상승 종목 확산"
          : item.avgMove >= 2
            ? "평균 등락률 개선"
            : "시장 주도성 회복"
    }));
}

export function getThemeEarningsEvents(theme: string) {
  return earningsCalendarEvents.filter((event) => event.theme === theme).slice(0, 4);
}

export function getRepresentativeHistory(chainName: string) {
  return representativeChangeHistory.filter((item) => item.chainName === chainName).slice(0, 4);
}

export function getDisclosureImpacts(chainName: string) {
  return disclosureValueChainImpacts.filter((item) => item.chainName === chainName).slice(0, 4);
}

export function buildMacroBriefing(stocks: Stock[]) {
  const flows = buildIndustryMoneyFlowRanking(stocks);
  const strongThemes = flows.slice(0, 4);
  const weakThemes = [...flows].sort((a, b) => a.moneyFlowScore - b.moneyFlowScore).slice(0, 4);

  return {
    issues: macroIssues,
    strongThemes,
    weakThemes,
    earnings: earningsCalendarEvents,
    governance: governanceChangeWatchlist,
    newIndustries: buildNewlyRecognizedIndustries(stocks),
    matrix: buildOverheatMatrix(stocks),
    valueChainComparison: buildValueChainComparison(stocks)
  };
}

export function buildRebalanceCandidates(
  rows: Array<{
    holding: PortfolioHolding;
    stock?: Stock;
    returnRate: number;
    profitLoss: number;
    computedWeight: number;
  }>
) {
  return rows
    .filter((row) => row.stock)
    .map((row) => {
      const stock = row.stock as Stock;
      const profile = buildScoreProfile(stock);
      let action = "유지";
      let reason = "현재 점수와 비중이 큰 충돌 없이 유지 구간입니다.";

      if (row.computedWeight >= 35 && profile.preReflectionRiskScore >= 62) {
        action = "비중 축소 검토";
        reason = "비중이 높고 선반영 위험이 커져 포트폴리오 변동성 관리가 필요합니다.";
      } else if (profile.finalScore >= 76 && row.computedWeight < 12 && profile.preReflectionRiskScore < 55) {
        action = "비중 확대 후보";
        reason = "점수 대비 포트폴리오 비중이 낮아 추가 관찰 가치가 있습니다.";
      } else if (profile.marketAttentionScore >= 75 && profile.earningsLinkScore < 55) {
        action = "실적 확인 대기";
        reason = "가격 반응은 강하지만 실적 연결 확인 전까지 성급한 확대를 피합니다.";
      } else if (row.returnRate < -12 && profile.finalScore < 55) {
        action = "이탈 검토";
        reason = "수익률과 종합 점수가 동시에 약해져 기존 논리 점검이 필요합니다.";
      }

      return {
        ...row,
        action,
        reason,
        score: profile.finalScore,
        risk: profile.preReflectionRiskScore
      };
    })
    .sort((a, b) => {
      const rank = (action: string) =>
        action === "비중 축소 검토" ? 0 : action === "이탈 검토" ? 1 : action === "비중 확대 후보" ? 2 : 3;
      return rank(a.action) - rank(b.action) || b.score - a.score;
    })
    .slice(0, 5);
}
