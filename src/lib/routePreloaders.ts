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

  const primaryRoutes = ["/scenario"];
  const secondaryRoutes = ["/screener", "/value-chain", "/governance", "/briefing", "/portfolio", "/alerts"];
  const tertiaryRoutes = ["/valuation", "/admin-login", "/settings"];

  const preloadWithGap = (routes: string[], startDelayMs: number, gapMs: number) => {
    routes.forEach((route, index) => {
      globalThis.setTimeout(() => preloadRouteForPath(route), startDelayMs + index * gapMs);
    });
  };

  const runPrimary = () => preloadWithGap(primaryRoutes, 0, 0);
  const runSecondary = () => preloadWithGap(secondaryRoutes, 900, 650);
  const runTertiary = () => preloadWithGap(tertiaryRoutes, 5400, 900);

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runPrimary, { timeout: 700 });
    window.requestIdleCallback(runSecondary, { timeout: 2400 });
    window.requestIdleCallback(runTertiary, { timeout: 7000 });
    return;
  }

  globalThis.setTimeout(runPrimary, 700);
  globalThis.setTimeout(runSecondary, 2400);
  globalThis.setTimeout(runTertiary, 7000);
}
