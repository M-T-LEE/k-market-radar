import type { AssistantScope } from "../services/internalAssistant/types";

export interface PageContextSnapshot {
  pathname: string;
  pageLabel: string;
  scope: AssistantScope;
  updatedAt: string;
}

let latestPageContext: PageContextSnapshot | null = null;

export function setPageContextSnapshot(snapshot: PageContextSnapshot) {
  latestPageContext = snapshot;
}

export function getPageContextSnapshot() {
  return latestPageContext;
}
