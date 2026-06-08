import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useMarketData } from "../context/MarketDataContext";
import { portfolioHoldings } from "../data/portfolio";
import { scenarios } from "../data/scenarios";
import { valueChains } from "../data/valueChains";
import { filterStocksForPage, getAssistantPageContext } from "../services/internalAssistant/pageContextRegistry";
import type { AssistantRuntimeContext, AssistantScope } from "../services/internalAssistant/types";
import { setPageContextSnapshot } from "../store/pageContextStore";
import type { PortfolioHolding } from "../types/portfolio";

const portfolioStorageKey = "market-cycle-radar:portfolio-holdings";

const readPortfolioHoldings = (): PortfolioHolding[] => {
  try {
    const raw = localStorage.getItem(portfolioStorageKey);
    const parsed = raw ? JSON.parse(raw) : portfolioHoldings;
    return Array.isArray(parsed) ? parsed : portfolioHoldings;
  } catch {
    return portfolioHoldings;
  }
};

export const useAssistantPageContext = (scope: AssistantScope): AssistantRuntimeContext => {
  const location = useLocation();
  const marketData = useMarketData();
  const { favoriteIds } = useFavorites();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => readPortfolioHoldings());

  useEffect(() => {
    const sync = () => setHoldings(readPortfolioHoldings());
    window.addEventListener("storage", sync);
    window.addEventListener("market-cycle-radar:portfolio-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("market-cycle-radar:portfolio-updated", sync);
    };
  }, []);

  const pageContext = useMemo(
    () => getAssistantPageContext(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const pageStocks = useMemo(
    () => filterStocksForPage(marketData.stocks, pageContext),
    [marketData.stocks, pageContext],
  );

  useEffect(() => {
    setPageContextSnapshot({
      pathname: location.pathname,
      pageLabel: pageContext.pageLabel,
      scope,
      updatedAt: new Date().toISOString(),
    });
  }, [location.pathname, pageContext.pageLabel, scope]);

  return useMemo(
    () => ({
      pageContext,
      scope,
      pageStocks: pageStocks.length ? pageStocks : marketData.stocks,
      allStocks: marketData.stocks,
      scenarios,
      valueChains,
      issues: marketData.issues,
      alerts: marketData.alerts,
      favoriteIds,
      holdings,
      sourceUpdatedAt: marketData.generatedAt,
    }),
    [
      favoriteIds,
      holdings,
      marketData.alerts,
      marketData.generatedAt,
      marketData.issues,
      marketData.stocks,
      pageContext,
      pageStocks,
      scope,
    ],
  );
};
