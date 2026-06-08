import { BookmarkCheck, ExternalLink, Filter, Gauge, RotateCcw, Search, Settings2, Sparkles, Star, Target, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import {
  CaptureHistoryPanel,
  ScoreContributionPanel,
  ScoreTrendPanel,
  StockResearchTabs,
  StockWarningPanel,
  ThemeEarningsCalendarPanel
} from "../components/DecisionSupportPanels";
import { AlternativeExposurePanel, InvestmentChecklistPanel } from "../components/InvestmentIntelligencePanels";
import { RadarScoreCard } from "../components/RadarScoreCard";
import { ScoreBar } from "../components/ScoreBar";
import { StockExternalLink } from "../components/StockExternalLink";
import { useFavorites } from "../context/FavoritesContext";
import { useMarketData } from "../context/MarketDataContext";
import { scenarios } from "../data/scenarios";
import { cn, formatCurrency, formatMarketCap, formatNumber, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import {
  getMatchedScenarios as getSharedMatchedScenarios,
  getScenarioOptionLabel as getSharedScenarioOptionLabel,
  getScenarioSearchText as getSharedScenarioSearchText,
  resolveScenarioFilterParam as resolveSharedScenarioFilterParam,
  stockMatchesScenario as stockMatchesSharedScenario
} from "../lib/scenarioMatching";
import { buildScoreProfile, getFinalDecision } from "../lib/scoring";
import {
  getTechnicalSignals,
  getTechnicalSignalStrength,
  isExactHistoricalTechnicalFilter,
  isTechnicalVerificationCandidate,
  matchesTechnicalSignal,
  technicalSignalOptions,
  technicalFilterToKind,
  technicalWindowOptions,
  technicalWindowToDays,
  type TechnicalSignalFilter,
  type TechnicalSignalWindow
} from "../lib/technicalSignals";
import type { Scenario } from "../types/scenario";
import type { FinalDecision, Market, Stock, StockTechnicalSignal, ValuationStatus } from "../types/stock";

const marketOptions: Array<"전체" | Market> = ["전체", "KOSPI", "KOSDAQ"];
const valuationOptions: Array<"전체" | ValuationStatus> = ["전체", "저평가", "적정", "기대 반영", "과열", "버블 위험"];
const decisionOptions: Array<"전체" | FinalDecision> = [
  "전체",
  "매수 검토",
  "조정 대기",
  "실적 확인 대기",
  "과열 경고",
  "테마 노출 검토",
  "분할 접근",
  "관망",
  "상품 구조 확인",
  "제외"
];
const assetTypeOptions = ["전체", "일반종목", "우선주", "ETF·상장상품"] as const;
const sortOptions = [
  "종합점수 높은 순",
  "시장 주도성 높은 순",
  "시가총액 높은 순",
  "시가총액 낮은 순",
  "선반영위험 낮은 순",
  "등락률 높은 순",
  "기술신호 강한 순"
] as const;

type SortOption = (typeof sortOptions)[number];
type AssetTypeFilter = (typeof assetTypeOptions)[number];

type HistoricalTechnicalVerification = {
  key: string;
  loading: boolean;
  matches: Record<string, StockTechnicalSignal[]>;
  sourceLabel?: string;
  checkedCount?: number;
  matchedCount?: number;
  errorCount?: number;
  sampleErrors?: string[];
  error?: string;
};

function isDomesticStock(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

function SelectBox<T extends string>({
  label,
  value,
  options,
  onChange,
  getOptionLabel
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  getOptionLabel?: (value: T) => string;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-black text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 rounded-lg border border-radar-line bg-white px-3 text-sm font-bold text-radar-ink outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InsightTile({
  icon,
  label,
  value,
  sub
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-radar-line bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 text-xl font-black text-radar-ink dark:text-slate-50">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}

function formatStockPrice(stock: Stock) {
  return stock.market.startsWith("US")
    ? `$${formatNumber(stock.currentPrice, 2)}`
    : formatCurrency(stock.currentPrice);
}

function formatStockMarketCap(stock: Stock) {
  if (stock.market.startsWith("US")) {
    return `$${formatNumber(stock.marketCap / 10, 1)}B`;
  }

  return formatMarketCap(stock.marketCap);
}

function getMarketOptionLabel(option: "전체" | Market) {
  if (option === "US Large Cap") return "미국 대형주";
  if (option === "US Growth") return "미국 성장주";
  return option;
}

function getMarketDisplay(stock: Stock) {
  if (stock.market === "US Large Cap") return "미국 대형주";
  if (stock.market === "US Growth") return "미국 성장주";
  return stock.market;
}

function getMarketSubLabel(stock: Stock) {
  if (stock.market === "US Large Cap") {
    return `${stock.exchange ?? "미국"} · 시총 1,000억 달러 이상`;
  }
  if (stock.market === "US Growth") {
    return `${stock.exchange ?? "미국"} · 성장/중형 유니버스`;
  }
  return "국내 상장";
}

function getAssetTypeLabel(stock: Stock): Exclude<AssetTypeFilter, "전체"> | "ADR" {
  if (stock.assetType === "ETF") return "ETF·상장상품";
  if (stock.assetType === "PREFERRED") return "우선주";
  if (stock.assetType === "ADR") return "ADR";
  return "일반종목";
}

type ScenarioFilter = "전체" | string;

function getScenarioOptionLabel(option: ScenarioFilter) {
  return getSharedScenarioOptionLabel(option);
}

function resolveScenarioFilterParam(value: string | null): ScenarioFilter {
  return resolveSharedScenarioFilterParam(value);
}

function stockMatchesScenario(stock: Stock, scenario: Scenario) {
  return stockMatchesSharedScenario(stock, scenario);
}

function getMatchedScenarios(stock: Stock) {
  return getSharedMatchedScenarios(stock);
}

function getScenarioSearchText(stock: Stock, matchedScenarios: Scenario[]) {
  return getSharedScenarioSearchText(stock, matchedScenarios);
}

function getScoreColumnLabels(assetType: AssetTypeFilter) {
  if (assetType === "ETF·상장상품") {
    return {
      total: "ETF 점수",
      first: "유동성/AUM",
      second: "분산도",
      third: "모멘텀",
      risk: "상품위험"
    };
  }

  return {
    total: "종합점수",
    first: "시장주도성",
    second: "구조핵심성",
    third: "실적/밸류",
    risk: "위험"
  };
}

type ScoredScreenerStock = Stock & {
  scoreProfile: ReturnType<typeof buildScoreProfile>;
  computedScore: number;
  computedRisk: number;
  computedDecision: FinalDecision;
  scenarioMatches: Scenario[];
  primaryScenario: Scenario | null;
  scenarioSearchText: string;
  technicalSignals: StockTechnicalSignal[];
  technicalSignalStrength: number;
};

function isNewCapturedStock(stock: ScoredScreenerStock) {
  const move = stock.dailyChangeRate ?? stock.priceChange3M;
  return stock.computedScore >= 70 && (stock.technicalSignals.length > 0 || move >= 3);
}

function getDisplayScenario(stock: ScoredScreenerStock, scenarioFilter: ScenarioFilter) {
  if (scenarioFilter !== "전체") {
    return stock.scenarioMatches.find((scenario) => scenario.id === scenarioFilter) ?? stock.primaryScenario;
  }

  return stock.primaryScenario;
}

function getScenarioChainSummary(scenario: Scenario | null, fallback: string) {
  const chains = scenario?.coreValueChains.filter(Boolean).slice(0, 3) ?? [];
  return chains.length ? chains.join(" · ") : fallback;
}

function getCaptureReasons(stock: ScoredScreenerStock) {
  const structuralCore = Math.round((stock.scoreProfile.valueChainScore + stock.scoreProfile.companyCentralityScore) / 2);
  const earningsValue = Math.round((stock.scoreProfile.earningsLinkScore + stock.scoreProfile.valuationJustificationScore) / 2);
  const dailyMove = stock.dailyChangeRate ?? stock.priceChange3M;
  const reasons: string[] = [];

  if (stock.scoreProfile.marketAttentionScore >= 85) {
    reasons.push(`시장주도성 ${Math.round(stock.scoreProfile.marketAttentionScore)}`);
  }
  if (structuralCore >= 85) {
    reasons.push(`구조핵심성 ${structuralCore}`);
  }
  if (earningsValue >= 75) {
    reasons.push(`실적/밸류 ${earningsValue}`);
  }
  if (stock.computedRisk >= 60) {
    reasons.push(`선반영위험 ${stock.computedRisk}`);
  }
  if (stock.technicalSignals.length) {
    const signal = stock.technicalSignals[0];
    reasons.push(signal.kind.includes("Volume") ? "거래량 급증" : signal.label);
  }
  if (dailyMove >= 2) {
    reasons.push(`당일 ${formatPercent(dailyMove)}`);
  }

  return reasons.slice(0, 3);
}

function sortStocks<
  T extends Stock & {
    computedScore: number;
    computedRisk: number;
    technicalSignalStrength: number;
    scoreProfile: { marketAttentionScore: number };
  }
>(stocks: T[], sort: SortOption) {
  const copied = [...stocks];

  switch (sort) {
    case "시장 주도성 높은 순":
      return copied.sort((a, b) => b.scoreProfile.marketAttentionScore - a.scoreProfile.marketAttentionScore);
    case "시가총액 높은 순":
      return copied.sort((a, b) => b.marketCap - a.marketCap);
    case "시가총액 낮은 순":
      return copied.sort((a, b) => a.marketCap - b.marketCap);
    case "선반영위험 낮은 순":
      return copied.sort((a, b) => a.computedRisk - b.computedRisk);
    case "등락률 높은 순":
      return copied.sort((a, b) => (b.dailyChangeRate ?? b.priceChange3M) - (a.dailyChangeRate ?? a.priceChange3M));
    case "기술신호 강한 순":
      return copied.sort((a, b) => b.technicalSignalStrength - a.technicalSignalStrength);
    default:
      return copied.sort((a, b) => b.computedScore - a.computedScore);
  }
}

export default function Screener() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { stocks } = useMarketData();
  const domesticStocks = useMemo(() => stocks.filter(isDomesticStock), [stocks]);
  const scenarioOptions = useMemo<ScenarioFilter[]>(() => ["전체", ...scenarios.map((scenario) => scenario.id)], []);
  const initialMarket = marketOptions.includes(searchParams.get("market") as (typeof marketOptions)[number])
    ? (searchParams.get("market") as (typeof marketOptions)[number])
    : "전체";
  const initialScenario = resolveScenarioFilterParam(searchParams.get("scenario") ?? searchParams.get("theme"));
  const initialValuation = valuationOptions.includes(searchParams.get("valuation") as (typeof valuationOptions)[number])
    ? (searchParams.get("valuation") as (typeof valuationOptions)[number])
    : "전체";
  const initialDecision = decisionOptions.includes(searchParams.get("decision") as (typeof decisionOptions)[number])
    ? (searchParams.get("decision") as (typeof decisionOptions)[number])
    : "전체";
  const initialAssetType = assetTypeOptions.includes(searchParams.get("assetType") as AssetTypeFilter)
    ? (searchParams.get("assetType") as AssetTypeFilter)
    : "전체";
  const initialTechnicalSignal = technicalSignalOptions.includes(searchParams.get("technical") as TechnicalSignalFilter)
    ? (searchParams.get("technical") as TechnicalSignalFilter)
    : technicalSignalOptions[0];
  const initialTechnicalWindow = technicalWindowOptions.includes(searchParams.get("technicalWindow") as TechnicalSignalWindow)
    ? (searchParams.get("technicalWindow") as TechnicalSignalWindow)
    : technicalWindowOptions[0];
  const initialFavoriteOnly = searchParams.get("favorite") === "1";
  const initialNewCapturedOnly = searchParams.get("capture") === "new";

  const [market, setMarket] = useState<(typeof marketOptions)[number]>(initialMarket);
  const [assetType, setAssetType] = useState<AssetTypeFilter>(initialAssetType);
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>(initialScenario);
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [minMarketCap, setMinMarketCap] = useState("");
  const [maxMarketCap, setMaxMarketCap] = useState("");
  const [valuation, setValuation] = useState<(typeof valuationOptions)[number]>(initialValuation);
  const [decision, setDecision] = useState<(typeof decisionOptions)[number]>(initialDecision);
  const [technicalSignal, setTechnicalSignal] = useState<TechnicalSignalFilter>(initialTechnicalSignal);
  const [technicalWindow, setTechnicalWindow] = useState<TechnicalSignalWindow>(initialTechnicalWindow);
  const [historicalVerification, setHistoricalVerification] = useState<HistoricalTechnicalVerification>({
    key: "",
    loading: false,
    matches: {}
  });
  const [sort, setSort] = useState<SortOption>("종합점수 높은 순");
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [favoriteOnly, setFavoriteOnly] = useState(initialFavoriteOnly);
  const [newCapturedOnly, setNewCapturedOnly] = useState(initialNewCapturedOnly);
  const [selectedId, setSelectedId] = useState(searchParams.get("stock") ?? "");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { favoriteCount, isFavorite, toggleFavorite } = useFavorites();

  const scoredStocks = useMemo(
    () =>
      domesticStocks.map((stock) => {
        const scoreProfile = buildScoreProfile(stock);
        const scenarioMatches = getMatchedScenarios(stock);
        const computedDecision = getFinalDecision(
          scoreProfile.finalScore,
          scoreProfile.preReflectionRiskScore,
          scoreProfile.earningsLinkScore,
          stock.assetType
        );
        return {
          ...stock,
          scoreProfile,
          computedScore: scoreProfile.finalScore,
          computedRisk: scoreProfile.preReflectionRiskScore,
          computedDecision,
          scenarioMatches,
          primaryScenario: scenarioMatches[0] ?? null,
          scenarioSearchText: getScenarioSearchText(stock, scenarioMatches),
          technicalSignals: getTechnicalSignals(stock),
          technicalSignalStrength: getTechnicalSignalStrength(stock)
        };
      }),
    [domesticStocks]
  );

  const baseFiltered = useMemo(
    () =>
      scoredStocks
        .filter((stock) => market === "전체" || stock.market === market)
        .filter((stock) => assetType === "전체" || getAssetTypeLabel(stock) === assetType)
        .filter((stock) => !favoriteOnly || isFavorite(stock.id))
        .filter((stock) => !newCapturedOnly || isNewCapturedStock(stock))
        .filter((stock) => scenarioFilter === "전체" || stock.scenarioMatches.some((scenario) => scenario.id === scenarioFilter))
        .filter((stock) => stock.computedScore >= Number(minScore) && stock.computedScore <= Number(maxScore))
        .filter((stock) => {
          const min = Number(minMarketCap);
          const max = Number(maxMarketCap);
          if (minMarketCap && stock.marketCap < min) return false;
          if (maxMarketCap && Number.isFinite(max) && stock.marketCap > max) return false;
          return true;
        })
        .filter((stock) => valuation === "전체" || stock.valuationStatus === valuation)
        .filter((stock) => decision === "전체" || stock.computedDecision === decision)
        .filter((stock) =>
          query.trim()
            ? stock.scenarioSearchText.includes(query.trim().toLowerCase())
            : true
        ),
    [assetType, decision, favoriteOnly, isFavorite, maxMarketCap, maxScore, market, minMarketCap, minScore, newCapturedOnly, query, scenarioFilter, scoredStocks, valuation]
  );

  const exactTechnicalKind = technicalFilterToKind(technicalSignal);
  const isExactTechnicalFilter = Boolean(exactTechnicalKind && isExactHistoricalTechnicalFilter(technicalSignal));
  const exactTechnicalWindowDays = exactTechnicalKind ? technicalWindowToDays(technicalWindow, exactTechnicalKind) : 0;
  const exactTechnicalSymbols = useMemo(
    () =>
      isExactTechnicalFilter
        ? baseFiltered
            .filter((stock) => stock.market === "KOSPI" || stock.market === "KOSDAQ")
            .map((stock) => stock.ticker)
        : [],
    [baseFiltered, isExactTechnicalFilter]
  );
  const exactTechnicalRequestKey = useMemo(
    () =>
      isExactTechnicalFilter
        ? `${exactTechnicalKind}:${exactTechnicalWindowDays}:${exactTechnicalSymbols.join(",")}`
        : "",
    [exactTechnicalKind, exactTechnicalSymbols, exactTechnicalWindowDays, isExactTechnicalFilter]
  );

  useEffect(() => {
    if (!isExactTechnicalFilter || !exactTechnicalKind) {
      setHistoricalVerification({ key: "", loading: false, matches: {} });
      return;
    }

    if (!exactTechnicalSymbols.length) {
      setHistoricalVerification({
        key: exactTechnicalRequestKey,
        loading: false,
        matches: {},
        sourceLabel: "네이버페이증권 일별 차트 참고 데이터",
        checkedCount: 0,
        matchedCount: 0,
        errorCount: 0,
        sampleErrors: []
      });
      return;
    }

    const controller = new AbortController();
    setHistoricalVerification((current) => ({
      key: exactTechnicalRequestKey,
      loading: current.key !== exactTechnicalRequestKey,
      matches: current.key === exactTechnicalRequestKey ? current.matches : {},
      sourceLabel: current.sourceLabel
    }));

    fetch("/api/technical-signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: exactTechnicalSymbols,
        kind: exactTechnicalKind,
        windowDays: exactTechnicalWindowDays
      }),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`technical-signals ${response.status}`);
        return response.json() as Promise<{
          sourceLabel?: string;
          checkedCount?: number;
          matchedCount?: number;
          errorCount?: number;
          errors?: string[];
          matches?: Array<{ symbol: string; signals: StockTechnicalSignal[] }>;
        }>;
      })
      .then((data) => {
        const matches = Object.fromEntries((data.matches ?? []).map((item) => [item.symbol, item.signals]));
        setHistoricalVerification({
          key: exactTechnicalRequestKey,
          loading: false,
          matches,
          sourceLabel: data.sourceLabel ?? "네이버페이증권 일별 차트 참고 데이터",
          checkedCount: data.checkedCount ?? exactTechnicalSymbols.length,
          matchedCount: data.matchedCount ?? (data.matches ?? []).length,
          errorCount: data.errorCount ?? 0,
          sampleErrors: data.errors?.slice(0, 3) ?? []
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setHistoricalVerification({
          key: exactTechnicalRequestKey,
          loading: false,
          matches: {},
          sourceLabel: "네이버페이증권 일별 차트 참고 데이터",
          checkedCount: 0,
          matchedCount: 0,
          errorCount: 0,
          sampleErrors: [],
          error: error instanceof Error ? error.message : "기술 이벤트 검증 실패"
        });
      });

    return () => controller.abort();
  }, [exactTechnicalKind, exactTechnicalRequestKey, exactTechnicalSymbols, exactTechnicalWindowDays, isExactTechnicalFilter]);

  useEffect(() => {
    setPage(1);
  }, [assetType, decision, favoriteOnly, maxMarketCap, maxScore, market, minMarketCap, minScore, newCapturedOnly, query, scenarioFilter, sort, technicalSignal, technicalWindow, valuation]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (market !== marketOptions[0]) next.set("market", market);
    if (assetType !== assetTypeOptions[0]) next.set("assetType", assetType);
    if (scenarioFilter !== scenarioOptions[0]) next.set("scenario", scenarioFilter);
    if (valuation !== valuationOptions[0]) next.set("valuation", valuation);
    if (decision !== decisionOptions[0]) next.set("decision", decision);
    if (technicalSignal !== technicalSignalOptions[0]) next.set("technical", technicalSignal);
    if (technicalWindow !== technicalWindowOptions[0]) next.set("technicalWindow", technicalWindow);
    if (favoriteOnly) next.set("favorite", "1");
    if (newCapturedOnly) next.set("capture", "new");
    if (query.trim()) next.set("query", query.trim());
    if (selectedId) next.set("stock", selectedId);
    setSearchParams(next, { replace: true });
  }, [
    assetType,
    decision,
    favoriteOnly,
    market,
    newCapturedOnly,
    query,
    scenarioFilter,
    scenarioOptions,
    selectedId,
    setSearchParams,
    technicalSignal,
    technicalWindow,
    valuation
  ]);

  useEffect(() => {
    if (!isDetailOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDetailOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDetailOpen]);

  const enrichedBaseFiltered = useMemo(
    () =>
      baseFiltered.map((stock) => {
        const historicalSignals = historicalVerification.matches[stock.ticker] ?? [];
        if (!historicalSignals.length) return stock;

        const derivedSignals = getTechnicalSignals(stock).filter(
          (signal) => !historicalSignals.some((historical) => historical.kind === signal.kind)
        );

        return {
          ...stock,
          technicalSignals: [...historicalSignals, ...derivedSignals],
          technicalSignalStrength: Math.max(
            stock.technicalSignalStrength,
            ...historicalSignals.map((signal) => signal.strength)
          )
        };
      }),
    [baseFiltered, historicalVerification.matches]
  );

  const filtered = sortStocks(
    enrichedBaseFiltered.filter((stock) => {
      if (!isExactTechnicalFilter) {
        return matchesTechnicalSignal(stock, technicalSignal, technicalWindow);
      }

      if (historicalVerification.key !== exactTechnicalRequestKey || historicalVerification.loading) {
        return false;
      }

      if (historicalVerification.error) {
        return false;
      }

      if (stock.market !== "KOSPI" && stock.market !== "KOSDAQ") {
        return false;
      }

      const historicalSignals = historicalVerification.matches[stock.ticker] ?? [];
      return historicalSignals.some(
        (signal) =>
          signal.source === "HISTORICAL" &&
          signal.kind === exactTechnicalKind &&
          signal.daysAgo <= exactTechnicalWindowDays
      );
    }),
    sort
  );

  const selected =
    enrichedBaseFiltered.find((stock) => stock.id === selectedId) ??
    filtered[0] ??
    scoredStocks.find((stock) => stock.id === selectedId) ??
    scoredStocks[0];
  const selectedScenario = selected ? getDisplayScenario(selected, scenarioFilter) : null;
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedFiltered = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const exactTechnicalCandidateCount = exactTechnicalKind
    ? baseFiltered.filter(
        (stock) =>
          (stock.market === "KOSPI" || stock.market === "KOSDAQ") &&
          isTechnicalVerificationCandidate(stock, exactTechnicalKind)
      ).length
    : 0;
  const exactTechnicalMatchedCount = Object.keys(historicalVerification.matches).length;
  const scoreColumnLabels = getScoreColumnLabels(assetType);
  const activeFilters = [
    market !== marketOptions[0] ? { key: "market", label: `시장 ${getMarketOptionLabel(market)}`, clear: () => setMarket(marketOptions[0]) } : null,
    assetType !== assetTypeOptions[0] ? { key: "asset", label: `자산 ${assetType}`, clear: () => setAssetType(assetTypeOptions[0]) } : null,
    scenarioFilter !== scenarioOptions[0]
      ? { key: "scenario", label: `시나리오 ${getScenarioOptionLabel(scenarioFilter)}`, clear: () => setScenarioFilter(scenarioOptions[0]) }
      : null,
    minScore !== "0" || maxScore !== "100" ? { key: "score", label: `점수 ${minScore}-${maxScore}`, clear: () => { setMinScore("0"); setMaxScore("100"); } } : null,
    minMarketCap || maxMarketCap ? { key: "cap", label: `시총 ${minMarketCap || "하한 없음"}-${maxMarketCap || "상한 없음"}`, clear: () => { setMinMarketCap(""); setMaxMarketCap(""); } } : null,
    valuation !== valuationOptions[0] ? { key: "valuation", label: `밸류 ${valuation}`, clear: () => setValuation(valuationOptions[0]) } : null,
    decision !== decisionOptions[0] ? { key: "decision", label: `판정 ${decision}`, clear: () => setDecision(decisionOptions[0]) } : null,
    technicalSignal !== technicalSignalOptions[0] ? { key: "tech", label: `기술 ${technicalSignal}`, clear: () => setTechnicalSignal(technicalSignalOptions[0]) } : null,
    newCapturedOnly ? { key: "capture", label: "신규 포착", clear: () => setNewCapturedOnly(false) } : null,
    favoriteOnly ? { key: "favorite", label: `관심종목 ${favoriteCount}개`, clear: () => setFavoriteOnly(false) } : null,
    query.trim() ? { key: "query", label: `검색 ${query.trim()}`, clear: () => setQuery("") } : null
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  const filteredStats = useMemo(() => {
    const count = filtered.length;
    const avgScore = count ? Math.round(filtered.reduce((sum, stock) => sum + stock.computedScore, 0) / count) : 0;
    const avgMove = count
      ? filtered.reduce((sum, stock) => sum + (stock.dailyChangeRate ?? stock.priceChange3M), 0) / count
      : 0;
    const technicalCount = filtered.filter((stock) => stock.technicalSignals.length).length;
    const favoritesInResult = filtered.filter((stock) => isFavorite(stock.id)).length;
    const topScenario =
      Object.entries(
        filtered.reduce<Record<string, number>>((acc, stock) => {
          const scenarioName = getDisplayScenario(stock, scenarioFilter)?.name ?? "시나리오 미분류";
          acc[scenarioName] = (acc[scenarioName] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "조건 없음";

    return { avgMove, avgScore, count, favoritesInResult, technicalCount, topScenario };
  }, [filtered, isFavorite, scenarioFilter]);

  const applyPreset = (preset: "leaders" | "technical" | "value" | "favorites" | "captured") => {
    setPage(1);
    setIsDetailOpen(false);
    if (preset === "leaders") {
      setMarket(marketOptions[0]);
      setAssetType(assetTypeOptions[0]);
      setScenarioFilter(scenarioOptions[0]);
      setMinScore("80");
      setMaxScore("100");
      setValuation(valuationOptions[0]);
      setDecision(decisionOptions[0]);
      setTechnicalSignal(technicalSignalOptions[0]);
      setSort(sortOptions[1]);
      setFavoriteOnly(false);
      setNewCapturedOnly(false);
      return;
    }
    if (preset === "technical") {
      setTechnicalSignal(technicalSignalOptions[1]);
      setTechnicalWindow(technicalWindowOptions[0]);
      setMinScore("60");
      setMaxScore("100");
      setSort(sortOptions[6]);
      setFavoriteOnly(false);
      setNewCapturedOnly(false);
      return;
    }
    if (preset === "captured") {
      setMarket(marketOptions[0]);
      setAssetType(assetTypeOptions[0]);
      setScenarioFilter(scenarioOptions[0]);
      setMinScore("70");
      setMaxScore("100");
      setValuation(valuationOptions[0]);
      setDecision(decisionOptions[0]);
      setTechnicalSignal(technicalSignalOptions[0]);
      setTechnicalWindow(technicalWindowOptions[0]);
      setSort(sortOptions[6]);
      setFavoriteOnly(false);
      setNewCapturedOnly(true);
      return;
    }
    if (preset === "value") {
      setValuation(valuationOptions[1]);
      setMinScore("60");
      setMaxScore("100");
      setSort(sortOptions[0]);
      setFavoriteOnly(false);
      setNewCapturedOnly(false);
      return;
    }
    setFavoriteOnly(true);
    setNewCapturedOnly(false);
    setSort(sortOptions[0]);
  };

  const reset = () => {
    setMarket("전체");
    setAssetType("전체");
    setScenarioFilter("전체");
    setMinScore("0");
    setMaxScore("100");
    setMinMarketCap("");
    setMaxMarketCap("");
    setValuation("전체");
    setDecision("전체");
    setTechnicalSignal("전체");
    setTechnicalWindow(technicalWindowOptions[0]);
    setSort("종합점수 높은 순");
    setQuery("");
    setFavoriteOnly(false);
    setNewCapturedOnly(false);
    setPage(1);
    setIsDetailOpen(false);
    setSearchParams({});
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold leading-6 text-slate-600">
            시장, 자산유형, 산업 시나리오, 기술 이벤트를 조합해 후보군을 좁혀보세요. 행을 클릭하면 오른쪽에서 상세 점수와 체크리스트를 확인할 수 있습니다.
          </p>
        </div>

        <div className="mb-4 grid gap-3 xl:grid-cols-[1.15fr_1fr]">
          <div className="rounded-lg border border-radar-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-black text-radar-ink dark:text-slate-50">빠른 탐색 프리셋</p>
                <p className="text-xs font-bold text-slate-500">자주 쓰는 조건을 한 번에 적용합니다.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyPreset("leaders")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                주도주 찾기
              </button>
              <button onClick={() => applyPreset("technical")} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-100">
                기술 이벤트
              </button>
              <button onClick={() => applyPreset("captured")} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">
                신규 포착
              </button>
              <button onClick={() => applyPreset("value")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">
                저평가 후보
              </button>
              <button onClick={() => applyPreset("favorites")} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                관심종목만
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-radar-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-3 flex items-center gap-2">
              <Filter size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-black text-radar-ink dark:text-slate-50">현재 적용 조건</p>
                <p className="text-xs font-bold text-slate-500">칩을 누르면 해당 조건만 해제됩니다.</p>
              </div>
            </div>
            <div className="flex min-h-9 flex-wrap gap-2">
              {activeFilters.length ? (
                activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={filter.clear}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm hover:border-blue-300"
                  >
                    {filter.label}
                    <X size={12} />
                  </button>
                ))
              ) : (
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500">전체 universe 조회 중</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(6,minmax(145px,1fr))_1.25fr_auto] gap-4 max-2xl:grid-cols-4 max-xl:grid-cols-2">
          <SelectBox
            label="시장/유니버스"
            value={market}
            options={marketOptions}
            onChange={setMarket}
            getOptionLabel={getMarketOptionLabel}
          />
          <SelectBox label="자산유형" value={assetType} options={[...assetTypeOptions]} onChange={setAssetType} />
          <SelectBox
            label="산업 시나리오"
            value={scenarioFilter}
            options={scenarioOptions}
            onChange={setScenarioFilter}
            getOptionLabel={getScenarioOptionLabel}
          />
          <label className="flex flex-col gap-2 text-xs font-black text-slate-700">
            종합점수 범위
            <div className="flex gap-2">
              <select
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
                className="h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
              >
                {[0, 50, 60, 70, 80].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                className="h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
              >
                {[100, 90, 80, 70, 60].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex flex-col gap-2 text-xs font-black text-slate-700">
            시가총액 범위
            <div className="flex gap-2">
              <input
                value={minMarketCap}
                onChange={(event) => setMinMarketCap(event.target.value)}
                type="number"
                placeholder="하한"
                className="h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold outline-none focus:border-blue-500"
              />
              <input
                value={maxMarketCap}
                onChange={(event) => setMaxMarketCap(event.target.value)}
                type="number"
                placeholder="상한"
                className="h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400">국내: 억 원 단위</span>
          </label>
          <SelectBox label="밸류 상태" value={valuation} options={valuationOptions} onChange={setValuation} />
          <SelectBox label="최종판정" value={decision} options={decisionOptions} onChange={setDecision} />
          <SelectBox label="기술 이벤트" value={technicalSignal} options={technicalSignalOptions} onChange={setTechnicalSignal} />
          <SelectBox label="발생 기간" value={technicalWindow} options={technicalWindowOptions} onChange={setTechnicalWindow} />
          <label className="flex flex-col gap-2 text-xs font-black text-slate-700">
            종목명 검색
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="종목명, 코드, 섹터 입력"
                className="h-11 w-full rounded-lg border border-radar-line bg-white pl-10 pr-10 text-sm font-bold outline-none focus:border-blue-500"
              />
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="검색어 지우기"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </label>
          <button
            type="button"
            onClick={() => setFavoriteOnly((value) => !value)}
            className={cn(
              "mt-6 flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black",
              favoriteOnly
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-radar-line bg-white text-slate-700"
            )}
          >
            <BookmarkCheck size={16} />
            관심종목만
          </button>
          <button
            onClick={reset}
            className="mt-6 flex h-11 items-center justify-center gap-2 rounded-lg border border-radar-line bg-white px-4 text-sm font-black text-slate-700"
          >
            <RotateCcw size={16} />
            필터 초기화
          </button>
        </div>
      </section>

      <div className="space-y-5">
        <section className="min-w-0 rounded-lg border border-radar-line bg-white p-5 shadow-card">
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InsightTile
              icon={<Target size={16} />}
              label="검색 결과"
              value={`${filteredStats.count}개`}
              sub={`상위 시나리오 ${filteredStats.topScenario}`}
            />
            <InsightTile
              icon={<Gauge size={16} />}
              label="평균 점수"
              value={`${filteredStats.avgScore}점`}
              sub="필터 통과 종목 평균"
            />
            <InsightTile
              icon={<TrendingUp size={16} />}
              label="평균 등락률"
              value={formatPercent(filteredStats.avgMove)}
              sub="당일 또는 기준 등락률"
            />
            <InsightTile
              icon={<BookmarkCheck size={16} />}
              label="관심 포함"
              value={`${filteredStats.favoritesInResult}개`}
              sub={`전체 관심 ${favoriteCount}개`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">
              검색 결과 <span className="text-blue-600">{filtered.length}</span>개
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              전체 universe {domesticStocks.length}개 · 선택한 조건으로 산업 시나리오/시총/점수 필터링
            </p>
            <p className="mt-1 text-xs font-black text-blue-600">
              표의 종목 행을 클릭하면 오른쪽에서 상세 점수와 투자 체크리스트가 열립니다.
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              기술 이벤트 권장 기준: 거래량 급증 추정 최근 10거래일, 신고가 추정 최근 20거래일
            </p>
            {isExactTechnicalFilter ? (
              <p className={cn("mt-1 text-xs font-black", historicalVerification.error ? "text-red-600" : "text-blue-600")}>
                {historicalVerification.loading
                  ? `국내 시계열 검증 중 · ${exactTechnicalSymbols.length}개 종목 확인 중 · 1차 후보 ${exactTechnicalCandidateCount}개는 완료 전까지 숨깁니다.`
                  : historicalVerification.error
                    ? `시계열 확인 실패: ${historicalVerification.error} · 확인되지 않은 후보는 표시하지 않습니다.`
                    : exactTechnicalSymbols.length
                    ? `시계열 확인 완료: 국내 ${historicalVerification.checkedCount ?? exactTechnicalSymbols.length}개 확인 · 실제 이벤트 ${exactTechnicalMatchedCount}개 · 최근 ${exactTechnicalWindowDays}거래일 기준`
                      : "정확 시계열 검증이 어려운 역대/52주 신고가·최대거래량 옵션은 숨기고, 거래량 급증 추정과 신고가 추정만 제공합니다."}
              </p>
            ) : (
              <p className="mt-1 text-xs font-bold text-slate-500">
                거래량 급증 추정과 신고가 추정은 가격 위치, 거래대금 회전율, 당일 등락률, 중기 추세를 함께 반영합니다.
              </p>
            )}
            {isExactTechnicalFilter && !historicalVerification.loading && historicalVerification.sampleErrors?.length ? (
              <p className="mt-1 text-xs font-bold text-amber-600">
                일부 종목 조회 실패: {historicalVerification.sampleErrors.join(" · ")}
              </p>
            ) : null}
          </div>
            <div className="flex items-center gap-2">
              <SelectBox label="정렬 기준" value={sort} options={[...sortOptions]} onChange={setSort} />
              <span className="mt-6 flex h-11 items-center gap-2 rounded-lg border border-radar-line bg-slate-50 px-3 text-xs font-black text-slate-600">
                <Settings2 size={14} />
                행 클릭 시 상세 패널
              </span>
            </div>
          </div>

          <DataTable
            headers={[
              "종목명",
              "시장",
              "산업 시나리오",
              "시가총액",
              "현재가",
              "포착 사유",
              scoreColumnLabels.total,
              scoreColumnLabels.first,
              scoreColumnLabels.second,
              scoreColumnLabels.third,
              scoreColumnLabels.risk,
              "최종판정"
            ]}
            className="mt-5 sticky-screener-table"
            tableClassName="min-w-[1580px]"
            stickyColumnCount={2}
          >
            {!pagedFiltered.length ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                  {isExactTechnicalFilter && historicalVerification.loading
                    ? "기술 이벤트를 일별 시계열로 검증 중입니다. 검증 전 후보 종목은 표시하지 않습니다."
                    : isExactTechnicalFilter && historicalVerification.error
                      ? "기술 이벤트 검증에 실패했습니다. 조건을 완화하거나 잠시 후 다시 시도해 주세요."
                      : isExactTechnicalFilter && !exactTechnicalSymbols.length
                        ? "현재 제공하는 기술 필터는 거래량 급증 추정과 신고가 추정 중심입니다. 정확한 역대 이벤트 검증 옵션은 혼선을 줄이기 위해 숨겼습니다."
                      : "현재 조건에 맞는 종목이 없습니다."}
                </td>
              </tr>
            ) : null}
            {pagedFiltered.map((stock) => {
              const captureReasons = getCaptureReasons(stock);
              const displayScenario = getDisplayScenario(stock, scenarioFilter);

              return (
                <tr
                  key={stock.id}
                  onClick={() => {
                    setSelectedId(stock.id);
                    setIsDetailOpen(true);
                  }}
                  className={cn(
                    "cursor-pointer hover:bg-slate-50",
                    isDetailOpen && selected?.id === stock.id && "sticky-row-selected bg-blue-50/80"
                  )}
                >
                <td className="px-4 py-4">
                  <div className="flex min-w-[240px] items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(stock.id);
                        }}
                        className="rounded-md p-1 text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                        title={isFavorite(stock.id) ? "관심종목 해제" : "관심종목 추가"}
                      >
                        <Star
                          size={18}
                          className={isFavorite(stock.id) ? "text-blue-600" : "text-slate-300"}
                          fill={isFavorite(stock.id) ? "currentColor" : "none"}
                        />
                      </button>
                      <div>
                        <Link
                          to={`/valuation?stock=${stock.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-black hover:text-blue-700"
                        >
                          {stock.name}
                        </Link>
                        <p className="text-xs font-bold text-slate-400">{stock.ticker}</p>
                        <p className="mt-1 text-[11px] font-black text-slate-500">{getAssetTypeLabel(stock)}</p>
                      </div>
                    </div>
                    <StockExternalLink stock={stock} compact />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <p className="font-black text-slate-800">{getMarketDisplay(stock)}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">{getMarketSubLabel(stock)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="min-w-[180px] font-bold text-slate-700 dark:text-slate-100">
                    {displayScenario?.name ?? "시나리오 미분류"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {getScenarioChainSummary(displayScenario, stock.theme)}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-black">{formatStockMarketCap(stock)}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <p className="font-black">{formatStockPrice(stock)}</p>
                  <p className={cn("mt-1 text-xs font-black", getMarketMoveTextClass(stock.dailyChangeRate ?? stock.priceChange3M))}>
                    {formatPercent(stock.dailyChangeRate ?? stock.priceChange3M)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {captureReasons.length ? (
                    <div className="flex min-w-[220px] flex-wrap gap-1.5">
                      {captureReasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">관찰 대기</span>
                  )}
                </td>
                <td className="min-w-32 px-4 py-4">
                  <ScoreBar value={stock.computedScore} />
                </td>
                <td className="px-4 py-4 font-bold">{Math.round(stock.scoreProfile.marketAttentionScore)}</td>
                <td className="px-4 py-4 font-bold">{Math.round((stock.scoreProfile.valueChainScore + stock.scoreProfile.companyCentralityScore) / 2)}</td>
                <td className="px-4 py-4 font-bold">{Math.round((stock.scoreProfile.earningsLinkScore + stock.scoreProfile.valuationJustificationScore) / 2)}</td>
                <td className={cn("px-4 py-4 font-black", stock.computedRisk >= 68 ? "text-red-600" : stock.computedRisk >= 50 ? "text-amber-600" : "text-emerald-600")}>
                  {Math.round(stock.computedRisk)}
                </td>
                <td className="px-4 py-4">
                  <Badge value={stock.computedDecision} />
                </td>
                </tr>
              );
            })}
          </DataTable>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
            <span>
              {filtered.length}개 중 {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filtered.length)} 표시 · 50개 단위 페이지
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-radar-line bg-white px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                이전
              </button>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage >= pageCount}
                className="rounded-lg border border-radar-line bg-white px-3 py-2 text-xs font-black disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </section>

        {selected && isDetailOpen ? (
          <>
            <button
              type="button"
              aria-label="상세 패널 닫기"
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
            />
            <aside className="fixed right-0 top-0 z-50 h-screen w-[min(640px,calc(100vw-24px))] overflow-y-auto border-l border-radar-line bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black text-blue-600">종목 상세 점수</p>
                  <h2 className="mt-1 break-keep text-2xl font-black leading-8 text-radar-ink">{selected.name}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {selected.ticker} · {getMarketDisplay(selected)} · {selectedScenario?.name ?? "시나리오 미분류"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{getMarketSubLabel(selected)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg border border-radar-line bg-white p-2 text-slate-500 hover:bg-slate-50"
                  aria-label="상세 패널 닫기"
                  title="상세 패널 닫기"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-black text-slate-500">현재가</p>
                      <p className="mt-1 text-xl font-black text-radar-ink">{formatStockPrice(selected)}</p>
                      <p className={cn("mt-1 text-xs font-black", getMarketMoveTextClass(selected.dailyChangeRate ?? selected.priceChange3M))}>
                        {formatPercent(selected.dailyChangeRate ?? selected.priceChange3M)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500">시가총액</p>
                      <p className="mt-1 text-xl font-black text-radar-ink">{formatStockMarketCap(selected)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{getAssetTypeLabel(selected)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500">종합점수</p>
                      <p className="mt-1 text-xl font-black text-blue-600">{Math.round(selected.computedScore)}점</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{selected.computedDecision}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500">선반영위험</p>
                      <p className={cn("mt-1 text-xl font-black", selected.computedRisk >= 68 ? "text-red-600" : selected.computedRisk >= 50 ? "text-amber-600" : "text-emerald-600")}>
                        {Math.round(selected.computedRisk)}점
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {selected.computedRisk >= 68 ? "과열 확인 필요" : selected.computedRisk >= 50 ? "분할 접근 구간" : "부담 낮음"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-radar-line pt-3">
                    <p className="text-xs font-black text-slate-500">포착 사유</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getCaptureReasons(selected).length ? (
                        getCaptureReasons(selected).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700"
                          >
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-bold text-slate-500">강한 포착 사유는 아직 없습니다.</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-radar-line bg-white p-4 dark:bg-slate-900">
                  <p className="text-xs font-black text-slate-500">적용 산업 시나리오</p>
                  <h3 className="mt-2 text-lg font-black text-radar-ink">
                    {selectedScenario?.name ?? "시나리오 미분류"}
                  </h3>
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {selectedScenario?.description ?? "현재 선택 조건에서 이 종목과 직접 연결되는 산업 시나리오가 아직 분류되지 않았습니다."}
                  </p>
                  {selectedScenario ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedScenario.coreValueChains.slice(0, 6).map((chain) => (
                        <span
                          key={chain}
                          className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700"
                        >
                          {chain}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <RadarScoreCard stock={selected} />
                <StockWarningPanel stock={selected} />
                <ScoreContributionPanel stock={selected} />
                <ScoreTrendPanel stock={selected} />
                <CaptureHistoryPanel stock={selected} />
                <Link
                  to={`/valuation?stock=${selected.id}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-200"
                >
                  상세 기대치 분석 보기
                  <ExternalLink size={16} />
                </Link>
                <InvestmentChecklistPanel stock={selected} />
                <ThemeEarningsCalendarPanel theme={selected.theme} />
                <AlternativeExposurePanel theme={selected.theme} stocks={domesticStocks} excludeId={selected.id} />
                <StockResearchTabs stock={selected} />
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
