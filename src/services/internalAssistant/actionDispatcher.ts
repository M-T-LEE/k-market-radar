import type { AssistantAction, AssistantRuntimeContext } from "./types";

const favoritesKey = "market-cycle-radar:favorites";
const issueMonitoringKey = "market-cycle-radar:issue-monitoring";

type IssueMonitoringRegistration = {
  stockId: string;
  stockName: string;
  thesis: string;
  createdAt: string;
};

const readFavorites = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(favoritesKey) ?? "[]"));
  } catch {
    return new Set<string>();
  }
};

const writeFavorites = (favorites: Set<string>) => {
  localStorage.setItem(favoritesKey, JSON.stringify(Array.from(favorites)));
  window.dispatchEvent(new Event("market-cycle-radar:favorites-updated"));
};

const readIssueMonitoringRegistrations = (): IssueMonitoringRegistration[] => {
  try {
    return JSON.parse(localStorage.getItem(issueMonitoringKey) ?? "[]");
  } catch {
    return [];
  }
};

const writeIssueMonitoringRegistrations = (registrations: IssueMonitoringRegistration[]) => {
  localStorage.setItem(issueMonitoringKey, JSON.stringify(registrations));
  window.dispatchEvent(new Event("market-cycle-radar:issue-monitoring-updated"));
};

const findStock = (context: AssistantRuntimeContext, stockId?: string) =>
  context.allStocks.find((stock) => stock.id === stockId);

export const dispatchAssistantAction = (
  action: AssistantAction,
  context: AssistantRuntimeContext,
): string => {
  if (action.type === "NAVIGATE") {
    if (action.path) window.history.pushState({}, "", action.path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return "요청한 화면으로 이동했습니다.";
  }

  if (action.type === "ADD_TO_WATCHLIST") {
    const stock = findStock(context, action.stockId);
    if (!stock) return "대상 종목을 찾지 못해 관심종목에 추가하지 못했습니다.";

    const favorites = readFavorites();
    favorites.add(stock.id);
    writeFavorites(favorites);
    return `${stock.name}을 관심종목에 추가했습니다.`;
  }

  if (action.type === "REGISTER_ISSUE_MONITORING") {
    const stock = findStock(context, action.stockId);
    if (!stock) return "대상 종목을 찾지 못해 이슈 모니터링에 등록하지 못했습니다.";

    const registrations = readIssueMonitoringRegistrations();
    const exists = registrations.some((item) => item.stockId === stock.id);
    if (!exists) {
      registrations.push({
        stockId: stock.id,
        stockName: stock.name,
        thesis: action.description ?? `${stock.scenarioName ?? stock.theme} 관련 투자논리 모니터링`,
        createdAt: new Date().toISOString(),
      });
      writeIssueMonitoringRegistrations(registrations);
    }

    return `${stock.name} 이슈 모니터링을 등록했습니다.`;
  }

  if (action.type === "COMPOSITE_ACTION") {
    const results = (action.children ?? []).map((child) => dispatchAssistantAction(child, context));
    return results.join(" ");
  }

  return "지원하지 않는 액션입니다.";
};
