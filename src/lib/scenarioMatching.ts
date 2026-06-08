import { scenarios } from "../data/scenarios";
import { linkedValueChainsByScenarioId } from "../data/linkedValueChains";
import type { Scenario } from "../types/scenario";
import type { Stock } from "../types/stock";

export type ScenarioFilter = "전체" | string;

type ScenarioMatchRule = {
  include: string[];
  excludeNames?: string[];
  exactNames?: string[];
  useAutoKeywords?: boolean;
  useLinkedKeywords?: boolean;
};

const scenarioMatchRules: Record<string, ScenarioMatchRule> = {
  "ai-infra-cycle": {
    exactNames: [
      "삼성전자",
      "SK하이닉스",
      "삼성전기",
      "이수페타시스",
      "대덕전자",
      "한미반도체",
      "리노공업",
      "HPSP",
      "HD현대일렉트릭",
      "효성중공업",
      "LS ELECTRIC",
      "케이엔솔",
      "심텍",
      "아이티엠반도체"
    ],
    include: [
      "HBM",
      "고대역폭",
      "AI반도체",
      "AI 반도체",
      "GPU",
      "NPU",
      "메모리",
      "DRAM",
      "기판",
      "FC-BGA",
      "ABF",
      "패키징",
      "CoWoS",
      "본딩",
      "테스트",
      "MLCC",
      "데이터센터",
      "서버",
      "전력기기",
      "변압기",
      "차단기",
      "전력변환",
      "전선",
      "냉각",
      "액침냉각",
      "CDU",
      "네트워크장비",
      "통신장비",
      "스위치",
      "라우터"
    ],
    excludeNames: [
      "마음AI",
      "셀바스AI",
      "폴라리스AI",
      "SKAI",
      "사피엔스케어",
      "이스트소프트",
      "코난테크놀로지",
      "솔트룩스",
      "브리지텍",
      "플리토",
      "씨이랩",
      "모아데이타"
    ],
    useAutoKeywords: false
  },
  "ai-software-llm-cycle": {
    exactNames: [
      "NAVER",
      "더존비즈온",
      "솔트룩스",
      "마음AI",
      "셀바스AI",
      "폴라리스AI",
      "한글과컴퓨터",
      "이스트소프트",
      "코난테크놀로지",
      "브리지텍",
      "플리토",
      "씨이랩",
      "모아데이타",
      "삼성에스디에스",
      "포스코DX",
      "현대오토에버",
      "가비아",
      "케이아이엔엑스",
      "영림원소프트랩",
      "와이즈넛",
      "데이타솔루션",
      "카페24",
      "커넥트웨이브",
      "NHN KCP",
      "KG이니시스"
    ],
    include: [
      "LLM",
      "생성AI",
      "AI 서비스",
      "AI 소프트웨어",
      "AI 에이전트",
      "AI 검색",
      "AI검색",
      "AI 광고",
      "AI 커머스",
      "판매자 도구",
      "쇼핑 추천",
      "광고 최적화",
      "커머스 전환",
      "클라우드 AI",
      "SaaS",
      "데이터 플랫폼",
      "RAG",
      "벡터",
      "업무자동화",
      "구독"
    ],
    excludeNames: ["SK하이닉스", "삼성전기", "한미반도체", "리노공업", "HPSP", "이수페타시스"],
    useAutoKeywords: false
  },
  "physical-ai-robotics-cycle": {
    exactNames: [
      "레인보우로보틱스",
      "두산로보틱스",
      "로보티즈",
      "에스피지",
      "하이젠알앤엠",
      "로보스타",
      "현대차",
      "현대모비스"
    ],
    include: [
      "피지컬AI",
      "피지컬 AI",
      "휴머노이드",
      "보스턴 다이내믹스",
      "보스턴다이내믹스",
      "로봇 플랫폼",
      "액추에이터",
      "감속기",
      "서보",
      "머신비전",
      "협동로봇",
      "자율주행로봇",
      "물류로봇"
    ],
    excludeNames: ["현대로템", "LIG넥스원", "한화에어로스페이스", "한화시스템", "한국항공우주"],
    useAutoKeywords: false,
    useLinkedKeywords: false
  },
  "on-device-ai-edge-cycle": {
    exactNames: ["제주반도체", "텔레칩스", "칩스앤미디어", "리노공업", "LG이노텍", "삼성전자", "가온칩스"],
    include: [
      "온디바이스",
      "엣지AI",
      "엣지 AI",
      "NPU",
      "AI PC",
      "AI폰",
      "모바일 AP",
      "저전력",
      "이미지센서",
      "카메라모듈",
      "센서",
      "차량용 반도체",
      "SDV",
      "ADAS"
    ],
    useAutoKeywords: false
  },
  "ai-security-data-cycle": {
    exactNames: ["안랩", "지니언스", "라온시큐어", "샌즈랩", "윈스", "파수", "Palo Alto Networks", "CrowdStrike"],
    include: [
      "보안",
      "사이버",
      "제로트러스트",
      "인증",
      "클라우드 보안",
      "EDR",
      "XDR",
      "데이터보안",
      "개인정보",
      "데이터 거버넌스",
      "관측성",
      "보안관제"
    ],
    useAutoKeywords: false
  },
  "semiconductor-supply-chain-cycle": {
    exactNames: [
      "삼성전자",
      "SK하이닉스",
      "DB하이텍",
      "원익IPS",
      "주성엔지니어링",
      "유진테크",
      "리노공업",
      "한미반도체",
      "솔브레인",
      "동진쎄미켐",
      "ISC",
      "대덕전자",
      "심텍"
    ],
    include: [
      "반도체",
      "메모리",
      "파운드리",
      "팹리스",
      "장비",
      "소재",
      "부품",
      "테스트",
      "소켓",
      "프로브",
      "포토레지스트",
      "쿼츠",
      "세정",
      "식각",
      "증착"
    ]
  },
  "auto-sdv-mobility-cycle": {
    exactNames: ["현대차", "기아", "현대모비스", "현대오토에버", "HL만도", "LG이노텍", "텔레칩스"],
    include: ["자동차", "SDV", "전장", "ADAS", "자율주행", "하이브리드", "전동화", "모터", "인버터", "차량용"]
  },
  "consumer-kculture-cycle": {
    include: ["화장품", "식품", "엔터", "게임", "미디어", "콘텐츠", "유통", "K-푸드", "K뷰티", "ODM", "브랜드", "라면"]
  },
  "defense-export-cycle": {
    include: ["방산", "유도무기", "미사일", "지상무기", "항공엔진", "방산전자", "정찰", "KAI", "한화에어로", "LIG넥스원", "현대로템"]
  },
  "space-economy-cycle": {
    include: ["우주", "항공", "위성", "발사체", "탑재체", "지상국", "안테나", "관측", "SAR", "컨텍", "AP위성", "쎄트렉아이", "인텔리안", "한국항공우주"]
  },
  "bio-platform-cycle": {
    include: ["바이오", "제약", "CDMO", "바이오시밀러", "ADC", "항체", "비만", "대사", "의료기기", "진단", "신약", "셀트리온", "삼성바이오"]
  },
  "shipbuilding-supercycle": {
    include: ["조선", "LNG선", "선박", "선박엔진", "기자재", "해양플랜트", "후판", "HD한국조선해양", "한화오션", "삼성중공업", "HD현대미포"]
  },
  "energy-grid-cycle": {
    include: ["전력", "변압기", "차단기", "전선", "케이블", "원전", "SMR", "전력망", "배전", "송전", "HD현대일렉트릭", "효성중공업", "LS ELECTRIC"]
  },
  "battery-mobility-cycle": {
    include: ["2차전지", "배터리", "전기차", "양극재", "음극재", "분리막", "전해액", "ESS", "재활용", "LG에너지솔루션", "삼성SDI", "에코프로"]
  },
  "robot-automation-cycle": {
    exactNames: [
      "레인보우로보틱스",
      "두산로보틱스",
      "로보티즈",
      "로보스타",
      "에스피지",
      "하이젠알앤엠",
      "고영",
      "뷰웍스",
      "라온피플",
      "뉴로메카"
    ],
    include: ["자동화", "액추에이터", "감속기", "서보", "머신비전", "스마트팩토리", "협동로봇", "물류로봇", "제조 로봇"],
    excludeNames: ["현대로템", "LIG넥스원", "한화에어로스페이스", "한화시스템", "한국항공우주"],
    useAutoKeywords: false,
    useLinkedKeywords: false
  },
  "construction-infra-cycle": {
    include: ["건설", "토목", "건자재", "시멘트", "건설기계", "플랜트", "인프라", "현대건설", "대우건설", "GS건설"]
  },
  "finance-shareholder-cycle": {
    include: ["은행", "보험", "증권", "금융", "지주", "배당", "자사주", "KB금융", "신한지주", "삼성생명"]
  },
  "internet-platform-ai-cycle": {
    include: ["인터넷", "플랫폼", "검색", "광고", "커머스", "클라우드", "콘텐츠", "구독", "NAVER", "카카오"]
  },
  "energy-commodity-cycle": {
    include: ["에너지", "정유", "가스", "화학", "철강", "비철", "원자재", "석유", "S-Oil", "SK이노베이션", "POSCO"]
  }
};

export function normalizeScenarioText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getStockScenarioText(stock: Pick<Stock, "name" | "ticker" | "sector" | "theme">) {
  return normalizeScenarioText(`${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme}`);
}

function textIncludesKeyword(text: string, keyword: string) {
  return text.includes(normalizeScenarioText(keyword));
}

export function getScenarioOptionLabel(option: ScenarioFilter) {
  if (option === "전체") return "전체";
  return scenarios.find((scenario) => scenario.id === option)?.name ?? option;
}

export function resolveScenarioFilterParam(value: string | null): ScenarioFilter {
  if (!value) return "전체";
  const normalized = normalizeScenarioText(value);
  const direct = scenarios.find((scenario) => scenario.id === value || normalizeScenarioText(scenario.name) === normalized);
  if (direct) return direct.id;

  const related = scenarios.find((scenario) => {
    const coreMatch = scenario.coreValueChains.some((chain) => normalizeScenarioText(chain) === normalized);
    const nodeMatch = scenario.nodes.some(
      (node) => normalizeScenarioText(node.label) === normalized || normalizeScenarioText(node.theme) === normalized
    );
    return coreMatch || nodeMatch;
  });

  return related?.id ?? "전체";
}

function getScenarioAutoKeywords(scenario: Scenario) {
  const genericTerms = new Set(["AI", "발전", "수요", "확장", "사이클", "산업", "플랫폼", "서비스"]);
  const sourceTerms = [
    ...scenario.coreValueChains,
    ...scenario.nodes.flatMap((node) => [node.label, node.theme, node.description]),
    ...getLinkedChainKeywords(scenario)
  ];

  return sourceTerms
    .flatMap((term) => term.split(/[,\s/·ㆍ()]+/g))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !genericTerms.has(term));
}

function getLinkedChainKeywords(scenario: Scenario) {
  const linkedChains = scenario.linkedValueChains ?? linkedValueChainsByScenarioId[scenario.id] ?? [];

  return linkedChains.flatMap((chain) => [...chain.beneficiaryChains, ...chain.stockKeywords]);
}

export function stockMatchesScenario(stock: Stock, scenario: Scenario) {
  const text = getStockScenarioText(stock);
  const rule = scenarioMatchRules[scenario.id];

  if (rule?.excludeNames?.some((name) => normalizeScenarioText(stock.name) === normalizeScenarioText(name))) {
    return false;
  }

  if (rule?.exactNames?.some((keyword) => textIncludesKeyword(text, keyword))) {
    return true;
  }

  if (rule?.include.some((keyword) => textIncludesKeyword(text, keyword))) {
    return true;
  }

  if (rule?.useLinkedKeywords !== false && getLinkedChainKeywords(scenario).some((keyword) => textIncludesKeyword(text, keyword))) {
    return true;
  }

  if (rule?.useAutoKeywords === false) {
    return false;
  }

  return getScenarioAutoKeywords(scenario).some((keyword) => textIncludesKeyword(text, keyword));
}

export function getMatchedScenarios(stock: Stock) {
  return scenarios.filter((scenario) => stockMatchesScenario(stock, scenario));
}

export function getScenarioStocks(scenario: Scenario, stocks: Stock[]) {
  return stocks.filter((stock) => stockMatchesScenario(stock, scenario));
}

export function getScenarioSearchText(stock: Stock, matchedScenarios: Scenario[]) {
  return [
    stock.name,
    stock.ticker,
    stock.sector,
    stock.theme,
    ...matchedScenarios.map((scenario) => scenario.name),
    ...matchedScenarios.flatMap((scenario) => scenario.coreValueChains),
    ...matchedScenarios.flatMap((scenario) =>
      (scenario.linkedValueChains ?? linkedValueChainsByScenarioId[scenario.id] ?? []).flatMap((chain) => [
        ...chain.beneficiaryChains,
        ...chain.stockKeywords
      ])
    )
  ]
    .join(" ")
    .toLowerCase();
}
