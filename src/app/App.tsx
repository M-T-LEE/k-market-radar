import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";
import { MarketDataProvider } from "../context/MarketDataContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import { ThemeProvider } from "../context/ThemeContext";
import AdminLogin from "../pages/AdminLogin";
import Alerts from "../pages/Alerts";
import Dashboard from "../pages/Dashboard";
import GroupGovernance from "../pages/GroupGovernance";
import MarketBriefing from "../pages/MarketBriefing";
import PortfolioMonitor from "../pages/PortfolioMonitor";
import ScenarioMap from "../pages/ScenarioMap";
import Screener from "../pages/Screener";
import Settings from "../pages/Settings";
import Valuation from "../pages/Valuation";
import ValueChain from "../pages/ValueChain";

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

export default function App() {
  return (
    <ThemeProvider>
      <MarketDataProvider>
        <AdminAuthProvider>
          <FavoritesProvider>
            <div className="min-h-screen bg-radar-bg dark:bg-navy-950">
              <Sidebar />
              <div className="min-h-screen pl-[280px]">
                <TopBar />
                <main className="px-8 py-6">
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
                </main>
              </div>
            </div>
          </FavoritesProvider>
        </AdminAuthProvider>
      </MarketDataProvider>
    </ThemeProvider>
  );
}
