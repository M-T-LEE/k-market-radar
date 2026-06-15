const routePreloaders: Array<[string, () => Promise<unknown>]> = [
  ["/", () => import("../pages/Dashboard")],
  ["/scenario", () => import("../pages/ScenarioMap")],
  ["/briefing", () => import("../pages/MarketBriefing")],
  ["/value-chain", () => import("../pages/ValueChain")],
  ["/governance", () => import("../pages/GroupGovernance")],
  ["/screener", () => import("../pages/Screener")],
  ["/valuation", () => import("../pages/Valuation")],
  ["/portfolio", () => import("../pages/PortfolioMonitor")],
  ["/issues", () => import("../pages/PortfolioMonitor")],
  ["/alerts", () => import("../pages/Alerts")],
  ["/admin-login", () => import("../pages/AdminLogin")],
  ["/settings", () => import("../pages/Settings")]
];

const warmedRoutes = new Set<string>();

function normalizeRoute(path: string) {
  if (path === "/") return "/";
  const match = routePreloaders.find(([route]) => route !== "/" && path.startsWith(route));
  return match?.[0] ?? path;
}

export function preloadRouteForPath(path: string) {
  const route = normalizeRoute(path);
  if (warmedRoutes.has(route)) return;

  const preloader = routePreloaders.find(([candidate]) => candidate === route)?.[1];
  if (!preloader) return;

  warmedRoutes.add(route);
  void preloader().catch(() => {
    warmedRoutes.delete(route);
  });
}

export function preloadLikelyRoutesOnIdle() {
  if (typeof window === "undefined") return;

  const run = () => {
    ["/scenario", "/screener", "/value-chain", "/governance"].forEach(preloadRouteForPath);
  };

  const delay = () => globalThis.setTimeout(run, 700);

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(delay, { timeout: 900 });
    return;
  }

  globalThis.setTimeout(run, 1400);
}
