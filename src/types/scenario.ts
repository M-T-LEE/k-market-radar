import type { Theme } from "./stock";

export interface ScenarioNode {
  id: string;
  label: string;
  theme: Theme;
  description: string;
  x: number;
  y: number;
}

export interface ScenarioEdge {
  from: string;
  to: string;
  strength: "강함" | "중간" | "확산";
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  summary: string[];
  coreValueChains: string[];
  linkedValueChains?: LinkedValueChain[];
}

export interface LinkedValueChain {
  id: string;
  title: string;
  trigger: string;
  effect: string;
  beneficiaryChains: string[];
  stockKeywords: string[];
  timing: "leading" | "coincident" | "lagging";
  sensitivity: "high" | "medium" | "low";
}

export interface ValueChain {
  id: string;
  scenarioId: string;
  name: string;
  coreTechnology: string;
  representativeCompanies: string[];
  centralityScore: number;
  earningsLinkLevel: "매우 높음" | "높음" | "중간" | "낮음";
  comment: string;
  selectedCompany: string;
  reason: string[];
  risks: string[];
  dataUpdatedAt?: string;
  reviewCadence?: "일간" | "주간" | "월간" | "분기";
  updateTriggers?: string[];
  sourceRefs?: Array<{
    label: string;
    url: string;
  }>;
}
