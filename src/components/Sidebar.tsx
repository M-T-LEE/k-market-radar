import {
  Bell,
  BriefcaseBusiness,
  CandlestickChart,
  GitBranch,
  Globe2,
  Home,
  Network,
  Radar,
  ScanSearch,
  Settings as SettingsIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useMarketData } from "../context/MarketDataContext";
import { getUnreadAlertIds, markAlertsRead } from "../lib/alertReadState";
import { formatQuoteTime } from "../lib/dataSourceLabels";
import { cn, getMarketMoveTextClass } from "../lib/formatters";

const menus = [
  { label: "대시보드", path: "/", icon: Home },
  { label: "산업 시나리오", path: "/scenario", icon: Radar },
  { label: "국내 증시 브리핑", path: "/briefing", icon: Globe2 },
  { label: "밸류체인", path: "/value-chain", icon: GitBranch },
  { label: "기업진단 보드", path: "/governance", icon: Network },
  { label: "종목 스크리너", path: "/screener", icon: ScanSearch },
  { label: "보유종목·이슈", path: "/portfolio", icon: BriefcaseBusiness },
  { label: "알림센터", path: "/alerts", icon: Bell, alert: true },
  { label: "설정", path: "/settings", icon: SettingsIcon }
];

export function Sidebar() {
  const location = useLocation();
  const { alerts, indices } = useMarketData();
  const [alertVersion, setAlertVersion] = useState(0);
  const kospi = indices.find((index) => index.name === "KOSPI") ?? indices[0];
  const kosdaq = indices.find((index) => index.name === "KOSDAQ");
  const unreadAlertCount = useMemo(() => getUnreadAlertIds(alerts).length, [alerts, alertVersion]);

  useEffect(() => {
    const syncReadAt = () => setAlertVersion((value) => value + 1);
    window.addEventListener("storage", syncReadAt);
    window.addEventListener("market-cycle-radar:alerts-read", syncReadAt);
    return () => {
      window.removeEventListener("storage", syncReadAt);
      window.removeEventListener("market-cycle-radar:alerts-read", syncReadAt);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/alerts") {
      markAlertsRead(alerts);
    }
  }, [alerts, location.pathname]);

  const renderIndex = (label: string, index = kospi) => (
    <div>
      <p className="text-sm font-bold text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-black">
        {index?.value ? index.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "불러오는 중"}
      </p>
      <p className={cn("mt-1 text-sm font-bold", getMarketMoveTextClass(index?.change ?? 0, "dark"))}>
        {(index?.change ?? 0) >= 0 ? "+" : ""}
        {(index?.change ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })} ({(index?.changeRate ?? 0).toFixed(2)}%)
      </p>
    </div>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[280px] flex-col bg-navy-900 px-5 py-7 text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-500 text-blue-400">
          <CandlestickChart size={24} />
        </div>
        <div>
          <p className="text-xl font-black leading-6">K-Market Radar</p>
          <p className="mt-0.5 max-w-[190px] text-[11px] font-bold leading-4 text-blue-200">
            국내증시 산업순환·밸류체인 분석 플랫폼
          </p>
        </div>
      </div>

      <nav className="mt-10 flex-1 space-y-2 overflow-y-auto pr-1">
        {menus.map((menu) => {
          const Icon = menu.icon;
          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={menu.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-14 items-center gap-4 rounded-lg px-4 text-sm font-black text-slate-200 transition hover:bg-blue-600/30 hover:text-white",
                  isActive && "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                )
              }
            >
              <Icon size={21} />
              <span className="flex-1">{menu.label}</span>
              {menu.alert && unreadAlertCount > 0 && location.pathname !== "/alerts" ? (
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
                  {unreadAlertCount}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
        {renderIndex("KOSPI", kospi)}
        <div className="mt-4 border-t border-white/10 pt-4">{kosdaq ? renderIndex("KOSDAQ", kosdaq) : null}</div>
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-bold text-slate-400">시장 지수</p>
          <p className="mt-2 text-sm font-bold text-slate-300">업데이트 {formatQuoteTime(kospi?.updatedAt ?? new Date().toISOString())}</p>
        </div>
      </div>
    </aside>
  );
}
