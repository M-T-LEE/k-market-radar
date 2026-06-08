export type HoldingDecision =
  | "보유 강화"
  | "보유 유지"
  | "실적 확인 대기"
  | "비중 축소 검토"
  | "경고"
  | "이탈 검토";

export type RiskLevel = "낮음" | "보통" | "높음";

export interface PortfolioHolding {
  id: string;
  stockId: string;
  averagePrice: number;
  quantity: number;
  weight: number;
  buyDate: string;
  investmentThesis: string;
  coreScenario: string;
  coreValueChain: string;
  expectedEarningsPoint: string;
  keyRisks: string;
  addCondition: string;
  reduceCondition: string;
  exitCondition: string;
  currentDecision: HoldingDecision;
  riskLevel: RiskLevel;
  reevaluationScore: {
    scenarioPersistence: number;
    coreCompanyStatus: number;
    earningsLinkChange: number;
    issueImpact: number;
    valuationBurden: number;
    supplyMomentum: number;
    riskChange: number;
  };
}

export type IssueType =
  | "실적 개선"
  | "실적 악화"
  | "수주/계약"
  | "계약 해지"
  | "고객사 확대"
  | "고객사 이탈"
  | "CAPA 증설"
  | "증자/CB/BW"
  | "정책 수혜"
  | "산업 둔화"
  | "경쟁 심화"
  | "가격 인하"
  | "수급 개선"
  | "수급 악화"
  | "단순 뉴스";

export type ThesisImpact =
  | "투자 논리 강화"
  | "투자 논리 유지"
  | "투자 논리 일부 훼손"
  | "투자 논리 중대 훼손"
  | "판단 보류";

export interface Issue {
  id: string;
  stockId: string;
  date: string;
  title: string;
  type: IssueType;
  sentiment: "positive" | "neutral" | "negative";
  impactScore: number;
  thesisImpact: ThesisImpact;
  description: string;
}

export interface Alert {
  id: string;
  stockId: string;
  title: string;
  condition:
    | "실적 쇼크"
    | "컨센서스 하향"
    | "대규모 증자"
    | "전환사채 발행"
    | "주요 계약 해지"
    | "200일선 이탈"
    | "기관/외국인 동시 대량 매도"
    | "기존 투자논리와 반대되는 산업 이슈 발생"
    | "목표가 도달"
    | "과열 경고";
  createdAt: string;
  severity: "info" | "warning" | "critical" | "success";
}
