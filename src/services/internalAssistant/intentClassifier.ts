import type { AssistantIntent, IntentClassification } from "./types";

const keywordGroups: Array<{
  intent: AssistantIntent;
  confidence: number;
  keywords: string[];
}> = [
  {
    intent: "ADD_TO_WATCHLIST",
    confidence: 0.92,
    keywords: ["관심종목", "관심", "즐겨찾기", "추가", "담아", "찜", "watch"]
  },
  {
    intent: "REGISTER_ISSUE_MONITORING",
    confidence: 0.92,
    keywords: ["이슈 모니터링", "모니터링", "감시", "추적", "등록", "알림"]
  },
  {
    intent: "SEND_TO_SCREENER",
    confidence: 0.9,
    keywords: ["스크리너", "필터", "검색 조건", "조건으로", "보내", "보여줘"]
  },
  {
    intent: "PORTFOLIO_GAP",
    confidence: 0.88,
    keywords: ["포트", "포트폴리오", "보유", "빈 축", "빠진", "부족", "비중", "과한"]
  },
  {
    intent: "COMPANY_COMPARE",
    confidence: 0.88,
    keywords: ["비교", "vs", "대비", "차이", "어느 쪽", "더 좋아", "더 나아", "둘 중"]
  },
  {
    intent: "FIND_LEADER",
    confidence: 0.86,
    keywords: ["대장주", "주도주", "주도", "리더", "가장 강한", "강한 종목", "매력적인", "상위"]
  },
  {
    intent: "FIND_FOLLOWER",
    confidence: 0.84,
    keywords: ["후발", "후행", "소외", "덜 오른", "따라갈", "관찰", "후발주자"]
  },
  {
    intent: "RISK_CHECK",
    confidence: 0.84,
    keywords: ["과열", "선반영", "리스크", "위험", "부담", "고평가", "주의"]
  },
  {
    intent: "PRICE_TARGET_CHECK",
    confidence: 0.78,
    keywords: ["목표가", "상승여력", "도달", "얼마까지", "타깃", "target"]
  },
  {
    intent: "STOCK_DIAGNOSIS",
    confidence: 0.82,
    keywords: ["괜찮", "어때", "좋아", "진단", "분석", "검토", "지금", "상태", "전망", "매력"]
  },
  {
    intent: "VALUE_CHAIN_QUERY",
    confidence: 0.78,
    keywords: ["밸류체인", "가치사슬", "산업", "수혜", "실수혜", "시나리오", "흐름", "테마", "연계"]
  }
];

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyIntent(input: string): IntentClassification {
  const normalized = normalize(input);
  if (!normalized) {
    return { intent: "UNKNOWN", confidence: 0.1 };
  }

  const matched = keywordGroups
    .map((group) => {
      const hitCount = group.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
      return {
        intent: group.intent,
        confidence: hitCount ? Math.min(0.98, group.confidence + (hitCount - 1) * 0.04) : 0
      };
    })
    .filter((item) => item.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (!matched.length) {
    return { intent: "UNKNOWN", confidence: 0.35 };
  }

  return matched[0];
}
