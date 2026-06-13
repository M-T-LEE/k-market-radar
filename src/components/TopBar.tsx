import { ChevronDown, Moon, RefreshCcw, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMarketData } from "../context/MarketDataContext";
import { useTheme } from "../context/ThemeContext";

const titles: Record<string, string> = {
  "/": "1. 대시보드",
  "/scenario": "2. 산업 시나리오 맵",
  "/briefing": "국내 증시 브리핑",
  "/value-chain": "3. 밸류체인 & 핵심 기업",
  "/governance": "3-1. 기업진단 지배구조 보드",
  "/screener": "4. 종목 스크리너 & 스코어링",
  "/valuation": "5. 밸류에이션 & 기대치 분석",
  "/portfolio": "6. 보유종목 & 이슈 모니터링",
  "/issues": "6. 보유종목 & 이슈 모니터링",
  "/alerts": "알림센터",
  "/admin-login": "관리자 로그인",
  "/settings": "설정"
};

export function TopBar() {
  const location = useLocation();
  const title = titles[location.pathname] ?? "K-Market Radar";
  const { generatedAt, loading, refresh } = useMarketData();
  const { theme, toggleTheme } = useTheme();
  const updatedAt = new Date(generatedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-radar-line bg-radar-bg/95 px-8 backdrop-blur dark:border-slate-700 dark:bg-navy-950/95">
      <div>
        <h1 className="text-3xl font-black tracking-normal text-radar-ink dark:text-slate-100">{title}</h1>
        {location.pathname === "/screener" ? (
          <Link to="/valuation" className="mt-1 inline-block text-sm font-bold text-blue-600 dark:text-blue-300">
            선택 종목 기대치 분석으로 이동
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          오늘 업데이트: {updatedAt}
        </span>
        <button
          onClick={() => void refresh()}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-radar-line bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          title="화면 새로고침"
        >
          <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-radar-line bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          title={theme === "dark" ? "라이트 모드" : "다크 모드"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="flex h-11 items-center gap-2 rounded-lg border border-radar-line bg-white px-4 text-sm font-black text-radar-ink shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          KRW
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
