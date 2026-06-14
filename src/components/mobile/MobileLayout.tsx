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
  RefreshCw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useMarketData } from "../../context/MarketDataContext";
import { groupGovernanceData } from "../../data/groupGovernance";
import { portfolioHoldings } from "../../data/portfolio";
import { scenarios } from "../../data/scenarios";
import { valueChains } from "../../data/valueChains";
import { cn, formatMarketCap, formatNumber, formatPercent, getMarketMoveTextClass } from "../../lib/formatters";
import { getScenarioStocks } from "../../lib/scenarioMatching";
import AdminLogin from "../../pages/AdminLogin";
import Settings from "../../pages/Settings";
import type { Scenario, ValueChain } from "../../types/scenario";
import type { Stock } from "../../types/stock";

const MOBILE_NAV_ITEMS = [
  { label: "홈", path: "/", icon: Home, end: true },
  { label: "산업", path: "/scenario", icon: Activity },
  { label: "밸류", path: "/value-chain", icon: GitBranch },
  { label: "종목", path: "/screener", icon: Search },
  { label: "알림", path: "/alerts", icon: Bell }
];

const scenarioOptionAll = "all";

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

function useMobileMarketModel() {
  const marketData = useMarketData();

  return useMemo(() => {
    const domesticStocks = marketData.stocks.filter(isDomesticStock);
    const allStocksByMove = sortByMove(domesticStocks);
    const allStocksByScore = sortByScore(domesticStocks);
    const risingStocks = allStocksByMove.filter((stock) => getStockMove(stock) > 0);
    const fallingStocks = [...allStocksByMove].reverse().filter((stock) => getStockMove(stock) < 0);

    const scenarioSummaries = scenarios
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
      .sort((a, b) => b.avgMove - a.avgMove);

    const valueChainSummaries = valueChains
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
      .sort((a, b) => b.avgMove - a.avgMove);

    return {
      ...marketData,
      domesticStocks,
      topStocksByMove: allStocksByMove.slice(0, 12),
      topStocksByScore: allStocksByScore.slice(0, 12),
      risingStocks,
      fallingStocks,
      scenarioSummaries,
      valueChainSummaries
    };
  }, [marketData]);
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-navy-950/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 text-slate-400 shadow-2xl backdrop-blur">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black",
                isActive ? "bg-blue-500/15 text-blue-200" : "text-slate-400"
              )
            }
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobilePage({ children }: { children: React.ReactNode }) {
  return <main className="space-y-4 px-4 pb-24 pt-4">{children}</main>;
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

function StockCard({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const move = getStockMove(stock);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-100">{stock.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {stock.ticker} · {stock.market}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(stock.id)}
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
  detailed = false
}: {
  summary: ReturnType<typeof useMobileMarketModel>["scenarioSummaries"][number];
  detailed?: boolean;
}) {
  return (
    <Link
      to={`/scenario?scenario=${summary.scenario.id}`}
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
  detailed = false
}: {
  summary: ReturnType<typeof useMobileMarketModel>["valueChainSummaries"][number];
  detailed?: boolean;
}) {
  return (
    <Link
      to={`/value-chain?chain=${encodeURIComponent(summary.chain.id)}`}
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
  const model = useMobileMarketModel();
  const strongestScenario = model.scenarioSummaries[0];
  const strongestChain = model.valueChainSummaries[0];

  return (
    <MobilePage>
      <section className="grid grid-cols-2 gap-3">
        <MetricCard label="강한 종목" value={`${model.risingStocks.length}`} tone="positive" icon={TrendingUp} />
        <MetricCard label="약한 종목" value={`${model.fallingStocks.length}`} tone="negative" icon={TrendingDown} />
        <MetricCard label="강한 산업" value={`${model.scenarioSummaries.filter((item) => item.avgMove > 0).length}`} tone="positive" icon={Activity} />
        <MetricCard label="확인 알림" value={`${model.alerts.length}`} tone="neutral" icon={Bell} />
      </section>

      <MobileSection title="오늘 먼저 볼 시장 흐름" subtitle="강한 산업과 밸류체인을 빠르게 확인합니다.">
        <div className="space-y-3">
          {strongestScenario ? <ScenarioCard summary={strongestScenario} detailed /> : null}
          {strongestChain ? <ValueChainCard summary={strongestChain} detailed /> : null}
        </div>
      </MobileSection>

      <MobileSection title="강한 종목" subtitle="국내 상장 종목 중 당일 움직임이 큰 순서입니다.">
        <div className="space-y-3">
          {model.topStocksByMove.slice(0, 5).map((stock) => (
            <StockCard key={stock.id} stock={stock} compact />
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
  const model = useMobileMarketModel();
  const [params, setParams] = useSearchParams();
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
          <ScenarioCard summary={selectedSummary} detailed />
        </MobileSection>
      ) : null}

      <MobileSection title="눈에 띄는 세부 섹터" subtitle="선택 산업 안에서 강하게 움직인 세부 노드입니다.">
        <div className="space-y-3">
          {nodeCards.slice(0, 8).map((item) => (
            <article key={item.node.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
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
            <ScenarioCard key={summary.scenario.id} summary={summary} />
          ))}
        </div>
      </MobileSection>
    </MobilePage>
  );
}

function MobileValueChain() {
  const model = useMobileMarketModel();
  const [params, setParams] = useSearchParams();
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
          <ValueChainCard summary={selectedChain} detailed />
        </MobileSection>
      ) : null}

      <MobileSection title="강한 밸류체인" subtitle="평균 움직임이 높은 순서로 정렬했습니다.">
        <div className="space-y-3">
          {filteredChains.slice(0, 10).map((summary) => (
            <ValueChainCard key={summary.chain.id} summary={summary} />
          ))}
        </div>
      </MobileSection>
    </MobilePage>
  );
}

function MobileScreener() {
  const model = useMobileMarketModel();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("query") ?? "");
  const [market, setMarket] = useState("all");
  const [sortMode, setSortMode] = useState<"move" | "score">("move");

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
            <StockCard key={stock.id} stock={stock} />
          ))}
        </div>
      </MobileSection>
    </MobilePage>
  );
}

function MobileBriefing() {
  const model = useMobileMarketModel();
  const stockById = useMemo(() => new Map(model.stocks.map((stock) => [stock.id, stock])), [model.stocks]);

  return (
    <MobilePage>
      <MobileSection title="시장 요약" subtitle="강한 축과 약한 축을 카드로 압축했습니다.">
        <div className="space-y-3">
          {model.scenarioSummaries.slice(0, 4).map((summary) => (
            <ScenarioCard key={summary.scenario.id} summary={summary} />
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
    </MobilePage>
  );
}

function MobileGovernance() {
  const [selectedGroupId, setSelectedGroupId] = useState(groupGovernanceData[0]?.id ?? "");
  const selectedGroup = groupGovernanceData.find((group) => group.id === selectedGroupId) ?? groupGovernanceData[0];
  const listedNodes = selectedGroup?.nodes.filter((node) => node.listed) ?? [];

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
              {listedNodes.slice(0, 10).map((node) => (
                <article key={node.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
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
    </MobilePage>
  );
}

function MobilePortfolio() {
  const model = useMobileMarketModel();
  const { favoriteIds } = useFavorites();
  const stockById = useMemo(() => new Map(model.stocks.map((stock) => [stock.id, stock])), [model.stocks]);
  const favoriteStocks = favoriteIds.map((id) => stockById.get(id)).filter((stock): stock is Stock => Boolean(stock));

  return (
    <MobilePage>
      <MobileSection title="관심 종목" subtitle="모바일에서는 관심 종목과 보유 논리를 먼저 봅니다.">
        <div className="space-y-3">
          {favoriteStocks.length ? favoriteStocks.map((stock) => <StockCard key={stock.id} stock={stock} compact />) : <EmptyCard message="아직 등록된 관심 종목이 없습니다." />}
        </div>
      </MobileSection>

      <MobileSection title="보유종목 점검" subtitle="기존 보유 논리를 카드로 압축했습니다.">
        <div className="space-y-3">
          {portfolioHoldings.slice(0, 8).map((holding) => {
            const stock = stockById.get(holding.stockId);
            return (
              <article key={holding.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-300">{holding.coreValueChain}</p>
                    <h3 className="mt-1 text-base font-black text-slate-50">{stock?.name ?? holding.stockId}</h3>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-300">
                    {holding.weight}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{holding.investmentThesis}</p>
              </article>
            );
          })}
        </div>
      </MobileSection>
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
  const highRiskStocks = [...model.domesticStocks]
    .sort((a, b) => b.preReflectionRiskScore - a.preReflectionRiskScore)
    .slice(0, 12);

  return (
    <MobilePage>
      <MobileSection title="기대치 부담 점검" subtitle="선반영 부담이 큰 종목을 모바일 카드로 봅니다.">
        <div className="space-y-3">
          {highRiskStocks.map((stock) => (
            <article key={stock.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
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
        <div className="mobile-admin-settings overflow-x-auto">
          <Settings />
        </div>
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
        <AdminLogin />
      </div>
    </MobilePage>
  );
}

export function MobileLayout() {
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
