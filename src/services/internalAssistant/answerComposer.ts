import { scoreAssistantConfidence } from "./confidenceScorer";
import { resolveEntities } from "./entityResolver";
import { classifyIntent } from "./intentClassifier";
import {
  buildActionAnswer,
  buildAssistantReasoning,
  makeIssueMonitoringAction,
  makeWatchlistAction
} from "./reasoningEngine";
import { findStockByEntity } from "./internalKnowledgeSearch";
import type { AssistantContext, AssistantResponse, AssistantScope } from "./types";

const fallbackChoices = [
  "산업 밸류체인 분석",
  "대장주/주도주 찾기",
  "후발주자 찾기",
  "기업 비교",
  "내 포트폴리오 빈 축 분석",
  "과열/선반영 리스크 확인",
  "스크리너로 보내기"
];

function containsAllActionKeywords(input: string) {
  return /관심|즐겨찾기|watchlist/i.test(input) && /이슈|모니터|감시|추적/i.test(input);
}

function resolveShortNameClarification(input: string, context: AssistantContext) {
  const latinToken = input.match(/[A-Za-z]{2,8}/)?.[0]?.toLowerCase();
  if (!latinToken) return [];
  return context.allStocks
    .filter((stock) => stock.name.toLowerCase().includes(latinToken) || stock.ticker.toLowerCase().includes(latinToken))
    .slice(0, 6)
    .map((stock) => ({
      label: stock.name,
      value: stock.name,
      prompt: `${stock.name} 기준으로 ${input}`
    }));
}

export function composeAssistantResponse(input: string, context: AssistantContext, scope: AssistantScope): AssistantResponse {
  const query = input.trim();
  if (!query) {
    return {
      mode: "choices",
      intent: "UNKNOWN",
      confidence: 0,
      query,
      choices: fallbackChoices.map((prompt) => ({ label: prompt, value: prompt, prompt }))
    };
  }

  const classification = classifyIntent(query);
  const resolution = resolveEntities(query, context);
  const hasPageContext = scope === "page" && context.stocks.length !== context.allStocks.length;
  const confidence = scoreAssistantConfidence(classification, resolution, hasPageContext);

  if (resolution.ambiguousEntities.length >= 2 && confidence < 0.8) {
    return {
      mode: "clarify",
      intent: classification.intent,
      confidence,
      query,
      clarification: {
        question: "어떤 대상을 말씀하시는 건가요?",
        options: resolution.ambiguousEntities.slice(0, 6).map((entity) => ({
          label: entity.label,
          value: entity.value,
          entity,
          prompt: `${entity.label} 기준으로 ${query}`
        }))
      }
    };
  }

  if (confidence < 0.5) {
    return {
      mode: "choices",
      intent: "UNKNOWN",
      confidence,
      query,
      choices: fallbackChoices.map((prompt) => ({ label: prompt, value: prompt, prompt }))
    };
  }

  if (classification.intent === "COMPANY_COMPARE" && resolution.entities.filter((entity) => entity.type === "stock").length < 2) {
    const shortNameOptions = resolveShortNameClarification(query, context);
    if (shortNameOptions.length >= 2) {
      return {
        mode: "clarify",
        intent: classification.intent,
        confidence: Math.min(confidence, 0.72),
        query,
        clarification: {
          question: "어떤 계열사 또는 종목을 말씀하시는 건가요?",
          options: shortNameOptions
        }
      };
    }
  }

  if (confidence < 0.8 && classification.intent !== "UNKNOWN") {
    return {
      mode: "clarify",
      intent: classification.intent,
      confidence,
      query,
      clarification: {
        question: "아래 방향 중 어떤 분석으로 진행할까요?",
        options: [
          { label: "현재 화면 기준", value: "page", prompt: `${query} 현재 화면 기준` },
          { label: "전체 데이터 기준", value: "all", prompt: `${query} 전체 데이터 기준` },
          { label: "스크리너로 보내기", value: "screener", prompt: `${query} 스크리너로 보내기` }
        ]
      }
    };
  }

  const primaryEntity = resolution.entities[0];
  if (containsAllActionKeywords(query)) {
    const stock = findStockByEntity(context, primaryEntity);
    if (stock) {
      const watchlistAction = makeWatchlistAction(stock);
      const issueAction = makeIssueMonitoringAction(stock);
      const composite = {
        id: `composite:${stock.id}:watchlist-issue`,
        type: "COMPOSITE_ACTION" as const,
        label: "관심종목 추가 + 이슈 모니터링 등록",
        description: `${stock.name}을 관심종목에 추가하고 투자논리 '${String(stock.theme)} 수혜와 실적 연결성 확인'으로 이슈 모니터링에 등록합니다.`,
        payload: {
          stockId: stock.id,
          stockName: stock.name,
          ticker: stock.ticker,
          thesis: `${String(stock.theme)} 수혜와 실적 연결성 확인`,
          actions: [watchlistAction, issueAction]
        }
      };
      return {
        mode: "confirm",
        intent: "REGISTER_ISSUE_MONITORING",
        confidence,
        query,
        answer: buildActionAnswer(composite),
        pendingAction: composite
      };
    }
  }

  const reasoning = buildAssistantReasoning({
    context,
    scope,
    intent: classification.intent,
    entities: resolution.entities
  });

  return {
    mode: reasoning.pendingAction ? "confirm" : "answer",
    intent: classification.intent,
    confidence,
    query,
    answer: reasoning.answer,
    pendingAction: reasoning.pendingAction
  };
}
