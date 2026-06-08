import type { Alert, Issue, PortfolioHolding } from "../../types/portfolio";
import type { Scenario, ValueChain } from "../../types/scenario";
import type { Stock } from "../../types/stock";

export type AssistantIntent =
  | "VALUE_CHAIN_QUERY"
  | "COMPANY_COMPARE"
  | "FIND_LEADER"
  | "FIND_FOLLOWER"
  | "PORTFOLIO_GAP"
  | "RISK_CHECK"
  | "PRICE_TARGET_CHECK"
  | "STOCK_DIAGNOSIS"
  | "SEND_TO_SCREENER"
  | "ADD_TO_WATCHLIST"
  | "REGISTER_ISSUE_MONITORING"
  | "UNKNOWN";

export type AssistantScope = "page" | "all";
export type AssistantEntityType = "stock" | "scenario" | "valueChain" | "theme";

export interface AssistantEntity {
  type: AssistantEntityType;
  id: string;
  label: string;
  confidence: number;
  ticker?: string;
}

export type AssistantActionType =
  | "NAVIGATE"
  | "ADD_TO_WATCHLIST"
  | "REGISTER_ISSUE_MONITORING"
  | "COMPOSITE_ACTION";

export interface AssistantAction {
  id: string;
  type: AssistantActionType;
  label: string;
  description?: string;
  stockId?: string;
  stockName?: string;
  ticker?: string;
  path?: string;
  children?: AssistantAction[];
}

export interface AssistantAnswer {
  summary: string;
  judgment: string;
  evidence: string[];
  risks: string[];
  nextActions: string[];
  actions?: AssistantAction[];
}

export interface AssistantClarificationOption {
  label: string;
  value: string;
  prompt?: string;
  entity?: AssistantEntity;
}

export interface AssistantClarification {
  question: string;
  options: AssistantClarificationOption[];
}

export type AssistantResponseMode = "answer" | "clarify" | "choices" | "confirm" | "insufficient";

export interface AssistantResponse {
  mode: AssistantResponseMode;
  intent: AssistantIntent;
  confidence: number;
  query: string;
  answer?: AssistantAnswer;
  clarification?: AssistantClarification;
  choices?: AssistantClarificationOption[];
  pendingAction?: AssistantAction;
}

export interface AssistantPageContext {
  pageId: string;
  pageLabel: string;
  pathname: string;
  search?: string;
  quickPrompts: string[];
}

export interface AssistantRuntimeContext {
  pageContext: AssistantPageContext;
  scope: AssistantScope;
  pageStocks: Stock[];
  allStocks: Stock[];
  scenarios: Scenario[];
  valueChains: ValueChain[];
  issues: Issue[];
  alerts: Alert[];
  favoriteIds: string[];
  holdings: PortfolioHolding[];
  sourceUpdatedAt?: string;
}

export interface AssistantSuggestion {
  id: string;
  label: string;
  value: string;
  type: AssistantEntityType;
  subtitle: string;
}

export interface IntentClassification {
  intent: AssistantIntent;
  confidence: number;
}

export interface EntityResolutionResult {
  entities: AssistantEntity[];
  ambiguousEntities: AssistantEntity[];
  suggestions: AssistantSuggestion[];
}

export interface IssueMonitoringRegistration {
  id: string;
  stockId: string;
  stockName: string;
  ticker?: string;
  thesis: string;
  createdAt: string;
  source: "assistant";
}
