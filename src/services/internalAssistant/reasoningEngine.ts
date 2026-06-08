import { formatNumber, formatPercent } from "../../lib/formatters";
import { buildScoreProfile } from "../../lib/scoring";
import type { Stock } from "../../types/stock";
import {
  findStockByEntity,
  getFollowerStocks,
  getIssuesForStock,
  getLeaderStocks,
  getPortfolioGaps,
  getPortfolioHoldings,
  getRiskStocks,
  getValueChainEvidence
} from "./internalKnowledgeSearch";
import type {
  AssistantAction,
  AssistantAnswer,
  AssistantContext,
  AssistantEntity,
  AssistantIntent,
  AssistantScope
} from "./types";

function stockLine(stock: Stock) {
  const profile = buildScoreProfile(stock);
  const change = stock.dailyChangeRate ?? stock.priceChange3M;
  return `${stock.name}(${stock.ticker}) · 종합 ${Math.round(profile.finalScore)}점 · 시장주도성 ${Math.round(
    profile.marketAttentionScore
  )}점 · ${formatPercent(change)}`;
}

export function makeScreenerAction(entity?: AssistantEntity, label = "스크리너로 보내기"): AssistantAction {
  const params = new URLSearchParams();
  if (entity?.type === "theme" || entity?.type === "valueChain") params.set("theme", entity.value);
  if (entity?.type === "stock") params.set("query", entity.value);
  return {
    id: `navigate-screener:${entity?.id ?? "all"}`,
    type: "NAVIGATE_SCREENER",
    label,
    description: "현재 조건을 종목 스크리너 화면에서 확인합니다.",
    payload: {
      theme: entity?.type === "theme" || entity?.type === "valueChain" ? entity.value : undefined,
      stockName: entity?.type === "stock" ? entity.label : undefined,
      path: params.toString() ? `/screener?${params.toString()}` : "/screener"
    }
  };
}

export function makeWatchlistAction(stock: Stock): AssistantAction {
  return {
    id: `watchlist:${stock.id}`,
    type: "ADD_TO_WATCHLIST",
    label: "관심종목 추가",
    description: `${stock.name}을 관심종목에 추가합니다.`,
    payload: {
      stockId: stock.id,
      stockName: stock.name,
      ticker: stock.ticker
    }
  };
}

export function makeIssueMonitoringAction(stock: Stock): AssistantAction {
  return {
    id: `issue-monitoring:${stock.id}`,
    type: "REGISTER_ISSUE_MONITORING",
    label: "이슈 모니터링 등록",
    description: `${stock.name}의 투자논리 훼손/강화 이슈를 추적합니다.`,
    payload: {
      stockId: stock.id,
      stockName: stock.name,
      ticker: stock.ticker,
      thesis: `${String(stock.theme)} 수혜와 실적 연결성 확인`
    }
  };
}

function insufficientAnswer(topic: string): AssistantAnswer {
  return {
    summary: `${topic} 판단을 위한 내부 근거가 부족합니다.`,
    judgment: "현재 K-Market Radar 내부 데이터만으로는 단정하지 않습니다.",
    evidence: ["사용 가능한 내부 데이터에 가격, 점수, 일부 이슈는 있으나 필요한 항목이 모두 채워지지 않았습니다."],
    risks: ["수주 정보, 최근 이슈, 시장 반응, 실적 연결성, 가격 위치가 부족하면 판단 오류가 커질 수 있습니다."],
    nextActions: ["스크리너 조건을 좁히거나 특정 종목/산업을 지정해 다시 질문해 주세요."]
  };
}

function buildLeaderAnswer(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity): AssistantAnswer {
  const leaders = getLeaderStocks(context, scope, entity, 5);
  if (!leaders.length) return insufficientAnswer("주도주");

  const top = leaders[0];
  return {
    summary: `${entity?.label ?? context.pageLabel} 기준 내부 데이터상 선두 후보는 ${top.stock.name}입니다.`,
    judgment: "시장주도성, 종합점수, 실적 연결성을 함께 봤을 때 상위권입니다. 매수 추천이 아니라 검토 우선순위입니다.",
    evidence: leaders.slice(0, 3).map(({ stock }) => stockLine(stock)),
    risks: [
      `선반영 위험 ${Math.round(top.profile.preReflectionRiskScore)}점으로 과열 여부를 별도 확인해야 합니다.`,
      "뉴스/공시가 내부 데이터에 아직 반영되지 않았을 수 있습니다."
    ],
    nextActions: ["상위 후보를 스크리너로 보내 세부 필터와 가격 위치를 확인하세요."],
    actions: [makeScreenerAction(entity)]
  };
}

function buildFollowerAnswer(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity): AssistantAnswer {
  const followers = getFollowerStocks(context, scope, entity, 5);
  if (!followers.length) return insufficientAnswer("후발주자");

  return {
    summary: "구조는 있으나 시장 반응이 약한 후행 관찰 후보입니다.",
    judgment: "바로 강한 종목이라기보다 수급과 실적 확인이 붙을 때 재평가될 수 있는 후보군입니다.",
    evidence: followers.slice(0, 4).map(({ stock, profile }) => `${stock.name} · 구조 ${Math.round(profile.structuralCompositeScore)}점 · 시장주도성 ${Math.round(profile.marketAttentionScore)}점`),
    risks: ["소외가 길어지면 기회비용이 커질 수 있습니다.", "시장 반응이 없는 구조점수는 단독 투자 근거가 아닙니다."],
    nextActions: ["후행 관찰 리스트로 두고 거래대금/신고가 추정 신호가 붙는지 확인하세요."],
    actions: [makeScreenerAction(entity, "후발 후보를 스크리너로 보기")]
  };
}

function buildRiskAnswer(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity): AssistantAnswer {
  const risks = getRiskStocks(context, scope, entity, 5);
  if (!risks.length) return insufficientAnswer("과열/선반영 리스크");

  return {
    summary: "선반영 위험이 높은 종목을 우선 추렸습니다.",
    judgment: "가격이 실적 기대보다 앞서간 구간일 수 있어 신규 접근 전 실적 확인이 필요합니다.",
    evidence: risks
      .slice(0, 4)
      .map(({ stock, profile }) => `${stock.name} · 선반영 위험 ${Math.round(profile.preReflectionRiskScore)}점 · 12개월 변화 ${formatPercent(stock.priceChange12M)}`),
    risks: ["강한 주도주는 과열 점수가 높아도 추가 상승할 수 있으므로 매도 신호로 단정하지 않습니다."],
    nextActions: ["밸류에이션 화면에서 EPS 동행률과 필요 성장 배수를 확인하세요."]
  };
}

function buildPortfolioGapAnswer(context: AssistantContext): AssistantAnswer {
  const holdings = getPortfolioHoldings(context);
  if (!holdings.length) return insufficientAnswer("포트폴리오 빈 축");

  const gaps = getPortfolioGaps(context);
  return {
    summary: "현재 보유종목 기준으로 비어 있는 산업축을 추렸습니다.",
    judgment: "보유 산업과 겹치지 않으면서 내부 점수 평균이 높은 테마를 우선 표시합니다.",
    evidence: gaps.map((gap) => `${gap.theme} · 평균 ${gap.averageScore}점 · 관련 ${gap.count}개 · 대표 ${gap.leader?.name ?? "없음"}`),
    risks: ["빈 축을 채우는 것이 항상 좋은 것은 아니며, 보유 목적과 현금 비중을 함께 봐야 합니다."],
    nextActions: ["빈 산업축 중 하나를 골라 대장주/후발주자를 다시 물어보세요."],
    actions: gaps[0] ? [makeScreenerAction({ type: "theme", id: gaps[0].theme, label: gaps[0].theme, value: gaps[0].theme, confidence: 1 })] : undefined
  };
}

function buildValueChainAnswer(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity): AssistantAnswer {
  const chains = getValueChainEvidence(context, entity);
  const leaders = getLeaderStocks(context, scope, entity, 3);
  if (!chains.length && !leaders.length) return insufficientAnswer("밸류체인");

  return {
    summary: `${entity?.label ?? "주요 산업"} 밸류체인을 내부 데이터로 요약했습니다.`,
    judgment: "구조적 병목과 실제 시장 반응을 분리해서 봐야 합니다. 구조가 좋아도 시장 반응이 약하면 후행 관찰입니다.",
    evidence: [
      ...chains.slice(0, 3).map((chain) => `${chain.name} · 핵심기술: ${chain.coreTechnology} · 대표: ${chain.representativeCompanies.slice(0, 3).join(", ")}`),
      ...leaders.slice(0, 2).map(({ stock }) => `관련 후보: ${stockLine(stock)}`)
    ],
    risks: ["대표기업 리스트는 내부 데이터 기준이며, 최신 수주/공시 반영 시 바뀔 수 있습니다."],
    nextActions: ["밸류체인 행을 열어 기업별 실수혜 근거와 리스크를 확인하세요."],
    actions: [makeScreenerAction(entity)]
  };
}

function buildCompareAnswer(context: AssistantContext, entities: AssistantEntity[]): AssistantAnswer {
  const stocks = entities.map((entity) => findStockByEntity(context, entity)).filter((stock): stock is Stock => Boolean(stock));
  if (stocks.length < 2) return insufficientAnswer("기업 비교");

  const ranked = stocks
    .map((stock) => ({ stock, profile: buildScoreProfile(stock) }))
    .sort((a, b) => b.profile.finalScore - a.profile.finalScore);

  return {
    summary: `${ranked.map(({ stock }) => stock.name).join(" vs ")} 비교입니다.`,
    judgment: `내부 종합점수 기준 우위는 ${ranked[0].stock.name}입니다. 다만 점수는 투자 판단 보조 지표입니다.`,
    evidence: ranked.map(({ stock, profile }) => `${stock.name} · 종합 ${Math.round(profile.finalScore)}점 · 시장 ${Math.round(profile.marketAttentionScore)}점 · 실적 ${Math.round(profile.earningsLinkScore)}점 · 선반영 ${Math.round(profile.preReflectionRiskScore)}점`),
    risks: ["비교 대상의 산업이 다르면 점수만으로 우열을 단정하기 어렵습니다."],
    nextActions: ["같은 산업 내 비교인지, 포트폴리오 편입 목적 비교인지 범위를 좁혀 확인하세요."]
  };
}

function buildPriceTargetAnswer(context: AssistantContext, entity?: AssistantEntity): AssistantAnswer {
  const stock = findStockByEntity(context, entity);
  if (!stock) return insufficientAnswer("목표가");
  const gap = ((stock.targetPrice - stock.currentPrice) / Math.max(stock.currentPrice, 1)) * 100;
  return {
    summary: `${stock.name}의 내부 목표가 대비 위치입니다.`,
    judgment: `현재가 대비 목표가 괴리는 ${formatPercent(gap)}입니다. 외부 리포트 목표가가 아니라 내부 데이터 필드 기준입니다.`,
    evidence: [
      `현재가 ${formatNumber(stock.currentPrice)} · 목표가 ${formatNumber(stock.targetPrice)}`,
      `EPS 추정 성장률 ${formatPercent(stock.epsEstimateGrowthRate)} · 선반영 위험 ${Math.round(buildScoreProfile(stock).preReflectionRiskScore)}점`
    ],
    risks: ["목표가는 최신 리포트/공시와 다를 수 있어 단독 근거로 쓰면 안 됩니다."],
    nextActions: ["밸류에이션 화면에서 EPS 컨센서스와 주가 정당화율을 확인하세요."]
  };
}

export function buildActionAnswer(action: AssistantAction): AssistantAnswer {
  return {
    summary: `${action.label} 실행 전 확인이 필요합니다.`,
    judgment: "자연어 입력만으로는 액션을 바로 실행하지 않습니다.",
    evidence: [action.description],
    risks: ["의도와 다른 종목이 선택되었는지 확인해야 합니다."],
    nextActions: ["아래 확인 버튼을 눌러 실행하거나 취소하세요."],
    actions: [action]
  };
}

export function buildAssistantReasoning({
  context,
  scope,
  intent,
  entities
}: {
  context: AssistantContext;
  scope: AssistantScope;
  intent: AssistantIntent;
  entities: AssistantEntity[];
}): { answer: AssistantAnswer; pendingAction?: AssistantAction } {
  const primary = entities[0];

  if (intent === "FIND_LEADER") return { answer: buildLeaderAnswer(context, scope, primary) };
  if (intent === "FIND_FOLLOWER") return { answer: buildFollowerAnswer(context, scope, primary) };
  if (intent === "RISK_CHECK") return { answer: buildRiskAnswer(context, scope, primary) };
  if (intent === "PORTFOLIO_GAP") return { answer: buildPortfolioGapAnswer(context) };
  if (intent === "VALUE_CHAIN_QUERY") return { answer: buildValueChainAnswer(context, scope, primary) };
  if (intent === "COMPANY_COMPARE") return { answer: buildCompareAnswer(context, entities) };
  if (intent === "PRICE_TARGET_CHECK") return { answer: buildPriceTargetAnswer(context, primary) };

  if (intent === "SEND_TO_SCREENER") {
    const action = makeScreenerAction(primary);
    return { answer: buildActionAnswer(action), pendingAction: action };
  }

  if (intent === "ADD_TO_WATCHLIST") {
    const stock = findStockByEntity(context, primary);
    if (!stock) return { answer: insufficientAnswer("관심종목 추가") };
    const action = makeWatchlistAction(stock);
    return { answer: buildActionAnswer(action), pendingAction: action };
  }

  if (intent === "REGISTER_ISSUE_MONITORING") {
    const stock = findStockByEntity(context, primary);
    if (!stock) return { answer: insufficientAnswer("이슈 모니터링 등록") };
    const action = makeIssueMonitoringAction(stock);
    return { answer: buildActionAnswer(action), pendingAction: action };
  }

  const stock = findStockByEntity(context, primary);
  if (stock) {
    const issues = getIssuesForStock(context, stock);
    const profile = buildScoreProfile(stock);
    return {
      answer: {
        summary: `${stock.name}의 내부 데이터 요약입니다.`,
        judgment: `종합 ${Math.round(profile.finalScore)}점, 시장주도성 ${Math.round(profile.marketAttentionScore)}점 기준으로 검토할 수 있습니다.`,
        evidence: [
          stockLine(stock),
          `최근 내부 이슈 ${issues.length}건`,
          `테마 ${String(stock.theme)} · 섹터 ${stock.sector}`
        ],
        risks: [`선반영 위험 ${Math.round(profile.preReflectionRiskScore)}점`, "내부 데이터에 없는 최신 사실은 답변하지 않습니다."],
        nextActions: ["대장주 비교, 과열 리스크, 관심종목 추가 중 하나를 선택해 이어갈 수 있습니다."],
        actions: [makeWatchlistAction(stock), makeIssueMonitoringAction(stock)]
      }
    };
  }

  return { answer: insufficientAnswer("질문") };
}
