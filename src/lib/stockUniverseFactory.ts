import { calculateFinalScore, calculatePreReflectionRisk, getFinalDecision } from "./scoring.js";
import type { Market, Stock, Theme, ValuationPoint, ValuationStatus } from "../types/stock.js";

export type UniverseAssetType = "COMMON" | "PREFERRED" | "ETF" | "ADR" | "UNKNOWN";

export interface UniverseQuoteInput {
  name: string;
  ticker: string;
  market: Market;
  exchange?: string;
  cik?: string;
  price: number;
  changeRate: number;
  change?: number;
  volume?: number;
  marketCap: number;
  source: "NAVER_DELAYED" | "KRX_DAILY" | "FMP" | "STOOQ" | "REFERENCE";
  sourceLabel: string;
  updatedAt?: string;
  assetType?: UniverseAssetType;
}

type IndustryProfile = {
  sector: string;
  industryAvgPer: number;
  industryAvgPbr: number;
  industryAvgEvEbitda: number;
  targetOperatingMargin: number;
  scenarioScore: number;
  valueChainScore: number;
  earningsLinkScore: number;
};

const profiles = {
  "AI 인프라": {
    sector: "AI 인프라",
    industryAvgPer: 30,
    industryAvgPbr: 4.8,
    industryAvgEvEbitda: 18,
    targetOperatingMargin: 24,
    scenarioScore: 88,
    valueChainScore: 86,
    earningsLinkScore: 78
  },
  반도체: {
    sector: "반도체",
    industryAvgPer: 22,
    industryAvgPbr: 2.6,
    industryAvgEvEbitda: 11,
    targetOperatingMargin: 22,
    scenarioScore: 86,
    valueChainScore: 88,
    earningsLinkScore: 82
  },
  데이터센터: {
    sector: "데이터센터",
    industryAvgPer: 28,
    industryAvgPbr: 4.2,
    industryAvgEvEbitda: 17,
    targetOperatingMargin: 26,
    scenarioScore: 84,
    valueChainScore: 82,
    earningsLinkScore: 76
  },
  전력: {
    sector: "전력기기",
    industryAvgPer: 18,
    industryAvgPbr: 2.1,
    industryAvgEvEbitda: 10,
    targetOperatingMargin: 12,
    scenarioScore: 82,
    valueChainScore: 84,
    earningsLinkScore: 80
  },
  냉각: {
    sector: "냉각 인프라",
    industryAvgPer: 24,
    industryAvgPbr: 3.4,
    industryAvgEvEbitda: 16,
    targetOperatingMargin: 15,
    scenarioScore: 80,
    valueChainScore: 78,
    earningsLinkScore: 70
  },
  로봇: {
    sector: "로봇",
    industryAvgPer: 28,
    industryAvgPbr: 3,
    industryAvgEvEbitda: 18,
    targetOperatingMargin: 9,
    scenarioScore: 74,
    valueChainScore: 76,
    earningsLinkScore: 58
  },
  방산: {
    sector: "방산",
    industryAvgPer: 20,
    industryAvgPbr: 2,
    industryAvgEvEbitda: 11,
    targetOperatingMargin: 11,
    scenarioScore: 78,
    valueChainScore: 77,
    earningsLinkScore: 76
  },
  우주항공: {
    sector: "우주항공",
    industryAvgPer: 27,
    industryAvgPbr: 3.2,
    industryAvgEvEbitda: 16,
    targetOperatingMargin: 9,
    scenarioScore: 82,
    valueChainScore: 80,
    earningsLinkScore: 66
  },
  보안: {
    sector: "사이버보안",
    industryAvgPer: 34,
    industryAvgPbr: 7,
    industryAvgEvEbitda: 24,
    targetOperatingMargin: 20,
    scenarioScore: 76,
    valueChainScore: 72,
    earningsLinkScore: 72
  },
  바이오: {
    sector: "바이오/제약",
    industryAvgPer: 35,
    industryAvgPbr: 4,
    industryAvgEvEbitda: 22,
    targetOperatingMargin: 18,
    scenarioScore: 70,
    valueChainScore: 68,
    earningsLinkScore: 56
  },
  자동차: {
    sector: "자동차",
    industryAvgPer: 8,
    industryAvgPbr: 0.9,
    industryAvgEvEbitda: 6,
    targetOperatingMargin: 8,
    scenarioScore: 68,
    valueChainScore: 70,
    earningsLinkScore: 76
  },
  "2차전지": {
    sector: "2차전지",
    industryAvgPer: 30,
    industryAvgPbr: 3.5,
    industryAvgEvEbitda: 18,
    targetOperatingMargin: 12,
    scenarioScore: 72,
    valueChainScore: 76,
    earningsLinkScore: 60
  },
  조선: {
    sector: "조선",
    industryAvgPer: 16,
    industryAvgPbr: 1.6,
    industryAvgEvEbitda: 9,
    targetOperatingMargin: 8,
    scenarioScore: 76,
    valueChainScore: 74,
    earningsLinkScore: 78
  },
  건설: {
    sector: "건설",
    industryAvgPer: 9,
    industryAvgPbr: 0.7,
    industryAvgEvEbitda: 7,
    targetOperatingMargin: 6,
    scenarioScore: 58,
    valueChainScore: 60,
    earningsLinkScore: 62
  },
  금융: {
    sector: "금융",
    industryAvgPer: 7,
    industryAvgPbr: 0.6,
    industryAvgEvEbitda: 7,
    targetOperatingMargin: 18,
    scenarioScore: 60,
    valueChainScore: 62,
    earningsLinkScore: 74
  },
  "인터넷/플랫폼": {
    sector: "인터넷/플랫폼",
    industryAvgPer: 24,
    industryAvgPbr: 2.8,
    industryAvgEvEbitda: 14,
    targetOperatingMargin: 18,
    scenarioScore: 68,
    valueChainScore: 70,
    earningsLinkScore: 66
  },
  "엔터/게임": {
    sector: "엔터/게임",
    industryAvgPer: 22,
    industryAvgPbr: 2.4,
    industryAvgEvEbitda: 13,
    targetOperatingMargin: 14,
    scenarioScore: 62,
    valueChainScore: 60,
    earningsLinkScore: 62
  },
  소비재: {
    sector: "소비재",
    industryAvgPer: 17,
    industryAvgPbr: 1.8,
    industryAvgEvEbitda: 10,
    targetOperatingMargin: 11,
    scenarioScore: 58,
    valueChainScore: 58,
    earningsLinkScore: 68
  },
  "철강/소재": {
    sector: "철강/소재",
    industryAvgPer: 11,
    industryAvgPbr: 0.8,
    industryAvgEvEbitda: 7,
    targetOperatingMargin: 8,
    scenarioScore: 60,
    valueChainScore: 64,
    earningsLinkScore: 68
  },
  화학: {
    sector: "화학",
    industryAvgPer: 14,
    industryAvgPbr: 1,
    industryAvgEvEbitda: 8,
    targetOperatingMargin: 7,
    scenarioScore: 58,
    valueChainScore: 62,
    earningsLinkScore: 62
  },
  에너지: {
    sector: "에너지",
    industryAvgPer: 12,
    industryAvgPbr: 1.1,
    industryAvgEvEbitda: 7,
    targetOperatingMargin: 10,
    scenarioScore: 62,
    valueChainScore: 66,
    earningsLinkScore: 70
  },
  통신: {
    sector: "통신",
    industryAvgPer: 10,
    industryAvgPbr: 0.8,
    industryAvgEvEbitda: 6,
    targetOperatingMargin: 12,
    scenarioScore: 56,
    valueChainScore: 58,
    earningsLinkScore: 72
  },
  유통: {
    sector: "유통",
    industryAvgPer: 13,
    industryAvgPbr: 1,
    industryAvgEvEbitda: 8,
    targetOperatingMargin: 5,
    scenarioScore: 54,
    valueChainScore: 56,
    earningsLinkScore: 62
  },
  ETF: {
    sector: "ETF",
    industryAvgPer: 16,
    industryAvgPbr: 1.6,
    industryAvgEvEbitda: 10,
    targetOperatingMargin: 8,
    scenarioScore: 60,
    valueChainScore: 58,
    earningsLinkScore: 58
  },
  "지주/복합": {
    sector: "지주/복합",
    industryAvgPer: 11,
    industryAvgPbr: 0.8,
    industryAvgEvEbitda: 8,
    targetOperatingMargin: 9,
    scenarioScore: 56,
    valueChainScore: 58,
    earningsLinkScore: 64
  },
  원전: {
    sector: "원전",
    industryAvgPer: 18,
    industryAvgPbr: 1.7,
    industryAvgEvEbitda: 10,
    targetOperatingMargin: 8,
    scenarioScore: 78,
    valueChainScore: 76,
    earningsLinkScore: 66
  },
  "기계/장비": {
    sector: "기계/장비",
    industryAvgPer: 17,
    industryAvgPbr: 1.5,
    industryAvgEvEbitda: 10,
    targetOperatingMargin: 9,
    scenarioScore: 66,
    valueChainScore: 68,
    earningsLinkScore: 66
  },
  "항공/운송": {
    sector: "항공/운송",
    industryAvgPer: 13,
    industryAvgPbr: 1.1,
    industryAvgEvEbitda: 8,
    targetOperatingMargin: 7,
    scenarioScore: 58,
    valueChainScore: 58,
    earningsLinkScore: 66
  },
  식품: {
    sector: "식품",
    industryAvgPer: 16,
    industryAvgPbr: 1.5,
    industryAvgEvEbitda: 9,
    targetOperatingMargin: 8,
    scenarioScore: 55,
    valueChainScore: 55,
    earningsLinkScore: 68
  },
  미디어: {
    sector: "미디어",
    industryAvgPer: 18,
    industryAvgPbr: 1.8,
    industryAvgEvEbitda: 11,
    targetOperatingMargin: 10,
    scenarioScore: 58,
    valueChainScore: 56,
    earningsLinkScore: 60
  },
  의료기기: {
    sector: "의료기기",
    industryAvgPer: 28,
    industryAvgPbr: 3,
    industryAvgEvEbitda: 18,
    targetOperatingMargin: 16,
    scenarioScore: 68,
    valueChainScore: 66,
    earningsLinkScore: 64
  },
  기타: {
    sector: "기타",
    industryAvgPer: 15,
    industryAvgPbr: 1.3,
    industryAvgEvEbitda: 9,
    targetOperatingMargin: 8,
    scenarioScore: 54,
    valueChainScore: 54,
    earningsLinkScore: 58
  }
} satisfies Record<Theme, IndustryProfile>;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function variation(seed: number, range: number) {
  return (seed % (range * 2 + 1)) - range;
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toUpperCase()));
}

export function makeStockId(name: string, ticker: string) {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${ascii || "stock"}-${ticker}`.toLowerCase();
}

export function classifyIndustry(input: {
  name: string;
  ticker?: string;
  assetType?: UniverseAssetType;
}): { theme: Theme; sector: string } {
  const name = normalizeName(input.name);
  const isEtf =
    input.assetType === "ETF" ||
    hasAny(name, ["KODEX", "TIGER", "ACE", "RISE", "SOL", "PLUS", "KOSEF", "HANARO", "ARIRANG", "KBSTAR"]);

  const matchTheme = (): Theme => {
    if (hasAny(name, ["반도체", "하이닉스", "삼성전자", "삼성전기", "이수페타시스", "대덕전자", "기판", "MLCC", "한미반도체", "리노공업", "HPSP", "ISC", "DB하이텍", "심텍", "마이크론", "NVDA", "NVIDIA", "AMD", "AVGO", "BROADCOM", "ASML", "TSM", "MU", "AMAT", "LRCX", "KLAC", "QCOM", "TXN"])) return "반도체";
    if (hasAny(name, ["AI", "데이터센터", "서버", "클라우드", "ARISTA", "ANET", "VERTIV", "VRT", "SMCI", "ORACLE", "GOOGLE", "MICROSOFT", "AMAZON"])) return "AI 인프라";
    if (hasAny(name, ["전력", "일렉트릭", "효성중공업", "LS ELECTRIC", "변압", "케이블", "두산에너빌리티"])) return "전력";
    if (hasAny(name, ["원전", "SMR", "두산에너빌리티", "우진", "비에이치아이"])) return "원전";
    if (hasAny(name, ["냉각", "CDU", "액침", "VERTIV"])) return "냉각";
    if (hasAny(name, ["로봇", "로보", "감속기", "서보", "ROBOT", "ISRG"])) return "로봇";
    if (
      hasAny(name, [
        "우주",
        "항공우주",
        "위성",
        "발사체",
        "로켓",
        "쎄트렉",
        "AP위성",
        "컨텍",
        "인텔리안",
        "켄코아",
        "루미르",
        "제노코",
        "나라스페이스",
        "SPACE",
        "AEROSPACE",
        "SATELLITE",
        "ROCKET",
        "RKLB",
        "ROCKET LAB",
        "IRIDIUM",
        "IRDM",
        "AST SPACEMOBILE",
        "ASTS",
        "PLANET",
        "MAXAR",
        "LUNR",
        "INTUITIVE MACHINES"
      ])
    )
      return "우주항공";
    if (hasAny(name, ["방산", "넥스원", "한화에어로", "현대로템", "KAI", "LOCKHEED", "RTX", "NORTHROP"])) return "방산";
    if (hasAny(name, ["보안", "CROWD", "CRWD", "PALOALTO", "PANW", "PALANTIR", "PLTR", "CYBER"])) return "보안";
    if (hasAny(name, ["셀트리온", "바이오", "제약", "HLB", "알테오젠", "유한양행", "한미약품", "삼성바이오", "LILLY", "LLY", "ABBV", "MRK", "JNJ", "THERMO", "TMO", "NVO"])) return "바이오";
    if (hasAny(name, ["현대차", "기아", "모비스", "자동차", "TESLA", "TSLA", "GM", "FORD"])) return "자동차";
    if (hasAny(name, ["에코프로", "LG에너지솔루션", "삼성SDI", "포스코퓨처엠", "엘앤에프", "2차전지", "배터리", "리튬"])) return "2차전지";
    if (hasAny(name, ["조선", "한화오션", "삼성중공업", "현대중공업", "미포조선"])) return "조선";
    if (hasAny(name, ["건설", "DL이앤씨", "GS건설", "현대건설", "HDC현대산업"])) return "건설";
    if (hasAny(name, ["금융", "은행", "증권", "보험", "생명", "화재", "카드", "캐피탈", "메리츠", "미래에셋", "키움", "KB금융", "신한지주", "하나금융", "우리금융", "JPM", "BAC", "VISA", "MASTERCARD", "WELLS"])) return "금융";
    if (hasAny(name, ["NAVER", "카카오", "플랫폼", "META", "NETFLIX", "GOOGL", "GOOG"])) return "인터넷/플랫폼";
    if (hasAny(name, ["하이브", "JYP", "에스엠", "와이지", "크래프톤", "넷마블", "엔씨", "게임", "엔터", "DISNEY"])) return "엔터/게임";
    if (hasAny(name, ["POSCO", "포스코", "현대제철", "고려아연", "풍산", "철강", "소재", "LINDE", "LIN"])) return "철강/소재";
    if (hasAny(name, ["화학", "롯데케미칼", "LG화학", "한화솔루션", "SKC"])) return "화학";
    if (hasAny(name, ["에너지", "정유", "석유", "가스", "EXXON", "XOM", "CHEVRON", "CVX"])) return "에너지";
    if (hasAny(name, ["통신", "SK텔레콤", "KT", "LG유플러스", "VERIZON", "T-MOBILE"])) return "통신";
    if (hasAny(name, ["유통", "쇼핑", "마트", "백화점", "신세계", "롯데쇼핑", "현대백화점", "WALMART", "COSTCO", "AMAZON"])) return "유통";
    if (hasAny(name, ["식품", "농심", "오리온", "CJ제일제당", "삼양식품", "하이트진로", "롯데칠성", "COCA", "PEPSI", "MCDONALD"])) return "식품";
    if (hasAny(name, ["미디어", "광고", "방송", "스튜디오", "콘텐츠"])) return "미디어";
    if (hasAny(name, ["의료기기", "덴티움", "오스템", "클래시스", "ISRG"])) return "의료기기";
    if (hasAny(name, ["기계", "장비", "CAT", "GE"])) return "기계/장비";
    if (hasAny(name, ["항공", "운송", "대한항공", "한진", "UPS", "UBER"])) return "항공/운송";
    if (hasAny(name, ["지주", "홀딩스", "스퀘어", "BRK"])) return "지주/복합";
    return isEtf ? "ETF" : "기타";
  };

  const theme = matchTheme();
  const sector = isEtf && theme !== "ETF" ? `ETF/${profiles[theme].sector}` : profiles[theme].sector;
  return { theme, sector };
}

function makeHistory(price: number, eps: number, seed: number): ValuationPoint[] {
  const dates = ["24.08", "24.09", "24.10", "24.11", "24.12", "25.01", "25.03", "25.05"];
  return dates.map((date, index) => {
    const wave = 0.88 + ((seed + index * 13) % 28) / 100;
    const epsWave = 0.9 + ((seed + index * 7) % 24) / 100;
    return {
      date,
      price: Math.max(1, Math.round(price * wave)),
      epsConsensus: Math.max(1, Math.round(eps * epsWave)),
      marker: index === 6 && seed % 5 === 0 ? "EPS 하향" : undefined
    };
  });
}

function inferValuationStatus(risk: number, forwardPer: number, industryAvgPer: number): ValuationStatus {
  const premium = forwardPer / Math.max(industryAvgPer, 1);
  if (risk >= 82 || premium >= 2.8) return "버블 위험";
  if (risk >= 68 || premium >= 1.9) return "과열";
  if (risk >= 50 || premium >= 1.35) return "기대 반영";
  if (premium <= 0.75) return "저평가";
  return "적정";
}

export function createStockFromUniverseQuote(input: UniverseQuoteInput): Stock {
  const seed = hashString(`${input.name}-${input.ticker}`);
  const { theme, sector } = classifyIndustry(input);
  const profile = profiles[theme];
  const price = Math.max(input.price, 1);
  const dayChange = Number.isFinite(input.changeRate) ? input.changeRate : 0;
  const capBoost = input.marketCap >= 100000 ? 8 : input.marketCap >= 10000 ? 5 : input.marketCap >= 1000 ? 2 : 0;
  const assetPenalty = input.assetType === "ETF" ? -14 : input.assetType === "PREFERRED" ? -7 : 0;
  const thematicPenalty = theme === "기타" ? -14 : theme === "ETF" ? -10 : 0;
  const directMove = clamp(dayChange * 9, -36, 36);
  const momentum = clamp(dayChange * 4 + variation(seed, 12), -35, 70);
  const priceChange3M = clamp(momentum, -40, 90);
  const priceChange6M = clamp(priceChange3M * 1.6 + variation(seed >> 2, 18), -55, 140);
  const priceChange12M = clamp(priceChange6M * 1.7 + variation(seed >> 4, 28), -70, 260);
  const margin = clamp(profile.targetOperatingMargin + variation(seed >> 3, 8), input.assetType === "ETF" ? 1 : -8, 64);
  const netMargin = clamp(margin * 0.72 + variation(seed >> 5, 4), -10, 58);
  const debtRatio = clamp(65 + variation(seed >> 6, 60), 0, 220);
  const growth3Y = clamp(profile.scenarioScore - 58 + variation(seed >> 7, 24), -20, 95);
  const opGrowth = clamp(profile.earningsLinkScore - 48 + variation(seed >> 8, 30), -35, 150);
  const financialStability = clamp(
    82 - debtRatio / 3.2 + Math.max(netMargin, 0) * 0.85 + capBoost + (input.assetType === "ETF" ? 10 : 0) + variation(seed >> 9, 14),
    15,
    98
  );
  const centrality = clamp(
    profile.valueChainScore + capBoost + thematicPenalty + assetPenalty + (input.marketCap >= 500000 ? 9 : 0) + variation(seed >> 10, 20),
    10,
    99
  );
  const scenarioScore = clamp(
    profile.scenarioScore + capBoost + thematicPenalty + directMove * 0.25 + variation(seed >> 11, 16),
    10,
    99
  );
  const valueChainScore = clamp(
    profile.valueChainScore + thematicPenalty + assetPenalty * 0.45 + variation(seed >> 12, 18),
    10,
    99
  );
  const earningsLinkScore = clamp(
    profile.earningsLinkScore + Math.max(margin, 0) * 0.28 + dayChange * 1.35 + assetPenalty * 0.8 + variation(seed >> 13, 20),
    8,
    99
  );
  const per = Math.max(0, profile.industryAvgPer * (0.8 + ((seed % 70) / 100)));
  const forwardPer = Math.max(0, profile.industryAvgPer * (0.7 + (((seed >> 2) % 80) / 100)));
  const pbr = Math.max(0.2, profile.industryAvgPbr * (0.75 + (((seed >> 4) % 60) / 100)));
  const psr = Math.max(0.1, (per * Math.max(netMargin, 2)) / 100);
  const evEbitda = Math.max(0.5, profile.industryAvgEvEbitda * (0.75 + (((seed >> 6) % 55) / 100)));
  const epsGrowth = clamp(opGrowth * 0.55 + dayChange + variation(seed >> 14, 12), -35, 90);
  const valuationJustificationScore = clamp(
    74 -
      Math.max(0, (forwardPer / Math.max(profile.industryAvgPer, 1) - 1) * 42) +
      Math.max(0, epsGrowth) * 0.32 -
      Math.max(0, dayChange) * 1.9 +
      variation(seed >> 22, 13),
    20,
    94
  );
  const currentNetIncome = Math.max(1, input.marketCap / Math.max(per, 1));
  const epsBase = Math.max(1, currentNetIncome / Math.max(1, (input.marketCap / Math.max(price, 1)) || 1));
  const lowFactor = 0.55 + ((seed % 25) / 100);
  const threeYearFactor = 0.25 + ((seed % 30) / 100);
  const highFactor =
    dayChange >= 8
      ? 1.003 + ((seed >> 3) % 4) / 1000
      : dayChange >= 4
        ? 1.012 + ((seed >> 3) % 9) / 1000
        : priceChange3M >= 24
          ? 1.025 + ((seed >> 3) % 18) / 1000
          : 1.08 + ((seed >> 3) % 60) / 100;

  const draft: Stock = {
    id: makeStockId(input.name, input.ticker),
    name: input.name,
    ticker: input.ticker,
    market: input.market,
    exchange: input.exchange,
    cik: input.cik,
    sector,
    theme,
    marketCap: Math.round(input.marketCap),
    currentPrice: price,
    volume: input.volume,
    assetType: input.assetType ?? "UNKNOWN",
    universeSource: input.source,
    quoteProvider:
      input.source === "NAVER_DELAYED"
        ? "naverUniverseProvider"
        : input.source === "KRX_DAILY"
          ? "krxDailyProvider"
        : input.source === "FMP"
          ? "fmpUniverseProvider"
          : input.source === "STOOQ"
            ? "stooqQuoteProvider"
            : "referenceQuoteProvider",
    quoteSourceLabel: input.sourceLabel,
    quoteUpdatedAt: input.updatedAt ?? new Date().toISOString(),
    quoteAsOf: input.updatedAt ?? new Date().toISOString(),
    quoteIsRealtime: false,
    quoteNote: input.source === "NAVER_DELAYED"
      ? "네이버페이증권 지연시세 기반 참고 데이터입니다."
      : input.source === "FMP"
        ? "FMP 참고 시세 기반 미국 핵심 상장사 데이터입니다."
        : "참고 데이터입니다.",
    fiftyTwoWeekLow: Math.max(1, Math.round(price * lowFactor)),
    fiftyTwoWeekHigh: Math.max(price, Math.round(price * highFactor)),
    threeYearLow: Math.max(1, Math.round(price * threeYearFactor)),
    dailyChange: input.change,
    dailyChangeRate: dayChange,
    priceChange3M,
    priceChange6M,
    priceChange12M,
    ma200Gap: clamp(dayChange * 2 + variation(seed >> 15, 28), -45, 85),
    revenueGrowth3Y: growth3Y,
    operatingProfitGrowth3Y: opGrowth,
    netIncomeGrowth3Y: clamp(opGrowth * 0.85 + variation(seed >> 16, 12), -45, 150),
    quarterlyRevenueGrowth: clamp(growth3Y * 0.55 + variation(seed >> 17, 18), -35, 90),
    quarterlyOperatingProfitGrowth: clamp(opGrowth * 0.6 + variation(seed >> 18, 22), -45, 130),
    operatingMargin: margin,
    netMargin,
    roe: clamp(netMargin + variation(seed >> 19, 14), -20, 90),
    roic: clamp(netMargin * 0.8 + variation(seed >> 20, 12), -20, 80),
    debtRatio,
    fcf: Math.round(Math.max(0, currentNetIncome * (0.45 + ((seed >> 21) % 50) / 100))),
    per,
    forwardPer,
    pbr,
    psr,
    evEbitda,
    peg: Math.max(0.2, forwardPer / Math.max(epsGrowth, 5)),
    industryAvgPer: profile.industryAvgPer,
    industryAvgPbr: profile.industryAvgPbr,
    industryAvgEvEbitda: profile.industryAvgEvEbitda,
    scenarioScore,
    valueChainScore,
    companyCentralityScore: centrality,
    earningsLinkScore,
    financialStabilityScore: financialStability,
    valuationJustificationScore,
    preReflectionRiskScore: 0,
    finalScore: 0,
    finalDecision: "실적 확인 대기",
    valuationStatus: "적정",
    currentNetIncome: Math.round(currentNetIncome),
    targetOperatingMargin: profile.targetOperatingMargin,
    epsEstimateGrowthRate: epsGrowth,
    targetPrice: Math.round(price * (1 + Math.max(valuationJustificationScore - 55, -15) / 100)),
    valuationHistory: makeHistory(price, epsBase, seed)
  };

  const risk = calculatePreReflectionRisk(draft);
  const score = calculateFinalScore({ ...draft, preReflectionRiskScore: risk });

  return {
    ...draft,
    preReflectionRiskScore: risk,
    finalScore: score,
    finalDecision: getFinalDecision(score, risk, draft.earningsLinkScore, draft.assetType),
    valuationStatus: inferValuationStatus(risk, draft.forwardPer, draft.industryAvgPer)
  };
}
