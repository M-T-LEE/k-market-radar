import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Factory,
  GitBranch,
  Home,
  LineChart,
  LockKeyhole,
  Network,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useMarketData } from "../../context/MarketDataContext";
import { enhancedGroupGovernanceData as groupGovernanceData } from "../../lib/governanceEnhancements";
import { scenarios } from "../../data/scenarios";
import { valueChains } from "../../data/valueChains";
import { cn, formatMarketCap, formatNumber, formatPercent, getMarketMoveTextClass } from "../../lib/formatters";
import { createPortfolioHolding, readPortfolioHoldings, writePortfolioHoldings } from "../../lib/portfolioStorage";
import { preloadLikelyRoutesOnIdle, preloadRouteForPath } from "../../lib/routePreloaders";
import { getScenarioStocks } from "../../lib/scenarioMatching";
import {
  buildDashboardMarketList,
  dashboardListModeLabels,
  dashboardListModes,
  dashboardMarkets,
  formatDashboardMetricValue,
  type DashboardListMode,
  type DashboardMarket
} from "../../lib/dashboardMarketLists";
import { StockExternalLink } from "../StockExternalLink";
import type { Scenario, ValueChain } from "../../types/scenario";
import type { Stock } from "../../types/stock";

const MobileAdminLoginPage = lazy(() => import("../../pages/AdminLogin"));
const MobileSettingsPage = lazy(() => import("../../pages/Settings"));

const MOBILE_NAV_ITEMS = [
  { label: "홈", path: "/", icon: Home, end: true },
  { label: "산업", path: "/scenario", icon: Activity },
  { label: "밸류", path: "/value-chain", icon: GitBranch },
  { label: "종목", path: "/screener", icon: Search },
  { label: "알림", path: "/alerts", icon: Bell }
];

const MOBILE_NAV_ITEMS_FULL = [
  { label: "대시", path: "/", icon: Home, end: true },
  { label: "산업", path: "/scenario", icon: Activity },
  { label: "브리핑", path: "/briefing", icon: LineChart },
  { label: "밸류", path: "/value-chain", icon: GitBranch },
  { label: "기업", path: "/governance", icon: Network },
  { label: "종목", path: "/screener", icon: Search },
  { label: "보유", path: "/portfolio", icon: BriefcaseBusiness },
  { label: "알림", path: "/alerts", icon: Bell },
  { label: "설정", path: "/settings", icon: LockKeyhole, adminOnly: true }
];

const scenarioOptionAll = "all";

type MobileDetailState = {
  eyebrow: string;
  title: string;
  description?: string;
  chips?: string[];
  stocks?: Stock[];
  primaryTo?: string;
  primaryLabel?: string;
  externalStock?: Stock;
};

function isDomesticStock(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

function getStockMove(stock: Stock) {
  return stock.dailyChangeRate ?? stock.priceChange3M ?? 0;
}

function getStockScore(stock: Stock) {
  return stock.finalScore ?? 0;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getStockText(stock: Stock) {
  return normalizeText(`${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme}`);
}

function getAverageMove(stocks: Stock[]) {
  if (!stocks.length) return 0;
  return stocks.reduce((sum, stock) => sum + getStockMove(stock), 0) / stocks.length;
}

function uniqueStocks(stocks: Stock[]) {
  const seen = new Set<string>();
  return stocks.filter((stock) => {
    if (seen.has(stock.id)) return false;
    seen.add(stock.id);
    return true;
  });
}

function sortByMove(stocks: Stock[]) {
  return [...stocks].sort((a, b) => getStockMove(b) - getStockMove(a));
}

function sortByScore(stocks: Stock[]) {
  return [...stocks].sort((a, b) => getStockScore(b) - getStockScore(a));
}

function getScenarioNodeStocks(nodeText: string, scenarioStocks: Stock[]) {
  const terms = nodeText
    .split(/[,\s/·|]+/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .map(normalizeText);

  const matched = scenarioStocks.filter((stock) => {
    const stockText = getStockText(stock);
    return terms.some((term) => stockText.includes(term));
  });

  return matched.length ? matched : scenarioStocks;
}

function getValueChainStocks(chain: ValueChain, stocks: Stock[]) {
  const scenario = scenarios.find((item) => item.id === chain.scenarioId);
  const scenarioStocks = scenario ? getScenarioStocks(scenario, stocks) : stocks;
  const chainTerms = [
    chain.name,
    chain.coreTechnology,
    chain.selectedCompany,
    chain.comment,
    ...chain.representativeCompanies,
    ...chain.reason
  ]
    .flatMap((term) => term.split(/[,\s/·|]+/g))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .map(normalizeText);

  const textMatched = scenarioStocks.filter((stock) => {
    const stockText = getStockText(stock);
    return chainTerms.some((term) => stockText.includes(term));
  });
  const representativeMatched = stocks.filter((stock) =>
    chain.representativeCompanies.some((company) => normalizeText(stock.name).includes(normalizeText(company)))
  );

  const merged = uniqueStocks([...textMatched, ...representativeMatched]).filter(isDomesticStock);
  return merged.length ? merged : scenarioStocks.filter(isDomesticStock);
}

type MobileMarketModelOptions = {
  scenarios?: boolean;
  valueChains?: boolean;
};

function useMobileMarketModel(options: MobileMarketModelOptions = {}) {
  const marketData = useMarketData();
  const { stocks, issues, alerts, indices, generatedAt, warnings, sourceStatus, refresh } = marketData;
  const includeScenarios = options.scenarios ?? false;
  const includeValueChains = options.valueChains ?? false;

  const derivedModel = useMemo(() => {
    const domesticStocks = stocks.filter(isDomesticStock);
    const allStocksByMove = sortByMove(domesticStocks);
    const allStocksByScore = sortByScore(domesticStocks);
    const risingStocks = allStocksByMove.filter((stock) => getStockMove(stock) > 0);
    const fallingStocks = [...allStocksByMove].reverse().filter((stock) => getStockMove(stock) < 0);

    const scenarioSummaries = includeScenarios
      ? scenarios
          .map((scenario) => {
            const relatedStocks = getScenarioStocks(scenario, domesticStocks);
            const topStocks = sortByMove(relatedStocks).slice(0, 4);
            const avgMove = getAverageMove(relatedStocks);

            return {
              scenario,
              relatedStocks,
              topStocks,
              avgMove,
              strongCount: relatedStocks.filter((stock) => getStockMove(stock) > 0).length
            };
          })
          .filter((item) => item.relatedStocks.length > 0)
          .sort((a, b) => b.avgMove - a.avgMove)
      : [];

    const valueChainSummaries = includeValueChains
      ? valueChains
          .map((chain) => {
            const relatedStocks = getValueChainStocks(chain, domesticStocks);
            const topStocks = sortByMove(relatedStocks).slice(0, 4);
            const avgMove = getAverageMove(relatedStocks);

            return {
              chain,
              relatedStocks,
              topStocks,
              avgMove,
              strongCount: relatedStocks.filter((stock) => getStockMove(stock) > 0).length
            };
          })
          .filter((item) => item.relatedStocks.length > 0)
          .sort((a, b) => b.avgMove - a.avgMove)
      : [];

    return {
      stocks,
      issues,
      alerts,
      indices,
      generatedAt,
      warnings,
      sourceStatus,
      refresh,
      domesticStocks,
      topStocksByMove: allStocksByMove.slice(0, 12),
      topStocksByScore: allStocksByScore.slice(0, 12),
      risingStocks,
      fallingStocks,
      scenarioSummaries,
      valueChainSummaries
    };
  }, [alerts, generatedAt, includeScenarios, includeValueChains, indices, issues, refresh, sourceStatus, stocks, warnings]);

  return useMemo(
    () => ({
      ...derivedModel,
      loading: marketData.loading
    }),
    [derivedModel, marketData.loading]
  );
}

function getStockDetail(stock: Stock): MobileDetailState {
  return {
    eyebrow: "종목 상세",
    title: stock.name,
    description: `${stock.ticker} · ${stock.market} · ${stock.theme}`,
    chips: [
      `현재가 ${formatNumber(stock.currentPrice)}`,
      `등락률 ${formatPercent(getStockMove(stock))}`,
      `시가총액 ${formatMarketCap(stock.marketCap)}`,
      `점수 ${getStockScore(stock)}`
    ],
    primaryTo: `/valuation?stock=${encodeURIComponent(stock.id)}`,
    primaryLabel: "기업가치 보기",
    externalStock: stock
  };
}

function getScenarioDetail(summary: ReturnType<typeof useMobileMarketModel>["scenarioSummaries"][number]): MobileDetailState {
  return {
    eyebrow: "산업 시나리오",
    title: summary.scenario.name,
    description: summary.scenario.description,
    chips: [
      `관련 ${summary.relatedStocks.length}`,
      `강세 ${summary.strongCount}`,
      `평균 ${formatPercent(summary.avgMove)}`
    ],
    stocks: summary.topStocks,
    primaryTo: `/scenario?scenario=${encodeURIComponent(summary.scenario.id)}`,
    primaryLabel: "세부 흐름 보기"
  };
}

function getValueChainDetail(summary: ReturnType<typeof useMobileMarketModel>["valueChainSummaries"][number]): MobileDetailState {
  return {
    eyebrow: "밸류체인",
    title: summary.chain.name,
    description: summary.chain.coreTechnology,
    chips: [
      `관련 ${summary.relatedStocks.length}`,
      `강세 ${summary.strongCount}`,
      `중심성 ${summary.chain.centralityScore}`,
      `평균 ${formatPercent(summary.avgMove)}`
    ],
    stocks: summary.topStocks,
    primaryTo: `/value-chain?chain=${encodeURIComponent(summary.chain.id)}`,
    primaryLabel: "밸류체인 보기"
  };
}

function MobileHeader() {
  const { indices, loading, refresh, warnings } = useMarketData();
  const location = useLocation();
  const currentTitle = getMobileTitle(location.pathname);
  const kospi = indices.find((index) => index.name === "KOSPI");
  const kosdaq = indices.find((index) => index.name === "KOSDAQ");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-navy-950/95 px-4 py-3 text-white shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-300">K-Market Radar</p>
          <h1 className="truncate text-xl font-black text-slate-50">{currentTitle}</h1>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200"
          aria-label="데이터 새로고침"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <IndexChip name="KOSPI" value={kospi?.value ?? 0} changeRate={kospi?.changeRate ?? 0} />
        <IndexChip name="KOSDAQ" value={kosdaq?.value ?? 0} changeRate={kosdaq?.changeRate ?? 0} />
      </div>

      {warnings.length ? (
        <p className="mt-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
          데이터 연결 확인 필요 · 보완 데이터 사용 중
        </p>
      ) : null}
    </header>
  );
}

function IndexChip({ name, value, changeRate }: { name: string; value: number; changeRate: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <p className="text-[11px] font-black text-slate-400">{name}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-base font-black text-slate-50">{value ? formatNumber(value, 2) : "대기"}</span>
        <span className={cn("shrink-0 text-xs font-black", getMarketMoveTextClass(changeRate, "dark"))}>
          {formatPercent(changeRate)}
        </span>
      </div>
    </div>
  );
}

function getMobileTitle(pathname: string) {
  if (pathname.startsWith("/scenario")) return "산업 시나리오";
  if (pathname.startsWith("/briefing")) return "증시 브리핑";
  if (pathname.startsWith("/value-chain")) return "밸류체인";
  if (pathname.startsWith("/governance")) return "기업진단";
  if (pathname.startsWith("/screener")) return "종목 스크리너";
  if (pathname.startsWith("/valuation")) return "기대치 분석";
  if (pathname.startsWith("/portfolio") || pathname.startsWith("/issues")) return "보유종목";
  if (pathname.startsWith("/alerts")) return "알림센터";
  if (pathname.startsWith("/settings")) return "설정";
  if (pathname.startsWith("/admin-login")) return "관리자 로그인";
  return "대시보드";
}

function MobileBottomNav() {
  const { isAdmin } = useAdminAuth();
  const navItems = useMemo(
    () => MOBILE_NAV_ITEMS_FULL.filter((item) => !("adminOnly" in item) || !item.adminOnly || isAdmin),
    [isAdmin]
  );
  const navColumnCount = navItems.length > 5 ? 4 : navItems.length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-navy-950/95 text-slate-400 shadow-2xl backdrop-blur">
      <div
        className="grid w-full gap-1.5 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2"
        style={{ gridTemplateColumns: `repeat(${navColumnCount}, minmax(0, 1fr))` }}
      >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onPointerEnter={() => preloadRouteForPath(item.path)}
            onTouchStart={() => preloadRouteForPath(item.path)}
            onFocus={() => preloadRouteForPath(item.path)}
            className={({ isActive }) =>
              cn(
                "flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[12px] font-black",
                isActive ? "bg-blue-500/15 text-blue-200" : "text-slate-400"
              )
            }
          >
            <Icon size={20} />
            <span className="w-full truncate text-center">{item.label}</span>
          </NavLink>
        );
      })}
      </div>
    </nav>
  );
}

function MobilePage({ children }: { children: React.ReactNode }) {
  return <main className="space-y-4 px-4 pb-36 pt-4">{children}</main>;
}

function MobileSection({
  title,
  subtitle,
  action,
  children
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/78 p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-50">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-bold leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
  icon: Icon
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-400">{label}</p>
        <Icon
          size={18}
          className={cn(tone === "positive" && "text-red-300", tone === "negative" && "text-blue-300", tone === "neutral" && "text-slate-400")}
        />
      </div>
      <p className="mt-3 text-2xl font-black text-slate-50">{value}</p>
    </div>
  );
}

function MoveBadge({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-black",
        value > 0
          ? "border-red-300/50 bg-red-400/10 text-red-200"
          : value < 0
            ? "border-blue-300/50 bg-blue-400/10 text-blue-200"
            : "border-slate-600 bg-slate-800 text-slate-300"
      )}
    >
      {formatPercent(value)}
    </span>
  );
}

function MobileDetailSheet({ detail, onClose }: { detail: MobileDetailState | null; onClose: () => void }) {
  useEffect(() => {
    if (!detail) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="상세 닫기" onClick={onClose} />
      <section className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-3xl border border-slate-700 bg-navy-950 p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-300">{detail.eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black leading-8 text-slate-50">{detail.title}</h2>
            {detail.description ? <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{detail.description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
            aria-label="상세 닫기"
          >
            <X size={19} />
          </button>
        </div>

        {detail.chips?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {detail.chips.map((chip) => (
              <span key={chip} className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-200">
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {detail.stocks?.length ? (
          <div className="mb-4 space-y-2">
            {detail.stocks.slice(0, 6).map((stock) => (
              <div key={stock.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-100">{stock.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{stock.ticker} · {stock.market}</p>
                </div>
                <MoveBadge value={getStockMove(stock)} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {detail.primaryTo ? (
            <Link
              to={detail.primaryTo}
              onClick={onClose}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
            >
              {detail.primaryLabel ?? "자세히 보기"}
            </Link>
          ) : null}
          {detail.externalStock ? (
            <StockExternalLink
              stock={detail.externalStock}
              className="!flex !min-h-12 !items-center !justify-center !rounded-2xl !border-slate-700 !bg-slate-900 !px-4 !py-0 !text-sm !font-black !text-blue-200"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StockCard({
  stock,
  compact = false,
  onOpenDetail
}: {
  stock: Stock;
  compact?: boolean;
  onOpenDetail?: (stock: Stock) => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const move = getStockMove(stock);

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-950/45 p-4",
        onOpenDetail && "cursor-pointer active:bg-slate-900"
      )}
      onClick={() => onOpenDetail?.(stock)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-100">{stock.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {stock.ticker} · {stock.market}
          </p>
        </div>
        <StockExternalLink
          stock={stock}
          compact
          className="!h-11 !shrink-0 !border-slate-700 !bg-slate-900 !px-3 !py-0 !text-blue-200"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(stock.id);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300"
          aria-label="관심종목 토글"
        >
          <Star size={18} className={cn(isFavorite(stock.id) && "fill-yellow-300 text-yellow-300")} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MoveBadge value={move} />
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-blue-200">점수 {getStockScore(stock)}</span>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">{stock.theme}</span>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <MiniInfo label="현재가" value={`${formatNumber(stock.currentPrice)}원`} />
          <MiniInfo label="시가총액" value={formatMarketCap(stock.marketCap)} />
          <MiniInfo label="PER" value={formatNumber(stock.per, 1)} />
          <MiniInfo label="PBR" value={formatNumber(stock.pbr, 1)} />
        </div>
      ) : null}
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-900 px-3 py-2">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

function ScenarioCard({
  summary,
  detailed = false,
  onOpenDetail
}: {
  summary: ReturnType<typeof useMobileMarketModel>["scenarioSummaries"][number];
  detailed?: boolean;
  onOpenDetail?: (summary: ReturnType<typeof useMobileMarketModel>["scenarioSummaries"][number]) => void;
}) {
  return (
    <Link
      to={`/scenario?scenario=${summary.scenario.id}`}
      onClick={(event) => {
        if (!onOpenDetail) return;
        event.preventDefault();
        onOpenDetail(summary);
      }}
      className="block rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-blue-300">산업 시나리오</p>
          <h3 className="mt-1 text-base font-black leading-6 text-slate-50">{summary.scenario.name}</h3>
        </div>
        <MoveBadge value={summary.avgMove} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-400">{summary.scenario.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">
          관련 {summary.relatedStocks.length}
        </span>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-red-200">
          강세 {summary.strongCount}
        </span>
        {summary.topStocks.slice(0, detailed ? 4 : 2).map((stock) => (
          <span key={stock.id} className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-200">
            {stock.name}
          </span>
        ))}
      </div>
    </Link>
  );
}

function ValueChainCard({
  summary,
  detailed = false,
  onOpenDetail
}: {
  summary: ReturnType<typeof useMobileMarketModel>["valueChainSummaries"][number];
  detailed?: boolean;
  onOpenDetail?: (summary: ReturnType<typeof useMobileMarketModel>["valueChainSummaries"][number]) => void;
}) {
  return (
    <Link
      to={`/value-chain?chain=${encodeURIComponent(summary.chain.id)}`}
      onClick={(event) => {
        if (!onOpenDetail) return;
        event.preventDefault();
        onOpenDetail(summary);
      }}
      className="block rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-blue-300">밸류체인</p>
          <h3 className="mt-1 text-base font-black leading-6 text-slate-50">{summary.chain.name}</h3>
        </div>
        <MoveBadge value={summary.avgMove} />
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-400">{summary.chain.coreTechnology}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <MiniInfo label="관련" value={summary.relatedStocks.length} />
        <MiniInfo label="강세" value={summary.strongCount} />
        <MiniInfo label="중심도" value={summary.chain.centralityScore} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {summary.topStocks.slice(0, detailed ? 4 : 3).map((stock) => (
          <span key={stock.id} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-200">
            {stock.name} {formatPercent(getStockMove(stock))}
          </span>
        ))}
      </div>
    </Link>
  );
}

function MobileDashboard() {
  const model = useMobileMarketModel({ scenarios: true, valueChains: true });
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const [market, setMarket] = useState<DashboardMarket>("KOSPI");
  const [flowMode, setFlowMode] = useState<DashboardListMode>("turnover");
  const strongestScenario = model.scenarioSummaries[0];
  const strongestChain = model.valueChainSummaries[0];
  const marketFlowRows = useMemo(
    () => buildDashboardMarketList(model.domesticStocks, market, flowMode, 6),
    [flowMode, market, model.domesticStocks]
  );
  const flowModeLabel = dashboardListModeLabels[flowMode];
  const isEstimatedFlow = flowMode === "foreign" || flowMode === "institution";

  return (
    <MobilePage>
      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="강한 종목" value={`${model.risingStocks.length}`} tone="positive" icon={TrendingUp} />
        <MetricCard label="약한 종목" value={`${model.fallingStocks.length}`} tone="negative" icon={TrendingDown} />
        <MetricCard label="강한 산업" value={`${model.scenarioSummaries.filter((item) => item.avgMove > 0).length}`} tone="positive" icon={Activity} />
        <MetricCard label="확인 알림" value={`${model.alerts.length}`} tone="neutral" icon={Bell} />
      </section>

      <MobileSection title="금일 시장별 섹터 리스트" subtitle="코스피·코스닥별 거래대금, 상승률, 수급 상위 종목을 빠르게 봅니다.">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {dashboardMarkets.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMarket(item)}
                className={cn(
                  "min-h-11 rounded-xl border border-slate-800 px-3 text-sm font-black",
                  market === item ? "bg-blue-600 text-white" : "bg-slate-950 text-slate-300"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dashboardListModes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFlowMode(item)}
                className={cn(
                  "min-h-11 rounded-xl border border-slate-800 px-3 text-xs font-black",
                  flowMode === item ? "bg-slate-100 text-slate-950" : "bg-slate-950 text-slate-300"
                )}
              >
                {dashboardListModeLabels[item]}
              </button>
            ))}
          </div>
          {isEstimatedFlow ? (
            <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-200">
              수급 API 연결 전에는 거래량·가격 반응 기반 보완 추정으로 표시됩니다.
            </p>
          ) : null}
          <div className="space-y-2">
            {marketFlowRows.map((row, index) => (
              <article
                key={row.stock.id}
                className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
                onClick={() => setDetail(getStockDetail(row.stock))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-300">
                      {index + 1} · {row.sector}
                    </p>
                    <h3 className="mt-1 truncate text-base font-black text-slate-50">{row.stock.name}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">{row.stock.ticker} · {market}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-black", flowMode === "gainers" ? getMarketMoveTextClass(row.value, "dark") : "text-slate-100")}>
                      {formatDashboardMetricValue(row.value, flowMode)}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{flowModeLabel}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={cn("text-xs font-black", getMarketMoveTextClass(row.dailyChangeRate, "dark"))}>
                    당일 {formatPercent(row.dailyChangeRate)}
                  </span>
                  <StockExternalLink
                    stock={row.stock}
                    compact
                    className="!border-slate-700 !bg-slate-900 !text-blue-200"
                  />
                </div>
              </article>
            ))}
            {!marketFlowRows.length ? <EmptyCard message="표시할 시장 데이터가 없습니다." /> : null}
          </div>
        </div>
      </MobileSection>

      <MobileSection title="오늘 먼저 볼 시장 흐름" subtitle="강한 산업과 밸류체인을 빠르게 확인합니다.">
        <div className="space-y-3">
          {strongestScenario ? <ScenarioCard summary={strongestScenario} detailed onOpenDetail={(summary) => setDetail(getScenarioDetail(summary))} /> : null}
          {strongestChain ? <ValueChainCard summary={strongestChain} detailed onOpenDetail={(summary) => setDetail(getValueChainDetail(summary))} /> : null}
        </div>
      </MobileSection>

      <MobileSection title="강한 종목" subtitle="국내 상장 종목 중 당일 움직임이 큰 순서입니다.">
        <div className="space-y-3">
          {model.topStocksByMove.slice(0, 5).map((stock) => (
            <StockCard key={stock.id} stock={stock} compact onOpenDetail={(item) => setDetail(getStockDetail(item))} />
          ))}
        </div>
      </MobileSection>

      <MobileSection title="빠른 이동" subtitle="모바일에서는 핵심 화면만 짧게 이동합니다.">
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/briefing" icon={LineChart} label="증시 브리핑" />
          <QuickLink to="/governance" icon={Network} label="기업진단" />
          <QuickLink to="/portfolio" icon={BriefcaseBusiness} label="보유종목" />
          <QuickLink to="/valuation" icon={Building2} label="기대치 분석" />
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm font-black text-slate-100"
    >
      <Icon size={18} className="text-blue-300" />
      <span>{label}</span>
      <ChevronRight size={17} className="ml-auto text-slate-500" />
    </Link>
  );
}

function MobileScenario() {
  const model = useMobileMarketModel({ scenarios: true });
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const selectedId = params.get("scenario") ?? model.scenarioSummaries[0]?.scenario.id ?? scenarios[0]?.id;
  const selectedSummary = model.scenarioSummaries.find((item) => item.scenario.id === selectedId) ?? model.scenarioSummaries[0];
  const selectedScenario = selectedSummary?.scenario;
  const selectedStocks = selectedSummary?.relatedStocks ?? [];

  const nodeCards = selectedScenario
    ? selectedScenario.nodes
        .map((node) => {
          const nodeStocks = getScenarioNodeStocks(`${node.label} ${node.theme} ${node.description}`, selectedStocks);
          return {
            node,
            stocks: sortByMove(nodeStocks).slice(0, 4),
            avgMove: getAverageMove(nodeStocks),
            count: nodeStocks.length
          };
        })
        .sort((a, b) => b.avgMove - a.avgMove)
    : [];

  return (
    <MobilePage>
      <MobileSection title="산업 선택" subtitle="같은 URL에서 화면 폭에 맞춰 모바일용으로 보여줍니다.">
        <select
          value={selectedScenario?.id}
          onChange={(event) => setParams({ scenario: event.target.value })}
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none"
        >
          {model.scenarioSummaries.map((item) => (
            <option key={item.scenario.id} value={item.scenario.id}>
              {item.scenario.name}
            </option>
          ))}
        </select>
      </MobileSection>

      {selectedSummary ? (
        <MobileSection title="선택 산업 요약" subtitle="관련 종목과 평균 움직임을 먼저 봅니다.">
          <ScenarioCard summary={selectedSummary} detailed onOpenDetail={(summary) => setDetail(getScenarioDetail(summary))} />
        </MobileSection>
      ) : null}

      <MobileSection title="눈에 띄는 세부 섹터" subtitle="선택 산업 안에서 강하게 움직인 세부 노드입니다.">
        <div className="space-y-3">
          {nodeCards.slice(0, 8).map((item) => (
            <article
              key={item.node.id}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
              onClick={() =>
                setDetail({
                  eyebrow: "세부 섹터",
                  title: item.node.label,
                  description: item.node.description,
                  chips: [`관련 ${item.count}`, `평균 ${formatPercent(item.avgMove)}`, item.node.theme],
                  stocks: item.stocks,
                  primaryTo: selectedScenario ? `/scenario?scenario=${encodeURIComponent(selectedScenario.id)}&node=${encodeURIComponent(item.node.id)}` : "/scenario",
                  primaryLabel: "산업 흐름 보기"
                })
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-blue-300">{item.node.theme}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-50">{item.node.label}</h3>
                </div>
                <MoveBadge value={item.avgMove} />
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{item.node.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">
                  관련 {item.count}
                </span>
                {item.stocks.map((stock) => (
                  <span key={stock.id} className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-200">
                    {stock.name} {formatPercent(getStockMove(stock))}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </MobileSection>

      <MobileSection title="강한 산업 후보" subtitle="전체 산업 중 오늘 평균 움직임이 높은 순서입니다.">
        <div className="space-y-3">
          {model.scenarioSummaries.slice(0, 6).map((summary) => (
            <ScenarioCard key={summary.scenario.id} summary={summary} onOpenDetail={(item) => setDetail(getScenarioDetail(item))} />
          ))}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobileValueChain() {
  const model = useMobileMarketModel({ valueChains: true });
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const scenarioFilter = params.get("scenario") ?? scenarioOptionAll;
  const selectedChainId = params.get("chain");

  const filteredChains = model.valueChainSummaries.filter((summary) => {
    if (scenarioFilter === scenarioOptionAll) return true;
    return summary.chain.scenarioId === scenarioFilter;
  });
  const selectedChain = selectedChainId
    ? model.valueChainSummaries.find((summary) => summary.chain.id === selectedChainId)
    : filteredChains[0];

  return (
    <MobilePage>
      <MobileSection title="밸류체인 필터" subtitle="산업별로 강한 부품·기술 축을 좁혀봅니다.">
        <select
          value={scenarioFilter}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            next.set("scenario", event.target.value);
            next.delete("chain");
            setParams(next);
          }}
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none"
        >
          <option value={scenarioOptionAll}>전체 산업</option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </MobileSection>

      {selectedChain ? (
        <MobileSection title="선택 밸류체인" subtitle="관련 종목과 핵심 기술을 먼저 확인합니다.">
          <ValueChainCard summary={selectedChain} detailed onOpenDetail={(summary) => setDetail(getValueChainDetail(summary))} />
        </MobileSection>
      ) : null}

      <MobileSection title="강한 밸류체인" subtitle="평균 움직임이 높은 순서로 정렬했습니다.">
        <div className="space-y-3">
          {filteredChains.slice(0, 10).map((summary) => (
            <ValueChainCard key={summary.chain.id} summary={summary} onOpenDetail={(item) => setDetail(getValueChainDetail(item))} />
          ))}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobileScreener() {
  const model = useMobileMarketModel();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("query") ?? "");
  const [market, setMarket] = useState("all");
  const [sortMode, setSortMode] = useState<"move" | "score">("move");
  const [detail, setDetail] = useState<MobileDetailState | null>(null);

  const filteredStocks = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const source = sortMode === "move" ? model.topStocksByMove.concat(model.domesticStocks) : model.topStocksByScore.concat(model.domesticStocks);
    return uniqueStocks(source)
      .filter((stock) => market === "all" || stock.market === market)
      .filter((stock) => !normalizedQuery || getStockText(stock).includes(normalizedQuery))
      .slice(0, 30);
  }, [market, model.domesticStocks, model.topStocksByMove, model.topStocksByScore, query, sortMode]);

  return (
    <MobilePage>
      <MobileSection title="종목 찾기" subtitle="모바일에서는 조건을 줄이고 결과를 카드로 봅니다.">
        <div className="space-y-3">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              const next = new URLSearchParams(params);
              if (event.target.value) next.set("query", event.target.value);
              else next.delete("query");
              setParams(next, { replace: true });
            }}
            placeholder="종목명, 티커, 산업 검색"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none placeholder:text-slate-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none"
            >
              <option value="all">전체 시장</option>
              <option value="KOSPI">KOSPI</option>
              <option value="KOSDAQ">KOSDAQ</option>
            </select>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as "move" | "score")}
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none"
            >
              <option value="move">당일 움직임</option>
              <option value="score">종합 점수</option>
            </select>
          </div>
        </div>
      </MobileSection>

      <MobileSection title="검색 결과" subtitle={`${filteredStocks.length}개 종목`}>
        <div className="space-y-3">
          {filteredStocks.map((stock) => (
            <StockCard key={stock.id} stock={stock} onOpenDetail={(item) => setDetail(getStockDetail(item))} />
          ))}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobileBriefing() {
  const model = useMobileMarketModel({ scenarios: true });
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const stockById = useMemo(() => new Map(model.stocks.map((stock) => [stock.id, stock])), [model.stocks]);

  return (
    <MobilePage>
      <MobileSection title="시장 요약" subtitle="강한 축과 약한 축을 카드로 압축했습니다.">
        <div className="space-y-3">
          {model.scenarioSummaries.slice(0, 4).map((summary) => (
            <ScenarioCard key={summary.scenario.id} summary={summary} onOpenDetail={(item) => setDetail(getScenarioDetail(item))} />
          ))}
        </div>
      </MobileSection>

      <MobileSection title="오늘 확인할 이슈" subtitle="투자 판단에 영향을 줄 수 있는 공시·뉴스성 이벤트입니다.">
        <div className="space-y-3">
          {model.issues.slice(0, 6).map((issue) => {
            const stock = stockById.get(issue.stockId);
            return (
              <article key={issue.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-500">{issue.date}</p>
                    <h3 className="mt-1 text-base font-black leading-6 text-slate-50">{issue.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">
                    {issue.impactScore}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{issue.description}</p>
                {stock ? (
                  <p className="mt-3 text-xs font-black text-blue-200">
                    {stock.name} · {formatPercent(getStockMove(stock))}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobileGovernance() {
  const model = useMobileMarketModel();
  const [selectedGroupId, setSelectedGroupId] = useState(groupGovernanceData[0]?.id ?? "");
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const selectedGroup = groupGovernanceData.find((group) => group.id === selectedGroupId) ?? groupGovernanceData[0];
  const listedNodes = selectedGroup?.nodes.filter((node) => node.listed) ?? [];
  const nodeById = useMemo(() => new Map(selectedGroup?.nodes.map((node) => [node.id, node]) ?? []), [selectedGroup]);
  const stockByTicker = useMemo(() => new Map(model.stocks.map((stock) => [stock.ticker, stock])), [model.stocks]);
  const holdingRows = useMemo(
    () =>
      selectedGroup?.edges
        .flatMap((edge) => {
          const holder = nodeById.get(edge.from);
          const asset = nodeById.get(edge.to);
          return holder && asset ? [{ edge, holder, asset }] : [];
        })
        .sort((a, b) => b.edge.ownershipPercent - a.edge.ownershipPercent) ?? [],
    [nodeById, selectedGroup]
  );

  return (
    <MobilePage>
      <MobileSection title="그룹 선택" subtitle="모바일에서는 지배구조를 단계별 카드로 확인합니다.">
        <select
          value={selectedGroup?.id}
          onChange={(event) => setSelectedGroupId(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none"
        >
          {groupGovernanceData.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </MobileSection>

      {selectedGroup ? (
        <>
          <MobileSection title={`${selectedGroup.name} 요약`} subtitle={selectedGroup.description}>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MiniInfo label="상장사" value={listedNodes.length} />
              <MiniInfo label="관계" value={selectedGroup.edges.length} />
              <MiniInfo label="로드맵" value={selectedGroup.investmentRoadmap.length} />
            </div>
          </MobileSection>

          <MobileSection title="핵심 계열사" subtitle="맵 대신 계열사와 역할을 세로 카드로 정리합니다.">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <h3 className="text-base font-black text-slate-50">그룹 내 주식보유현황 전체</h3>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-400">
                  지배 관계뿐 아니라 그룹 안에서 확인되는 보유 지분 관계를 모두 표시합니다.
                </p>
                <div className="mt-3 space-y-2">
                  {holdingRows.map(({ edge, holder, asset }) => (
                    <div
                      key={edge.id}
                      className="cursor-pointer rounded-xl bg-slate-900 px-3 py-3 active:bg-slate-800"
                      onClick={() => {
                        const assetStock = asset.ticker ? stockByTicker.get(asset.ticker) : undefined;
                        setDetail({
                          eyebrow: "그룹 내 보유지분",
                          title: `${holder.name} → ${asset.name}`,
                          description: `${selectedGroup.name} 안에서 확인되는 보유 관계입니다.`,
                          chips: [`지분율 ${formatNumber(edge.ownershipPercent, 1)}%`, String(edge.relation), edge.asOf],
                          stocks: assetStock ? [assetStock] : undefined,
                          primaryTo: assetStock ? `/valuation?stock=${encodeURIComponent(assetStock.id)}` : "/governance",
                          primaryLabel: assetStock ? "기업가치 보기" : "구조 보기",
                          externalStock: assetStock
                        });
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-keep text-sm font-black leading-5 text-slate-100">
                          {holder.name} → {asset.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-black text-blue-200">
                          {formatNumber(edge.ownershipPercent, 1)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-500">{String(edge.relation)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {listedNodes.map((node) => (
                <article
                  key={node.id}
                  className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
                  onClick={() => {
                    const nodeStock = node.ticker ? stockByTicker.get(node.ticker) : undefined;
                    setDetail({
                      eyebrow: "그룹 계열사",
                      title: node.name,
                      description: node.role,
                      chips: [
                        String(node.type),
                        node.ticker ?? node.market ?? "비상장",
                        `연결 관계 ${holdingRows.filter((row) => row.holder.id === node.id || row.asset.id === node.id).length}`
                      ],
                      stocks: nodeStock ? [nodeStock] : undefined,
                      primaryTo: nodeStock ? `/valuation?stock=${encodeURIComponent(nodeStock.id)}` : "/governance",
                      primaryLabel: nodeStock ? "기업가치 보기" : "구조 보기",
                      externalStock: nodeStock
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-blue-300">{node.type}</p>
                      <h3 className="mt-1 text-base font-black text-slate-50">{node.name}</h3>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">
                      {node.ticker}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{node.role}</p>
                </article>
              ))}
            </div>
          </MobileSection>
        </>
      ) : null}
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobilePortfolio() {
  const model = useMobileMarketModel();
  const { favoriteIds } = useFavorites();
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const [holdings, setHoldings] = useState(() => readPortfolioHoldings());
  const [form, setForm] = useState({
    stockQuery: "",
    averagePrice: "",
    quantity: "",
    buyDate: new Date().toISOString().slice(0, 10)
  });
  const stockById = useMemo(() => new Map(model.stocks.map((stock) => [stock.id, stock])), [model.stocks]);
  const favoriteStocks = favoriteIds.map((id) => stockById.get(id)).filter((stock): stock is Stock => Boolean(stock));
  const holdingRows = useMemo(
    () =>
      holdings.map((holding) => {
        const stock = stockById.get(holding.stockId);
        const returnRate = stock && holding.averagePrice ? ((stock.currentPrice - holding.averagePrice) / holding.averagePrice) * 100 : 0;
        return { holding, stock, returnRate };
      }),
    [holdings, stockById]
  );

  useEffect(() => {
    const syncHoldings = () => setHoldings(readPortfolioHoldings());
    window.addEventListener("storage", syncHoldings);
    window.addEventListener("market-cycle-radar:portfolio-updated", syncHoldings);
    return () => {
      window.removeEventListener("storage", syncHoldings);
      window.removeEventListener("market-cycle-radar:portfolio-updated", syncHoldings);
    };
  }, []);

  const saveHoldings = (nextHoldings: typeof holdings) => {
    setHoldings(nextHoldings);
    writePortfolioHoldings(nextHoldings);
  };

  const addHolding = () => {
    const query = normalizeText(form.stockQuery);
    if (!query) return;

    const stock = model.domesticStocks.find((item) => normalizeText(`${item.name} ${item.ticker} ${item.theme} ${item.sector}`).includes(query));
    if (!stock) return;

    saveHoldings([createPortfolioHolding(stock, form), ...holdings]);
    setForm({
      stockQuery: "",
      averagePrice: "",
      quantity: "",
      buyDate: new Date().toISOString().slice(0, 10)
    });
  };

  return (
    <MobilePage>
      <MobileSection title="관심 종목" subtitle="모바일에서는 관심 종목과 보유 논리를 먼저 봅니다.">
        <div className="space-y-3">
          {favoriteStocks.length ? (
            favoriteStocks.map((stock) => <StockCard key={stock.id} stock={stock} compact onOpenDetail={(item) => setDetail(getStockDetail(item))} />)
          ) : (
            <EmptyCard message="아직 등록된 관심 종목이 없습니다." />
          )}
        </div>
      </MobileSection>

      <MobileSection title="보유종목 추가" subtitle="종목명이나 티커를 입력해 모바일에서도 바로 등록합니다.">
        <div className="space-y-3">
          <input
            value={form.stockQuery}
            onChange={(event) => setForm((current) => ({ ...current, stockQuery: event.target.value }))}
            placeholder="종목명 또는 티커"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none placeholder:text-slate-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.averagePrice}
              onChange={(event) => setForm((current) => ({ ...current, averagePrice: event.target.value }))}
              inputMode="decimal"
              placeholder="평균단가"
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none placeholder:text-slate-600"
            />
            <input
              value={form.quantity}
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              inputMode="decimal"
              placeholder="수량"
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            type="button"
            onClick={addHolding}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
          >
            <Plus size={18} />
            보유종목 추가
          </button>
        </div>
      </MobileSection>

      <MobileSection title="보유종목" subtitle="직접 등록한 보유종목만 표시합니다.">
        <div className="space-y-3">
          {holdingRows.length ? (
          holdingRows.map(({ holding, stock, returnRate }) => {
            return (
              <article
                key={holding.id}
                className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
                onClick={() => {
                  if (stock) setDetail(getStockDetail(stock));
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-300">{holding.coreValueChain}</p>
                    <h3 className="mt-1 text-base font-black text-slate-50">{stock?.name ?? holding.stockId}</h3>
                  </div>
                  <MoveBadge value={returnRate} />
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{holding.investmentThesis}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    saveHoldings(holdings.filter((item) => item.id !== holding.id));
                  }}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-slate-200"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </article>
            );
          })
          ) : (
            <EmptyCard message="아직 등록된 보유종목이 없습니다." />
          )}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function MobileAlerts() {
  const model = useMobileMarketModel();
  const stockById = useMemo(() => new Map(model.stocks.map((stock) => [stock.id, stock])), [model.stocks]);

  return (
    <MobilePage>
      <MobileSection title="알림센터" subtitle="오늘 확인해야 할 가격·공시·리스크 알림입니다.">
        <div className="space-y-3">
          {model.alerts.length ? (
            model.alerts.map((alert) => {
              const stock = stockById.get(alert.stockId);
              return (
                <article key={alert.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-500">{alert.createdAt}</p>
                      <h3 className="mt-1 text-base font-black leading-6 text-slate-50">{alert.title}</h3>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", alert.severity === "critical" ? "bg-red-400/10 text-red-200" : "bg-slate-800 text-slate-300")}>
                      {alert.condition}
                    </span>
                  </div>
                  {stock ? (
                    <p className="mt-3 text-xs font-black text-blue-200">
                      {stock.name} · {formatPercent(getStockMove(stock))}
                    </p>
                  ) : null}
                </article>
              );
            })
          ) : (
            <EmptyCard message="현재 확인할 알림이 없습니다." />
          )}
        </div>
      </MobileSection>
    </MobilePage>
  );
}

function MobileValuation() {
  const model = useMobileMarketModel();
  const [detail, setDetail] = useState<MobileDetailState | null>(null);
  const highRiskStocks = [...model.domesticStocks]
    .sort((a, b) => b.preReflectionRiskScore - a.preReflectionRiskScore)
    .slice(0, 12);

  return (
    <MobilePage>
      <MobileSection title="기대치 부담 점검" subtitle="선반영 부담이 큰 종목을 모바일 카드로 봅니다.">
        <div className="space-y-3">
          {highRiskStocks.map((stock) => (
            <article
              key={stock.id}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/45 p-4 active:bg-slate-900"
              onClick={() => setDetail(getStockDetail(stock))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-50">{stock.name}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{stock.theme}</p>
                </div>
                <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-200">
                  부담 {stock.preReflectionRiskScore}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <MiniInfo label="PER" value={formatNumber(stock.per, 1)} />
                <MiniInfo label="Forward PER" value={formatNumber(stock.forwardPer, 1)} />
                <MiniInfo label="PBR" value={formatNumber(stock.pbr, 1)} />
                <MiniInfo label="3개월" value={formatPercent(stock.priceChange3M)} />
              </div>
            </article>
          ))}
        </div>
      </MobileSection>
      <MobileDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </MobilePage>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/35 p-5 text-center text-sm font-bold text-slate-400">
      {message}
    </div>
  );
}

function MobileProtectedSettingsRoute() {
  const { isAdmin, status } = useAdminAuth();

  if (status === "checking") {
    return (
      <MobilePage>
        <MobileSection title="관리자 확인" subtitle="관리자 세션을 확인하고 있습니다.">
          <EmptyCard message="잠시만 기다려 주세요." />
        </MobileSection>
      </MobilePage>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin-login?next=/settings" replace />;
  }

  return (
    <MobilePage>
      <MobileSection title="관리자 설정" subtitle="설정 화면은 관리자에게만 열립니다.">
        <Suspense fallback={<EmptyCard message="설정 화면을 준비하고 있습니다." />}>
          <div className="mobile-admin-settings overflow-x-auto">
            <MobileSettingsPage />
          </div>
        </Suspense>
      </MobileSection>
    </MobilePage>
  );
}

function MobileAdminLogin() {
  return (
    <MobilePage>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/78 p-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-black text-slate-300">
          <LockKeyhole size={17} className="text-blue-300" />
          관리자 전용
        </div>
        <Suspense fallback={<EmptyCard message="관리자 로그인을 준비하고 있습니다." />}>
          <MobileAdminLoginPage />
        </Suspense>
      </div>
    </MobilePage>
  );
}

export function MobileLayout() {
  useEffect(() => {
    preloadLikelyRoutesOnIdle();
  }, []);

  return (
    <div className="mobile-shell min-h-screen overflow-x-hidden bg-navy-950 text-slate-100">
      <MobileHeader />
      <Routes>
        <Route path="/" element={<MobileDashboard />} />
        <Route path="/scenario" element={<MobileScenario />} />
        <Route path="/briefing" element={<MobileBriefing />} />
        <Route path="/value-chain" element={<MobileValueChain />} />
        <Route path="/governance" element={<MobileGovernance />} />
        <Route path="/screener" element={<MobileScreener />} />
        <Route path="/valuation" element={<MobileValuation />} />
        <Route path="/portfolio" element={<MobilePortfolio />} />
        <Route path="/issues" element={<MobilePortfolio />} />
        <Route path="/alerts" element={<MobileAlerts />} />
        <Route path="/admin-login" element={<MobileAdminLogin />} />
        <Route path="/settings" element={<MobileProtectedSettingsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MobileBottomNav />
    </div>
  );
}
