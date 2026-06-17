import { Cpu, Star, TriangleAlert, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import {
  IndustryCycleRadarPanel,
  RiskEventCalendarPanel,
  ScenarioUpdateQueuePanel,
  SectorRotationPanel
} from "../components/InvestmentIntelligencePanels";
import { StatCard } from "../components/StatCard";
import { StockExternalLink } from "../components/StockExternalLink";
import { useFavorites } from "../context/FavoritesContext";
import { useMarketData } from "../context/MarketDataContext";
import { scenarios } from "../data/scenarios";
import { calculateFinalScore, calculatePreReflectionRisk, getFinalDecision } from "../lib/scoring";
import { cn, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import { getScreenerUrl, getValueChainUrl } from "../lib/externalLinks";
import {
  buildDashboardMarketList,
  buildDashboardSectorRows,
  dashboardListModeLabels,
  dashboardListModes,
  dashboardMarkets,
  formatDashboardMetricValue,
  type DashboardListMode,
  type DashboardMarket
} from "../lib/dashboardMarketLists";
import type { Stock } from "../types/stock";

function MarketFlowBoard({
  stocks,
  market,
  mode,
  onMarketChange,
  onModeChange
}: {
  stocks: Stock[];
  market: DashboardMarket;
  mode: DashboardListMode;
  onMarketChange: (market: DashboardMarket) => void;
  onModeChange: (mode: DashboardListMode) => void;
}) {
  const topRows = useMemo(() => buildDashboardMarketList(stocks, market, mode, 9), [market, mode, stocks]);
  const sectorRows = useMemo(() => buildDashboardSectorRows(stocks, market, mode, 6), [market, mode, stocks]);
  const metricLabel = dashboardListModeLabels[mode];
  const isEstimatedFlow = mode === "foreign" || mode === "institution";

  return (
    <section className="flex h-full flex-col rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-blue-600">금일 시장 흐름</p>
          <h2 className="mt-1 text-lg font-black">시장별 밸류체인 리스트</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            코스피·코스닥을 나눠 거래대금, 상승률, 수급 상위 종목을 섹터 단위로 봅니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="flex rounded-lg border border-radar-line bg-slate-50 p-1">
            {dashboardMarkets.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onMarketChange(item)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-black text-slate-600",
                  market === item && "bg-blue-600 text-white shadow-sm"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap rounded-lg border border-radar-line bg-slate-50 p-1">
            {dashboardListModes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onModeChange(item)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-black text-slate-600",
                  mode === item && "bg-slate-900 text-white shadow-sm"
                )}
              >
                {dashboardListModeLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid flex-1 grid-cols-[0.9fr_1.1fr] gap-4 max-2xl:grid-cols-1">
        <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-radar-ink">섹터별 상위 흐름</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">{sectorRows.length}개 섹터</span>
          </div>
          <div className="mt-3 space-y-2">
            {sectorRows.map((row, index) => (
              <Link
                key={row.sector}
                to={getValueChainUrl({ query: row.sector })}
                className="block rounded-lg border border-radar-line bg-white px-3 py-3 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-400">{index + 1}</p>
                    <h4 className="mt-1 truncate text-sm font-black text-radar-ink">{row.sector}</h4>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                      대표 {row.topStock.name} · 관련 {row.count}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-black", mode === "gainers" ? getMarketMoveTextClass(row.value) : "text-blue-700")}>
                      {formatDashboardMetricValue(row.value, mode)}
                    </p>
                    <p className={cn("mt-1 text-[11px] font-black", getMarketMoveTextClass(row.avgMove))}>
                      평균 {formatPercent(row.avgMove)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {!sectorRows.length ? (
              <div className="rounded-lg border border-dashed border-radar-line bg-white px-3 py-8 text-center text-sm font-bold text-slate-500">
                표시할 섹터 데이터가 없습니다.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-radar-ink">{market} {metricLabel} 상위</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">종목 {topRows.length}</span>
          </div>
          <div className="mt-3 divide-y divide-radar-line overflow-hidden rounded-lg border border-radar-line bg-white">
            {topRows.map((row, index) => (
              <div key={row.stock.id} className="flex items-center gap-3 px-3 py-3 hover:bg-blue-50/60">
                <Link to={getScreenerUrl({ stock: row.stock.id })} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-radar-ink">{row.stock.name}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">
                      {row.stock.ticker} · {row.sector}
                    </span>
                  </span>
                </Link>
                <span className={cn("shrink-0 text-right text-sm font-black", mode === "gainers" ? getMarketMoveTextClass(row.value) : "text-radar-ink")}>
                  {formatDashboardMetricValue(row.value, mode)}
                </span>
                <StockExternalLink stock={row.stock} compact />
              </div>
            ))}
            {!topRows.length ? (
              <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">표시할 종목 데이터가 없습니다.</div>
            ) : null}
          </div>
        </div>
      </div>

      {isEstimatedFlow ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          외국인·기관 순매수는 투자자별 수급 API 연결 전까지 거래량, 가격 반응, 섹터 점수 기반 보완 추정으로 표시됩니다.
        </p>
      ) : null}
    </section>
  );
}

export default function Dashboard() {
  const [market, setMarket] = useState<DashboardMarket>("KOSPI");
  const [flowMode, setFlowMode] = useState<DashboardListMode>("turnover");
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const { stocks, issues, alerts } = useMarketData();
  const { isFavorite } = useFavorites();
  const scoredStocks = useMemo(
    () =>
      stocks
        .map((stock) => {
          const risk = calculatePreReflectionRisk(stock);
          const score = calculateFinalScore(stock);
          return {
            ...stock,
            computedScore: score,
            computedDecision: getFinalDecision(score, risk, stock.earningsLinkScore, stock.assetType)
          };
        })
        .sort((a, b) => b.computedScore - a.computedScore),
    [stocks]
  );

  const scenarioMomentum = useMemo(
    () =>
      scenarios
        .map((scenario) => {
          const scenarioThemes = new Set(scenario.nodes.map((node) => node.theme));
          const related = stocks.filter(
            (stock) =>
              scenarioThemes.has(stock.theme) ||
              scenario.coreValueChains.some((chain) => `${stock.name} ${stock.sector} ${stock.theme}`.includes(chain.replace("/보안", "")))
          );
          const avgChange = related.length
            ? related.reduce((sum, stock) => sum + (stock.dailyChangeRate ?? stock.priceChange3M), 0) / related.length
            : 0;
          const topStock = [...related].sort((a, b) => (b.dailyChangeRate ?? b.priceChange3M) - (a.dailyChangeRate ?? a.priceChange3M))[0];
          return { scenario, avgChange, count: related.length, topStock };
        })
        .sort((a, b) => Math.abs(b.avgChange) - Math.abs(a.avgChange)),
    [stocks]
  );
  const currentScenario = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarioMomentum[0]?.scenario ?? scenarios[0];
  const currentScenarioMomentum = scenarioMomentum.find((item) => item.scenario.id === currentScenario.id);
  const currentScenarioUrl = `/scenario?scenario=${encodeURIComponent(currentScenario.id)}`;
  const currentValueChainUrl = getValueChainUrl({ scenario: currentScenario.id });
  const newCapturedUrl = getScreenerUrl({ capture: "new" });
  const favoriteStocks = useMemo(() => scoredStocks.filter((stock) => isFavorite(stock.id)), [isFavorite, scoredStocks]);
  const warningCount = useMemo(() => stocks.filter((stock) => calculatePreReflectionRisk(stock) >= 68).length, [stocks]);
  const newCapturedCount = useMemo(
    () =>
      scoredStocks.filter(
        (stock) =>
          (stock.market === "KOSPI" || stock.market === "KOSDAQ") &&
          stock.computedScore >= 70 &&
          ((stock.dailyChangeRate ?? stock.priceChange3M) >= 3 || (stock.volume ?? 0) > 0)
      ).length,
    [scoredStocks]
  );

  useEffect(() => {
    if (scenarioMomentum[0]?.scenario.id) {
      setScenarioId(scenarioMomentum[0].scenario.id);
    }
  }, [scenarioMomentum[0]?.scenario.id]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 items-start gap-5 max-xl:grid-cols-2">
        <Link to={currentValueChainUrl} className="block">
          <StatCard
            label="오늘 강한 밸류체인"
            value={currentScenarioMomentum?.count ?? 0}
            suffix="관련 종목"
            change={currentScenarioMomentum?.avgChange ?? 0}
            icon={<Zap size={28} fill="currentColor" />}
            tone="teal"
          />
        </Link>
        <Link to={newCapturedUrl} className="block">
          <StatCard label="신규 포착 종목" value={newCapturedCount} suffix="종목" change={newCapturedCount ? 12.5 : 0} icon={<Star size={28} fill="currentColor" />} />
        </Link>
        <Link to={getScreenerUrl({ decision: "과열 경고" })} className="block">
          <StatCard label="과열 경고" value={warningCount} suffix="종목" change={42.9} icon={<TriangleAlert size={28} fill="currentColor" />} tone="red" />
        </Link>
        <Link to="/alerts" className="block">
          <StatCard
            label="오늘 체크 알림"
            value={alerts.length}
            suffix="건"
            change={alerts.length ? 8.7 : 0}
            icon={<TriangleAlert size={28} />}
            tone="amber"
          />
        </Link>
      </div>

      <div className="grid grid-cols-[1.05fr_0.95fr] items-stretch gap-5 max-xl:grid-cols-1">
        <MarketFlowBoard
          stocks={stocks}
          market={market}
          mode={flowMode}
          onMarketChange={setMarket}
          onModeChange={setFlowMode}
        />

        <div className="grid h-full gap-5">
          <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card xl:h-[436px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">관심 후보 TOP 5</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">별표로 지정한 관심종목 중 종합점수 상위 기준</p>
              </div>
              <Link to={getScreenerUrl({ favorite: "1" })} className="text-sm font-bold text-blue-600">
                관심종목 관리
              </Link>
            </div>
            <DataTable headers={["순위", "종목명", "테마", "산업점수", "최종판정"]} className="mt-5">
              {!favoriteStocks.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                    아직 별표로 지정한 관심종목이 없습니다. 종목 스크리너에서 관심종목을 선택하면 이 영역에 표시됩니다.
                  </td>
                </tr>
              ) : null}
              {favoriteStocks.slice(0, 5).map((stock, index) => (
                <tr key={stock.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/valuation?stock=${stock.id}`} className="font-black text-radar-ink hover:text-blue-700">
                        {stock.name}
                      </Link>
                      <StockExternalLink stock={stock} compact />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{stock.theme}</td>
                  <td className="px-4 py-4 font-black text-blue-600">{stock.computedScore}</td>
                  <td className="px-4 py-4">
                    <Badge value={stock.computedDecision} />
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>

          <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">오늘의 핵심 시나리오</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  관련 종목 평균 당일 등락률과 상위 움직임 기준
                </p>
              </div>
              <Link to={currentScenarioUrl} className="text-sm font-bold text-blue-600">
                시나리오 상세 보기
              </Link>
            </div>
            <div className="mt-4 flex flex-col rounded-lg border border-radar-line bg-slate-50 p-4 xl:h-[340px] xl:overflow-hidden">
              <div className="mb-3 flex max-h-[74px] flex-wrap gap-2 overflow-hidden">
                {scenarioMomentum.slice(0, 5).map(({ scenario, avgChange }) => (
                  <button
                    key={scenario.id}
                    onClick={() => setScenarioId(scenario.id)}
                    className={cn(
                      "rounded-lg border border-radar-line px-2.5 py-1.5 text-xs font-black",
                      scenario.id === scenarioId ? "bg-blue-600 text-white" : "bg-white text-slate-600"
                    )}
                  >
                    {scenario.name.replace(" 사이클", "")}
                    <span
                      className={cn(
                        "ml-2",
                        scenario.id === scenarioId
                          ? avgChange >= 0 ? "text-red-100" : "text-blue-100"
                          : getMarketMoveTextClass(avgChange)
                      )}
                    >
                      {formatPercent(avgChange)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Cpu size={22} />
                </span>
                <h3 className="line-clamp-1 text-lg font-black">{currentScenario.name}</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-5 text-slate-700">
                {currentScenarioMomentum?.topStock ? (
                  <li className="flex items-start gap-2 font-black text-blue-700">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                    오늘 대표 움직임: {currentScenarioMomentum.topStock.name} {formatPercent(currentScenarioMomentum.topStock.dailyChangeRate ?? currentScenarioMomentum.topStock.priceChange3M)}
                  </li>
                ) : null}
                {currentScenario.summary.slice(0, 2).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {currentScenario.coreValueChains.slice(0, 5).map((chain) => (
                  <Link
                    key={chain}
                    to={getValueChainUrl({ scenario: currentScenario.id, query: chain.replace("/보안", "") })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-radar-line bg-white px-3 py-2 text-center"
                  >
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-xs font-black">{chain}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="space-y-5">
        <IndustryCycleRadarPanel stocks={stocks} compact />
        <SectorRotationPanel stocks={stocks} />
        <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
          <ScenarioUpdateQueuePanel stocks={stocks} />
          <RiskEventCalendarPanel stocks={stocks} issues={issues} alerts={alerts} title="오늘 확인할 리스트" />
        </div>
      </div>
    </div>
  );
}
