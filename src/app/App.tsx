import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import { MarketDataProvider } from "../context/MarketDataContext";
import { ThemeProvider } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { preloadLikelyRoutesOnIdle } from "../lib/routePreloaders";

const AdminLogin = lazy(() => import("../pages/AdminLogin"));
const Alerts = lazy(() => import("../pages/Alerts"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const GroupGovernance = lazy(() => import("../pages/GroupGovernance"));
const MarketBriefing = lazy(() => import("../pages/MarketBriefing"));
const PortfolioMonitor = lazy(() => import("../pages/PortfolioMonitor"));
const ScenarioMap = lazy(() => import("../pages/ScenarioMap"));
const Screener = lazy(() => import("../pages/Screener"));
const Settings = lazy(() => import("../pages/Settings"));
const Valuation = lazy(() => import("../pages/Valuation"));
const ValueChain = lazy(() => import("../pages/ValueChain"));
const MobileLayout = lazy(() =>
  import("../components/mobile/MobileLayout").then((module) => ({ default: module.MobileLayout }))
);

function PageFallback() {
  return (
    <section className="rounded-lg border border-radar-line bg-white p-6 text-sm font-bold text-slate-600 shadow-card dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      화면을 준비하고 있습니다.
    </section>
  );
}

function ProtectedSettingsRoute() {
  const { isAdmin, status } = useAdminAuth();

  if (status === "checking") {
    return (
      <section className="rounded-lg border border-radar-line bg-white p-6 text-sm font-bold text-slate-600 shadow-card dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        관리자 세션을 확인하고 있습니다.
      </section>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin-login?next=/settings" replace />;
  }

  return <Settings />;
}

function DesktopLayout() {
  useEffect(() => {
    preloadLikelyRoutesOnIdle();
  }, []);

  return (
    <div className="min-h-screen bg-radar-bg dark:bg-navy-950">
      <Sidebar />
      <div className="min-h-screen pl-[280px]">
        <TopBar />
        <main className="px-8 py-6">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scenario" element={<ScenarioMap />} />
              <Route path="/briefing" element={<MarketBriefing />} />
              <Route path="/value-chain" element={<ValueChain />} />
              <Route path="/governance" element={<GroupGovernance />} />
              <Route path="/screener" element={<Screener />} />
              <Route path="/valuation" element={<Valuation />} />
              <Route path="/portfolio" element={<PortfolioMonitor />} />
              <Route path="/issues" element={<PortfolioMonitor />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/settings" element={<ProtectedSettingsRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function ResponsiveAppLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={<PageFallback />}>
        <MobileLayout />
      </Suspense>
    );
  }

  return <DesktopLayout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <MarketDataProvider>
        <AdminAuthProvider>
          <FavoritesProvider>
            <ResponsiveAppLayout />
          </FavoritesProvider>
        </AdminAuthProvider>
      </MarketDataProvider>
    </ThemeProvider>
  );
}
