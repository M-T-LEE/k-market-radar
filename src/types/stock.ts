export type Market = "KOSPI" | "KOSDAQ" | "US Large Cap" | "US Growth";

export type Theme =
  | "AI 인프라"
  | "반도체"
  | "데이터센터"
  | "전력"
  | "냉각"
  | "로봇"
  | "방산"
  | "우주항공"
  | "보안"
  | "바이오"
  | "자동차"
  | "2차전지"
  | "조선"
  | "건설"
  | "금융"
  | "인터넷/플랫폼"
  | "엔터/게임"
  | "소비재"
  | "철강/소재"
  | "화학"
  | "에너지"
  | "통신"
  | "유통"
  | "ETF"
  | "지주/복합"
  | "원전"
  | "기계/장비"
  | "항공/운송"
  | "식품"
  | "미디어"
  | "의료기기"
  | "기타";

export type ValuationStatus =
  | "저평가"
  | "적정"
  | "기대 반영"
  | "과열"
  | "버블 위험";

export type FinalDecision =
  | "매수 검토"
  | "조정 대기"
  | "실적 확인 대기"
  | "과열 경고"
  | "테마 노출 검토"
  | "분할 접근"
  | "관망"
  | "상품 구조 확인"
  | "제외";

export type TechnicalSignalKind =
  | "allTimeHighVolume"
  | "allTimeHigh"
  | "fiftyTwoWeekHighVolume"
  | "fiftyTwoWeekHigh"
  | "volumeSurgeEstimate"
  | "priceHighProximity";

export interface StockTechnicalSignal {
  kind: TechnicalSignalKind;
  label: string;
  daysAgo: number;
  strength: number;
  source: "HISTORICAL" | "DERIVED";
  note: string;
}

export interface ValuationPoint {
  date: string;
  price: number;
  epsConsensus: number;
  marker?: "EPS 하향" | "EPS 상향";
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  market: Market;
  exchange?: string;
  cik?: string;
  sector: string;
  theme: Theme;
  marketCap: number;
  currentPrice: number;
  volume?: number;
  assetType?: "COMMON" | "PREFERRED" | "ETF" | "ADR" | "UNKNOWN";
  universeSource?: "NAVER_DELAYED" | "KRX_DAILY" | "FMP" | "STOOQ" | "REFERENCE";
  quoteProvider?:
    | "naverDelayedQuoteProvider"
    | "naverUniverseProvider"
    | "krxDailyProvider"
    | "referenceQuoteProvider"
    | "fmpQuoteProvider"
    | "fmpUniverseProvider"
    | "stooqQuoteProvider";
  quoteSourceLabel?: string;
  quoteUpdatedAt?: string;
  quoteAsOf?: string;
  quoteIsRealtime?: boolean;
  quoteNote?: string;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  threeYearLow: number;
  dailyChange?: number;
  dailyChangeRate?: number;
  priceChange3M: number;
  priceChange6M: number;
  priceChange12M: number;
  ma200Gap: number;
  revenueGrowth3Y: number;
  operatingProfitGrowth3Y: number;
  netIncomeGrowth3Y: number;
  quarterlyRevenueGrowth: number;
  quarterlyOperatingProfitGrowth: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roic: number;
  debtRatio: number;
  fcf: number;
  per: number;
  forwardPer: number;
  pbr: number;
  psr: number;
  evEbitda: number;
  peg: number;
  industryAvgPer: number;
  industryAvgPbr: number;
  industryAvgEvEbitda: number;
  scenarioScore: number;
  valueChainScore: number;
  companyCentralityScore: number;
  earningsLinkScore: number;
  financialStabilityScore: number;
  valuationJustificationScore: number;
  preReflectionRiskScore: number;
  finalScore: number;
  finalDecision: FinalDecision;
  valuationStatus: ValuationStatus;
  currentNetIncome: number;
  targetOperatingMargin: number;
  epsEstimateGrowthRate: number;
  targetPrice: number;
  valuationHistory: ValuationPoint[];
  technicalSignals?: StockTechnicalSignal[];
}
