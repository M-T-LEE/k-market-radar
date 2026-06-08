import type { Stock } from "../../types/stock";
import { getScenarioOptionLabel, resolveScenarioFilterParam, stockMatchesScenario } from "../../lib/scenarioMatching";
import type { AssistantPageContext } from "./types";

const defaultPrompts = [
  "산업 밸류체인 분석",
  "대장주/주도주 찾기",
  "후발주자 찾기",
  "기업 비교",
  "내 포트폴리오 빈 축 분석",
  "과열/선반영 리스크 확인",
  "스크리너로 보내기"
];

const pagePrompts: Record<string, string[]> = {
  "/value-chain": [
    "이 밸류체인 대장주는?",
    "후발주자만 보여줘",
    "실수혜 근거 있는 기업만 남겨줘",
    "스크리너로 보내줘"
  ],
  "/screener": [
    "현재 필터에서 가장 매력적인 종목은?",
    "과열 위험 높은 종목은?",
    "보유종목과 겹치는 종목은?"
  ],
  "/portfolio": [
    "내 포트에서 빠진 산업축은?",
    "비중이 과한 종목은?",
    "이번주 투자논리가 훼손된 종목은?",
    "추가 편입 후보는?"
  ],
  "/alerts": [
    "투자논리 강화 이슈만 보여줘",
    "중대 훼손 이슈만 보여줘",
    "다음주 체크할 종목은?"
  ],
  "/scenario": [
    "오늘 강한 세부산업은?",
    "일반종목과 ETF를 분리해서 보여줘",
    "연계 수혜 밸류체인은?"
  ],
  "/groups": [
    "이 그룹의 핵심 지분 연결은?",
    "전략투자 종목만 보여줘",
    "그룹 내 가격 동조 종목은?"
  ]
};

const routeLabels: Array<[string, string]> = [
  ["/scenario", "산업 시나리오"],
  ["/briefing", "국내 증시 브리핑"],
  ["/value-chain", "밸류체인"],
  ["/groups", "기업진단 보드"],
  ["/screener", "종목 스크리너"],
  ["/portfolio", "보유종목·이슈"],
  ["/alerts", "알림센터"],
  ["/settings", "설정"],
  ["/", "대시보드"]
];

export function getPageQuickPrompts(pathname: string) {
  const route = Object.keys(pagePrompts).find((path) => pathname.startsWith(path));
  return route ? pagePrompts[route] : defaultPrompts;
}

export function getAssistantPageContext(pathname: string, search = ""): AssistantPageContext {
  const pageLabel = routeLabels.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? "대시보드";
  return {
    pageId: pathname || "/",
    pageLabel,
    pathname,
    search,
    quickPrompts: getPageQuickPrompts(pathname)
  };
}

function isAll(value?: string | null) {
  return !value || value === "전체" || value === "?꾩껜" || value.toLowerCase() === "all";
}

export function filterStocksForPage(stocks: Stock[], pathname: string, search = "") {
  const params = new URLSearchParams(search);
  const scenario = params.get("scenario");
  const theme = params.get("theme");
  const market = params.get("market");
  const query = params.get("query") ?? params.get("q");

  return stocks.filter((stock) => {
    if (!isAll(market) && stock.market !== market) return false;

    if (!isAll(scenario)) {
      const resolved = resolveScenarioFilterParam(scenario ?? "") ?? scenario ?? "";
      const label = getScenarioOptionLabel(resolved);
      const stockScenario = String((stock as any).scenarioName ?? "");
      const matches =
        stockScenario === resolved ||
        stockScenario === label ||
        String(stock.theme) === resolved ||
        String(stock.theme) === label ||
        stockMatchesScenario(stock, resolved);
      if (!matches) return false;
    }

    if (!isAll(theme)) {
      const text = `${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme} ${(stock as any).scenarioName ?? ""} ${(stock as any).valueChain ?? ""}`.toLowerCase();
      if (!text.includes(String(theme).toLowerCase())) return false;
    }

    if (query) {
      const text = `${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme} ${(stock as any).scenarioName ?? ""}`.toLowerCase();
      if (!text.includes(query.toLowerCase())) return false;
    }

    return true;
  });
}
