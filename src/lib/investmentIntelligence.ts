import { alerts as fallbackAlerts, issues as fallbackIssues } from "../data/issues";
import { scenarios } from "../data/scenarios";
import { isStaleTargetAlert } from "./alertFilters";
import { buildScoreProfile, calculateMarketAttentionScore, calculatePreReflectionRisk } from "./scoring";
import { getScenarioStocks as getMatchedScenarioStocks, normalizeScenarioText } from "./scenarioMatching";
import type { Alert, Issue, PortfolioHolding } from "../types/portfolio";
import type { Scenario } from "../types/scenario";
import type { Stock, Theme } from "../types/stock";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

function dailyRate(stock: Stock) {
  return typeof stock.dailyChangeRate === "number" && Number.isFinite(stock.dailyChangeRate)
    ? stock.dailyChangeRate
    : stock.priceChange3M / 63;
}

export type CyclePhase = "주도 확장" | "관심 회복" | "과열 경계" | "소외" | "약세 전환" | "관찰";

export interface IndustryCycleInsight {
  id: string;
  name: string;
  theme: Theme | "복합";
  phase: CyclePhase;
  cycleScore: number;
  averageChange: number;
  breadth: number;
  marketAttention: number;
  riskScore: number;
  relatedCount: number;
  leaders: Stock[];
  laggards: Stock[];
  updateSignal: string;
  reportBullets: string[];
}

export interface RotationInsight {
  theme: Theme;
  score: number;
  averageChange: number;
  breadth: number;
  marketCap: number;
  count: number;
  leaders: Stock[];
  phase: CyclePhase;
}

export interface ChecklistItem {
  label: string;
  status: "통과" | "확인" | "주의";
  detail: string;
}

export interface RiskEvent {
  id: string;
  stockId: string;
  stockName: string;
  title: string;
  date: string;
  type: string;
  severity: "info" | "warning" | "critical" | "success";
  scope: "종목" | "산업" | "포트폴리오";
}

export interface ThesisAlert {
  id: string;
  stockId: string;
  title: string;
  severity: "info" | "warning" | "critical" | "success";
  detail: string;
}

export interface EmergingScenarioCandidate {
  id: string;
  name: string;
  theme: Theme;
  status: "신규 후보" | "기존 시나리오 갱신";
  score: number;
  averageChange: number;
  breadth: number;
  marketAttention: number;
  count: number;
  leaders: Stock[];
  reason: string;
}

export function getScenarioStocks(scenario: Scenario, stocks: Stock[]) {
  return getMatchedScenarioStocks(scenario, stocks);
}

function classifyPhase({
  cycleScore,
  averageChange,
  breadth,
  riskScore,
  marketAttention
}: {
  cycleScore: number;
  averageChange: number;
  breadth: number;
  riskScore: number;
  marketAttention: number;
}): CyclePhase {
  if (riskScore >= 72 && marketAttention >= 70) return "과열 경계";
  if (marketAttention >= 68 && breadth >= 55 && averageChange >= 0.8) return "주도 확장";
  if (marketAttention >= 56 && averageChange >= -0.2 && breadth >= 42) return "관심 회복";
  if (cycleScore < 42 || averageChange <= -2.5 || breadth < 28) return "약세 전환";
  if (cycleScore < 52 || breadth < 40) return "소외";
  return "관찰";
}

function buildReportBullets(name: string, related: Stock[], phase: CyclePhase, averageChange: number, riskScore: number) {
  const leaders = [...related].sort((a, b) => dailyRate(b) - dailyRate(a)).slice(0, 3);
  const leaderText = leaders.length ? leaders.map((stock) => stock.name).join(", ") : "대표 종목 부족";
  const direction =
    averageChange >= 1
      ? "가격 반응이 동반되는 확장 구간입니다."
      : averageChange <= -1
        ? "단기 가격 반응은 약해져 확인이 필요합니다."
        : "가격 반응은 중립권이며 다음 촉매 확인이 필요합니다.";
  const riskText = riskScore >= 68 ? "선반영 부담이 커져 추격보다 검증이 중요합니다." : "선반영 부담은 관리 가능한 범위입니다.";

  return [
    `${name}은 현재 '${phase}' 구간으로 분류됩니다.`,
    `대표 움직임은 ${leaderText} 중심으로 확인됩니다.`,
    direction,
    riskText
  ];
}

export function buildIndustryCycleRadar(stocks: Stock[], scenarioList: Scenario[] = scenarios): IndustryCycleInsight[] {
  return scenarioList
    .map((scenario) => {
      const related = getScenarioStocks(scenario, stocks);
      const profiles = related.map((stock) => buildScoreProfile(stock));
      const averageChange = average(related.map(dailyRate));
      const breadth = related.length ? (related.filter((stock) => dailyRate(stock) > 0).length / related.length) * 100 : 0;
      const marketAttention = average(profiles.map((profile) => profile.marketAttentionScore));
      const riskScore = average(profiles.map((profile) => profile.preReflectionRiskScore));
      const scenarioStrength = average(profiles.map((profile) => profile.scenarioScore));
      const cycleScore = Math.round(
        clamp(scenarioStrength * 0.28 + marketAttention * 0.36 + breadth * 0.16 + averageChange * 5 + (100 - riskScore) * 0.12)
      );
      const phase = classifyPhase({ cycleScore, averageChange, breadth, riskScore, marketAttention });
      const leaders = [...related].sort((a, b) => dailyRate(b) - dailyRate(a)).slice(0, 4);
      const laggards = [...related].sort((a, b) => dailyRate(a) - dailyRate(b)).slice(0, 3);
      const dominantTheme: Theme | "복합" = related.length
        ? ([...related].sort((a, b) => stocksByTheme(related, b.theme).length - stocksByTheme(related, a.theme).length)[0]?.theme ?? "복합")
        : "복합";
      const updateSignal =
        Math.abs(averageChange) >= 2
          ? "오늘 가격 반응이 커서 시나리오 코멘트 갱신 우선"
          : riskScore >= 70
            ? "선반영 리스크 점검 우선"
            : breadth >= 60
              ? "확산 폭 확인 우선"
              : "관찰 유지";

      return {
        id: scenario.id,
        name: scenario.name,
        theme: dominantTheme,
        phase,
        cycleScore,
        averageChange,
        breadth: Math.round(breadth),
        marketAttention: Math.round(marketAttention),
        riskScore: Math.round(riskScore),
        relatedCount: related.length,
        leaders,
        laggards,
        updateSignal,
        reportBullets: buildReportBullets(scenario.name, related, phase, averageChange, riskScore)
      };
    })
    .sort((a, b) => b.cycleScore - a.cycleScore);
}

function stocksByTheme(stocks: Stock[], theme: Theme) {
  return stocks.filter((stock) => stock.theme === theme);
}

export function buildThemeRotation(stocks: Stock[]): RotationInsight[] {
  const groups = stocks.reduce<Record<string, Stock[]>>((acc, stock) => {
    if (!acc[stock.theme]) acc[stock.theme] = [];
    acc[stock.theme]!.push(stock);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([theme, group]) => {
      const profiles = group.map((stock) => buildScoreProfile(stock));
      const averageChange = average(group.map(dailyRate));
      const breadth = group.length ? (group.filter((stock) => dailyRate(stock) > 0).length / group.length) * 100 : 0;
      const marketAttention = average(profiles.map((profile) => profile.marketAttentionScore));
      const riskScore = average(profiles.map((profile) => profile.preReflectionRiskScore));
      const score = Math.round(clamp(marketAttention * 0.45 + breadth * 0.22 + averageChange * 6 + average(profiles.map((profile) => profile.scenarioScore)) * 0.2));
      const phase = classifyPhase({ cycleScore: score, averageChange, breadth, riskScore, marketAttention });

      return {
        theme: theme as Theme,
        score,
        averageChange,
        breadth: Math.round(breadth),
        marketCap: group.reduce((sum, stock) => sum + Math.max(stock.marketCap, 0), 0),
        count: group.length,
        leaders: [...group].sort((a, b) => dailyRate(b) - dailyRate(a)).slice(0, 3),
        phase
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildScenarioUpdateQueue(stocks: Stock[], scenarioList: Scenario[] = scenarios) {
  return buildIndustryCycleRadar(stocks, scenarioList)
    .map((insight) => ({
      ...insight,
      priority:
        Math.abs(insight.averageChange) * 18 +
        insight.marketAttention * 0.35 +
        (insight.phase === "과열 경계" ? 20 : insight.phase === "주도 확장" ? 14 : 0)
    }))
    .sort((a, b) => b.priority - a.priority);
}

export function buildEmergingScenarioCandidates(
  stocks: Stock[],
  scenarioList: Scenario[] = scenarios
): EmergingScenarioCandidate[] {
  const scenarioText = scenarioList
    .flatMap((scenario) => [
      scenario.name,
      scenario.description,
      ...scenario.coreValueChains,
      ...scenario.nodes.flatMap((node) => [node.label, node.theme, node.description])
    ])
    .map(normalizeScenarioText)
    .filter((value) => value.length >= 2);

  const groups = stocks
    .filter((stock) => stock.assetType !== "ETF" && stock.market !== "US Large Cap" && stock.market !== "US Growth")
    .reduce<Record<string, Stock[]>>((acc, stock) => {
      if (!acc[stock.theme]) acc[stock.theme] = [];
      acc[stock.theme]!.push(stock);
      return acc;
    }, {});

  return Object.entries(groups)
    .map(([theme, group]) => {
      const profiles = group.map((stock) => buildScoreProfile(stock));
      const averageChange = average(group.map(dailyRate));
      const breadth = group.length ? (group.filter((stock) => dailyRate(stock) > 0).length / group.length) * 100 : 0;
      const marketAttention = average(profiles.map((profile) => profile.marketAttentionScore));
      const scenarioStrength = average(profiles.map((profile) => profile.scenarioScore));
      const score = Math.round(clamp(marketAttention * 0.44 + breadth * 0.24 + averageChange * 7 + scenarioStrength * 0.18));
      const normalizedTheme = normalizeScenarioText(theme);
      const isCovered = scenarioText.some(
        (text) => text.includes(normalizedTheme) || normalizedTheme.includes(text)
      );
      const leaders = [...group].sort((a, b) => dailyRate(b) - dailyRate(a)).slice(0, 3);
      const status: EmergingScenarioCandidate["status"] = isCovered ? "기존 시나리오 갱신" : "신규 후보";
      const direction =
        averageChange >= 1
          ? "당일 가격 반응과 확산이 함께 살아났습니다."
          : averageChange <= -1
            ? "가격 반응이 약해져 기존 시나리오 재점검이 필요합니다."
            : "가격 반응은 중립권이지만 시장주도성 변화를 추적할 만합니다.";

      return {
        id: `candidate-${normalizeScenarioText(theme)}`,
        name: `${theme} 산업 흐름`,
        theme: theme as Theme,
        status,
        score,
        averageChange,
        breadth: Math.round(breadth),
        marketAttention: Math.round(marketAttention),
        count: group.length,
        leaders,
        reason: `${direction} 대표 움직임은 ${leaders.map((stock) => stock.name).join(", ") || "확인 부족"} 중심입니다.`
      };
    })
    .filter((candidate) => candidate.count >= 3 && (candidate.score >= 58 || Math.abs(candidate.averageChange) >= 1.2))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function buildStockChecklist(stock: Stock): ChecklistItem[] {
  const profile = buildScoreProfile(stock);
  const risk = calculatePreReflectionRisk(stock);
  const attention = calculateMarketAttentionScore(stock);
  const epsTrend = stock.valuationHistory.length
    ? stock.valuationHistory[stock.valuationHistory.length - 1]!.epsConsensus -
      stock.valuationHistory[0]!.epsConsensus
    : stock.epsEstimateGrowthRate;

  return [
    {
      label: "산업 시나리오",
      status: profile.scenarioScore >= 70 ? "통과" : profile.scenarioScore >= 55 ? "확인" : "주의",
      detail: `산업 점수 ${profile.scenarioScore}점. 테마가 현재 구조 변화와 연결되는지 확인합니다.`
    },
    {
      label: "시장 관심도·수급",
      status: attention >= 70 ? "통과" : attention >= 52 ? "확인" : "주의",
      detail: `시장 주도성 ${attention}점. 당일 등락, 중기 추세, 52주 고점 접근도, 거래대금 프록시를 반영합니다.`
    },
    {
      label: "실적 연결성",
      status: profile.earningsLinkScore >= 65 ? "통과" : profile.earningsLinkScore >= 45 ? "확인" : "주의",
      detail: `실적 연결성 ${profile.earningsLinkScore}점. 매출·이익 성장과 마진이 주가 논리를 받치는지 봅니다.`
    },
    {
      label: "밸류 정당화",
      status: profile.valuationJustificationScore >= 62 ? "통과" : profile.valuationJustificationScore >= 42 ? "확인" : "주의",
      detail: `밸류 정당화 ${profile.valuationJustificationScore}점. Forward PER, EPS 상향, 가격 선반영을 비교합니다.`
    },
    {
      label: "선반영 리스크",
      status: risk < 45 ? "통과" : risk < 68 ? "확인" : "주의",
      detail: `선반영 위험 ${risk}점. 고점 추격·200일선 괴리·실적 대비 주가 속도를 점검합니다.`
    },
    {
      label: "컨센서스 방향",
      status: epsTrend > 0 ? "통과" : epsTrend === 0 ? "확인" : "주의",
      detail: epsTrend > 0 ? "EPS 컨센서스 프록시가 우상향입니다." : "EPS 컨센서스가 정체 또는 약화되어 추가 확인이 필요합니다."
    }
  ];
}

export function buildRiskEventCalendar(
  stocks: Stock[],
  issues: Issue[] = fallbackIssues,
  alerts: Alert[] = fallbackAlerts,
  stockIds?: Set<string>
): RiskEvent[] {
  const issueEvents = issues
    .filter((issue) => !stockIds || stockIds.has(issue.stockId))
    .map((issue) => {
      const stock = stocks.find((item) => item.id === issue.stockId);
      return {
        id: issue.id,
        stockId: issue.stockId,
        stockName: stock?.name ?? issue.stockId,
        title: issue.title,
        date: issue.date,
        type: issue.type,
        severity: issue.sentiment === "negative" ? "warning" : issue.sentiment === "positive" ? "success" : "info",
        scope: "종목"
      } satisfies RiskEvent;
    });

  const alertEvents = alerts
    .filter((alert) => !stockIds || stockIds.has(alert.stockId))
    .filter((alert) => !isStaleTargetAlert(alert, stocks.find((item) => item.id === alert.stockId)))
    .map((alert) => {
      const stock = stocks.find((item) => item.id === alert.stockId);
      return {
        id: alert.id,
        stockId: alert.stockId,
        stockName: stock?.name ?? alert.stockId,
        title: alert.title,
        date: alert.createdAt,
        type: alert.condition,
        severity: alert.severity,
        scope: stockIds ? "포트폴리오" : "산업"
      } satisfies RiskEvent;
    });

  return [...alertEvents, ...issueEvents]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 24);
}

export function buildThesisAlerts(
  holdings: PortfolioHolding[],
  stocks: Stock[],
  issues: Issue[] = fallbackIssues,
  alerts: Alert[] = fallbackAlerts
): ThesisAlert[] {
  return holdings.flatMap((holding) => {
    const stock = stocks.find((item) => item.id === holding.stockId);
    if (!stock) return [];

    const profile = buildScoreProfile(stock);
    const matchingIssues = issues.filter((issue) => issue.stockId === holding.stockId);
    const matchingAlerts = alerts.filter((alert) => alert.stockId === holding.stockId && !isStaleTargetAlert(alert, stock));
    const items: ThesisAlert[] = [];

    if (profile.marketAttentionScore < 38 && profile.scenarioScore >= 60) {
      items.push({
        id: `${holding.id}-attention`,
        stockId: holding.stockId,
        title: `${stock.name} 시장 관심 약화`,
        severity: "warning",
        detail: "구조 논리는 남아 있지만 가격·수급 반응이 약해져 보유 논리 재검증이 필요합니다."
      });
    }

    if (profile.preReflectionRiskScore >= 72) {
      items.push({
        id: `${holding.id}-risk`,
        stockId: holding.stockId,
        title: `${stock.name} 선반영 부담 확대`,
        severity: "critical",
        detail: "주가가 실적 검증보다 빠르게 움직인 구간입니다. 비중 확대보다 실적 확인을 우선합니다."
      });
    }

    matchingIssues
      .filter((issue) => issue.thesisImpact.includes("훼손"))
      .forEach((issue) =>
        items.push({
          id: `${holding.id}-${issue.id}`,
          stockId: holding.stockId,
          title: issue.title,
          severity: issue.thesisImpact === "투자 논리 중대 훼손" ? "critical" : "warning",
          detail: issue.description
        })
      );

    matchingAlerts.slice(0, 2).forEach((alert) =>
      items.push({
        id: `${holding.id}-${alert.id}`,
        stockId: holding.stockId,
        title: alert.title,
        severity: alert.severity,
        detail: alert.condition
      })
    );

    return items;
  });
}

export function findAlternativeExposure(theme: Theme, stocks: Stock[], excludeId?: string) {
  return stocks
    .filter((stock) => stock.id !== excludeId && stock.theme === theme && (stock.assetType === "ETF" || stock.market.startsWith("US")))
    .sort((a, b) => buildScoreProfile(b).finalScore - buildScoreProfile(a).finalScore)
    .slice(0, 6);
}

export function getPhaseTone(phase: CyclePhase) {
  if (phase === "주도 확장") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (phase === "관심 회복") return "border-blue-200 bg-blue-50 text-blue-700";
  if (phase === "과열 경계") return "border-red-200 bg-red-50 text-red-700";
  if (phase === "소외") return "border-amber-200 bg-amber-50 text-amber-700";
  if (phase === "약세 전환") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}
