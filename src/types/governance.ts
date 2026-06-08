export type GovernanceNodeType =
  | "OWNER"
  | "HOLDING"
  | "OPERATING"
  | "FINANCE"
  | "UNLISTED"
  | "AFFILIATE"
  | "STRATEGIC";

export type GovernanceRelationType =
  | "지배"
  | "주요지분"
  | "자회사"
  | "순환출자"
  | "전략지분";

export interface GovernanceNode {
  id: string;
  name: string;
  ticker?: string;
  market?: "KOSPI" | "KOSDAQ" | "US" | "비상장" | "기타";
  listed: boolean;
  type: GovernanceNodeType;
  role: string;
  x: number;
  y: number;
  notes?: string[];
}

export interface GovernanceEdge {
  id: string;
  from: string;
  to: string;
  ownershipPercent: number;
  relation: GovernanceRelationType;
  source: "DART" | "FTC" | "COMPANY_IR" | "CURATED";
  asOf: string;
  confidence: "높음" | "보통" | "확인필요";
  note?: string;
}

export interface GovernanceSourceRef {
  label: string;
  url: string;
}

export interface GroupInvestmentRoadmapItem {
  id: string;
  title: string;
  theme: string;
  stage: "핵심 사업" | "성장 투자" | "회수·재편" | "관찰";
  leadingCompanies: string[];
  listedTickers: string[];
  rationale: string;
  watchPoints: string[];
}

export interface BusinessGroup {
  id: string;
  name: string;
  shortName: string;
  description: string;
  asOf: string;
  dataQuality: "공시 기반" | "공시+수작업 보정" | "초기 기준 데이터";
  updateCadence: string;
  updateTriggers: string[];
  sourceRefs: GovernanceSourceRef[];
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  investmentRoadmap: GroupInvestmentRoadmapItem[];
  keyIssues: string[];
  watchSignals: string[];
}
