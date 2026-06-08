import type {
  AssistantEntity,
  AssistantRuntimeContext,
  AssistantSuggestion,
  EntityResolutionResult
} from "./types";

type Candidate = AssistantSuggestion & {
  aliases: string[];
  entity: AssistantEntity;
};

const groupAliases: Record<string, string[]> = {
  lg: ["LG전자", "LG에너지솔루션", "LG이노텍", "LG화학", "LG디스플레이", "LG유플러스", "LG CNS"],
  삼성: ["삼성전자", "삼성전기", "삼성SDI", "삼성바이오로직스", "삼성에스디에스", "삼성생명"],
  sk: ["SK하이닉스", "SK스퀘어", "SK이노베이션", "SK텔레콤", "SKC"],
  현대: ["현대차", "현대모비스", "현대오토에버", "기아", "현대위아"],
  hd: ["HD현대일렉트릭", "HD현대중공업", "HD현대마린엔진"],
  한화: ["한화에어로스페이스", "한화시스템", "한화오션", "한화솔루션"],
  두산: ["두산에너빌리티", "두산로보틱스", "두산퓨얼셀"],
  롯데: ["롯데지주", "롯데케미칼", "롯데쇼핑"],
  카카오: ["카카오", "카카오페이", "카카오뱅크"],
  네이버: ["NAVER"],
  포스코: ["POSCO홀딩스", "포스코퓨처엠", "포스코DX"]
};

function compact(value: string) {
  return value
    .toLowerCase()
    .replace(/[()\[\]{}.,·ㆍ\-_/\s]/g, "")
    .replace(/주식회사|보통주|우선주|홀딩스/g, "")
    .trim();
}

function unique<T>(items: T[], keyGetter: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyGetter(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCandidates(context: AssistantRuntimeContext): Candidate[] {
  const stocks = unique([...context.pageStocks, ...context.allStocks], (stock) => stock.id);
  const stockCandidates: Candidate[] = stocks.map((stock) => {
    const scenarioName = String((stock as any).scenarioName ?? stock.theme ?? stock.sector ?? "");
    const valueChain = String((stock as any).valueChain ?? (stock as any).subIndustry ?? stock.theme ?? "");
    const label = stock.name;
    return {
      id: `stock:${stock.id}`,
      label,
      value: label,
      type: "stock",
      subtitle: `${stock.ticker} · ${stock.market} · ${scenarioName}`,
      aliases: [label, stock.ticker, scenarioName, valueChain].filter(Boolean).map(String),
      entity: {
        type: "stock",
        id: stock.id,
        label,
        ticker: stock.ticker,
        confidence: 0.95
      }
    };
  });

  const scenarioCandidates: Candidate[] = context.scenarios.map((scenario) => ({
    id: `scenario:${scenario.id}`,
    label: scenario.name,
    value: scenario.name,
    type: "scenario",
    subtitle: "산업 시나리오",
    aliases: [scenario.id, scenario.name, scenario.description, ...scenario.coreValueChains].filter(Boolean).map(String),
    entity: {
      type: "scenario",
      id: scenario.id,
      label: scenario.name,
      confidence: 0.82
    }
  }));

  const valueChainCandidates: Candidate[] = context.valueChains.map((chain) => ({
    id: `valueChain:${chain.id}`,
    label: chain.name,
    value: chain.name,
    type: "valueChain",
    subtitle: `${chain.coreTechnology} · ${chain.earningsLinkLevel}`,
    aliases: [chain.id, chain.name, chain.coreTechnology, ...chain.representativeCompanies].filter(Boolean).map(String),
    entity: {
      type: "valueChain",
      id: chain.id,
      label: chain.name,
      confidence: 0.8
    }
  }));

  const themeCandidates: Candidate[] = unique(
    stocks
      .flatMap((stock) => [
        String(stock.theme ?? ""),
        String(stock.sector ?? ""),
        String((stock as any).scenarioName ?? ""),
        String((stock as any).subIndustry ?? "")
      ])
      .filter(Boolean),
    (label) => compact(label)
  ).map((label) => ({
    id: `theme:${compact(label)}`,
    label,
    value: label,
    type: "theme",
    subtitle: "산업/테마",
    aliases: [label],
    entity: {
      type: "theme",
      id: compact(label),
      label,
      confidence: 0.7
    }
  }));

  return [...stockCandidates, ...scenarioCandidates, ...valueChainCandidates, ...themeCandidates];
}

function scoreCandidate(query: string, candidate: Candidate) {
  const queryCompact = compact(query);
  if (!queryCompact) return 0;

  const aliasScores = candidate.aliases.map((alias) => {
    const aliasCompact = compact(alias);
    if (!aliasCompact) return 0;
    if (queryCompact === aliasCompact) return 1;
    if (queryCompact.includes(aliasCompact)) return aliasCompact.length >= 3 ? 0.96 : 0.7;
    if (aliasCompact.includes(queryCompact)) return queryCompact.length >= 2 ? 0.74 : 0.2;
    return 0;
  });

  return Math.max(...aliasScores, 0);
}

function resolveGroupAlias(query: string, candidates: Candidate[]) {
  const queryCompact = compact(query);
  const matchedKey = Object.keys(groupAliases).find((key) => queryCompact === compact(key) || queryCompact.includes(compact(key)));
  if (!matchedKey) return [];

  return groupAliases[matchedKey]
    .map((name) => candidates.find((candidate) => candidate.type === "stock" && compact(candidate.label) === compact(name)))
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .slice(0, 6);
}

export function resolveEntities(input: string, context: AssistantRuntimeContext): EntityResolutionResult {
  const candidates = buildCandidates(context);
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(input, candidate) }))
    .filter((item) => item.score >= 0.35)
    .sort((a, b) => b.score - a.score);

  const exactStocks = scored.filter((item) => item.candidate.type === "stock" && item.score >= 0.92);
  if (exactStocks.length) {
    const best = exactStocks[0];
    return {
      entities: [{ ...best.candidate.entity, confidence: best.score }],
      ambiguousEntities: [],
      suggestions: scored.slice(0, 5).map((item) => item.candidate)
    };
  }

  const groupMatches = resolveGroupAlias(input, candidates);
  if (groupMatches.length > 1) {
    return {
      entities: [],
      ambiguousEntities: groupMatches.map((candidate) => ({
        ...candidate.entity,
        confidence: 0.62
      })),
      suggestions: groupMatches.map((candidate) => candidate)
    };
  }

  return {
    entities: scored.slice(0, 3).map((item) => ({
      ...item.candidate.entity,
      confidence: Math.min(0.95, item.score)
    })),
    ambiguousEntities: scored.filter((item) => item.score >= 0.55 && item.score < 0.9).slice(0, 5).map((item) => ({
      ...item.candidate.entity,
      confidence: item.score
    })),
    suggestions: scored.slice(0, 7).map((item) => item.candidate)
  };
}

export function getAutocompleteSuggestions(input: string, context: AssistantRuntimeContext): AssistantSuggestion[] {
  const query = input.trim();
  if (query.length < 1) return [];

  const candidates = buildCandidates(context);
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(query, candidate) }))
    .filter((item) => item.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((item) => item.candidate);
}
