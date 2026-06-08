import { ArrowDownUp, CheckCircle2, Download, GripVertical, Pencil, Plus, Save, Settings2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AlertCard } from "../components/AlertCard";
import { Badge } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { RebalanceCandidatesPanel } from "../components/DecisionSupportPanels";
import {
  InvestmentChecklistPanel,
  RiskEventCalendarPanel,
  ThesisMonitorPanel
} from "../components/InvestmentIntelligencePanels";
import { IssueTimeline } from "../components/IssueTimeline";
import { ScoreBar } from "../components/ScoreBar";
import { StockExternalLink } from "../components/StockExternalLink";
import { useMarketData } from "../context/MarketDataContext";
import { isActionableAlert } from "../lib/alertFilters";
import { downloadCsv } from "../lib/download";
import { cn, formatCurrency, formatNumber, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import type { Issue, PortfolioHolding } from "../types/portfolio";
import type { Stock } from "../types/stock";

const PORTFOLIO_STORAGE_KEY = "market-cycle-radar:portfolio-holdings";

type PortfolioMarketFilter = "전체" | "국내" | "해외";
type PortfolioSortKey = "manual" | "weight" | "returnRate" | "profitLoss";
type PortfolioSortDirection = "asc" | "desc";

function readStoredHoldings() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PortfolioHolding[]) : [];
  } catch {
    return [];
  }
}

function priceLabel(stock: Stock | undefined, value: number) {
  if (!stock) return "-";
  return isUSMarket(stock) ? `$${formatNumber(value, 2)}` : formatCurrency(value);
}

function createHolding(stock: Stock, form: {
  averagePrice: string;
  quantity: string;
  buyDate: string;
}) {
  const theme = stock.theme;

  return {
    id: `holding-${stock.id}-${Date.now()}`,
    stockId: stock.id,
    averagePrice: Number(form.averagePrice) || stock.currentPrice,
    quantity: Number(form.quantity) || 0,
    weight: 0,
    buyDate: form.buyDate || new Date().toISOString().slice(0, 10),
    investmentThesis: `${stock.name}의 ${theme} 시나리오와 실적 연결성 확인`,
    coreScenario: `${theme} 산업 시나리오`,
    coreValueChain: stock.sector,
    expectedEarningsPoint: "실적 연결성, 마진, 컨센서스 변화 확인",
    keyRisks: "밸류 부담, 업황 둔화, 주요 고객사 투자 지연",
    addCondition: "핵심 실적 지표가 주가 상승률을 동행 또는 상회할 때",
    reduceCondition: "주가가 실적 기대보다 빠르게 선반영될 때",
    exitCondition: "기존 투자논리와 반대되는 실적 또는 산업 이슈가 확인될 때",
    currentDecision: "실적 확인 대기",
    riskLevel: "보통",
    reevaluationScore: {
      scenarioPersistence: 14,
      coreCompanyStatus: 11,
      earningsLinkChange: 12,
      issueImpact: 9,
      valuationBurden: 6,
      supplyMomentum: 6,
      riskChange: 6
    }
  } satisfies PortfolioHolding;
}

function createContextIssue(stock: Stock | undefined): Issue[] {
  if (!stock) return [];
  return [
    {
      id: `context-${stock.id}-industry`,
      stockId: stock.id,
      date: new Date().toISOString().slice(0, 10),
      title: `${stock.theme} 업황 점검 필요`,
      type: "단순 뉴스",
      sentiment: "neutral",
      impactScore: 50,
      thesisImpact: "판단 보류",
      description: `${stock.name}의 직접 이슈가 아직 수집되지 않았습니다. 대신 ${stock.theme} 테마와 ${stock.sector} 밸류체인의 수주, 실적, 가격, 정책 변화를 우선 모니터링합니다.`
    }
  ];
}

function isUSMarket(stock: Stock | undefined) {
  return Boolean(stock && stock.market.startsWith("US"));
}

function holdingCost(holding: PortfolioHolding) {
  return holding.averagePrice * holding.quantity;
}

function formatPortfolioSummaryMoney(value: number, currency: "KRW" | "USD") {
  return currency === "USD" ? `$${formatNumber(value, 2)}` : formatCurrency(value);
}

function getPortfolioSortValue(
  row: {
    returnRate: number;
    profitLoss: number;
    computedWeight: number;
  },
  sortKey: PortfolioSortKey
) {
  if (sortKey === "weight") return row.computedWeight;
  if (sortKey === "returnRate") return row.returnRate;
  if (sortKey === "profitLoss") return row.profitLoss;
  return 0;
}

export default function PortfolioMonitor() {
  const { stocks, issues, alerts } = useMarketData();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => readStoredHoldings());
  const [selectedHoldingId, setSelectedHoldingId] = useState("");
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState<PortfolioMarketFilter>("전체");
  const [sortKey, setSortKey] = useState<PortfolioSortKey>("manual");
  const [sortDirection, setSortDirection] = useState<PortfolioSortDirection>("desc");
  const [draggingHoldingId, setDraggingHoldingId] = useState("");
  const [editingHoldingId, setEditingHoldingId] = useState("");
  const [editForm, setEditForm] = useState({
    averagePrice: "",
    quantity: ""
  });
  const [form, setForm] = useState({
    stockQuery: "",
    averagePrice: "",
    quantity: "",
    buyDate: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
    window.dispatchEvent(new Event("market-cycle-radar:portfolio-updated"));
    if (!holdings.length) {
      setSelectedHoldingId("");
      return;
    }
    if (!selectedHoldingId || !holdings.some((holding) => holding.id === selectedHoldingId)) {
      setSelectedHoldingId(holdings[0].id);
    }
  }, [holdings, selectedHoldingId]);

  useEffect(() => {
    if (!showAddForm && !showColumnSettings && !isDetailOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAddForm(false);
        setShowColumnSettings(false);
        setIsDetailOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showAddForm, showColumnSettings, isDetailOpen]);

  const rows = useMemo(() => {
    const mapped = holdings.map((holding) => {
        const stock = stocks.find((item) => item.id === holding.stockId);
        const returnRate = stock && holding.averagePrice
          ? ((stock.currentPrice - holding.averagePrice) / holding.averagePrice) * 100
          : 0;
        const profitLoss = stock ? (stock.currentPrice - holding.averagePrice) * holding.quantity : 0;
        const holdingValue = stock ? stock.currentPrice * holding.quantity : 0;
        return { holding, stock, returnRate, profitLoss, holdingValue };
      });
    const totalValue = mapped.reduce((sum, row) => sum + row.holdingValue, 0);
    return mapped.map((row) => ({
      ...row,
      computedWeight: totalValue ? (row.holdingValue / totalValue) * 100 : 0
    }));
  }, [holdings, stocks]);

  const portfolioSummary = useMemo(() => {
    const domestic = rows.filter(({ stock }) => !isUSMarket(stock));
    const overseas = rows.filter(({ stock }) => isUSMarket(stock));
    const summarize = (targetRows: typeof rows) => {
      const cost = targetRows.reduce((sum, row) => sum + holdingCost(row.holding), 0);
      const value = targetRows.reduce((sum, row) => sum + row.holdingValue, 0);
      const profitLoss = value - cost;
      const returnRate = cost ? (profitLoss / cost) * 100 : 0;
      return { cost, value, profitLoss, returnRate, count: targetRows.length };
    };

    return {
      domestic: summarize(domestic),
      overseas: summarize(overseas),
    };
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter(({ stock }) => {
        if (marketFilter === "전체") return true;
        if (marketFilter === "국내") return stock?.market === "KOSPI" || stock?.market === "KOSDAQ";
        return isUSMarket(stock);
      }),
    [marketFilter, rows]
  );
  const sortedFilteredRows = useMemo(() => {
    if (sortKey === "manual") return filteredRows;

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort(
      (a, b) => (getPortfolioSortValue(a, sortKey) - getPortfolioSortValue(b, sortKey)) * direction
    );
  }, [filteredRows, sortDirection, sortKey]);
  const selectedHolding = holdings.find((holding) => holding.id === selectedHoldingId) ?? holdings[0];
  const selectedStock = selectedHolding ? stocks.find((stock) => stock.id === selectedHolding.stockId) : undefined;
  const selectedIssues = selectedHolding ? issues.filter((issue) => issue.stockId === selectedHolding.stockId) : [];
  const selectedStockIds = useMemo(() => new Set(selectedHolding ? [selectedHolding.stockId] : []), [selectedHolding]);
  const selectedRow = rows.find((row) => row.holding.id === selectedHolding?.id);
  const selectedAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (!selectedHolding || alert.stockId !== selectedHolding.stockId) return false;
        return isActionableAlert(alert, stocks.find((stock) => stock.id === alert.stockId));
      }),
    [alerts, selectedHolding, stocks]
  );
  const relatedIssues = selectedStock
    ? issues.filter((issue) => {
        const issueStock = stocks.find((stock) => stock.id === issue.stockId);
        return issueStock && issueStock.id !== selectedStock.id && (issueStock.theme === selectedStock.theme || issueStock.sector === selectedStock.sector);
      })
    : [];
  const timelineIssues = selectedIssues.length ? selectedIssues : relatedIssues.length ? relatedIssues.slice(0, 6) : createContextIssue(selectedStock);
  const reevaluationTotal = selectedHolding
    ? Object.values(selectedHolding.reevaluationScore).reduce((sum, value) => sum + value, 0)
    : 0;

  const addHolding = () => {
    const query = form.stockQuery.trim().toLowerCase();
    const tickerFromOption = form.stockQuery.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
    const stock = stocks.find((item) => {
      const ticker = item.ticker.toLowerCase();
      const name = item.name.toLowerCase();
      return ticker === query || ticker === tickerFromOption || name === query || `${name} (${ticker})` === query;
    }) ?? stocks.find((item) => {
      const ticker = item.ticker.toLowerCase();
      const name = item.name.toLowerCase();
      return query ? ticker.includes(query) || name.includes(query) : false;
    });
    if (!stock) return;

    const nextHolding = createHolding(stock, form);
    setHoldings((current) => [nextHolding, ...current.filter((holding) => holding.stockId !== stock.id)]);
    setSelectedHoldingId(nextHolding.id);
    setIsDetailOpen(true);
    setShowAddForm(false);
    setForm({
      stockQuery: "",
      averagePrice: "",
      quantity: "",
      buyDate: new Date().toISOString().slice(0, 10)
    });
  };

  const removeHolding = (holdingId: string) => {
    setHoldings((current) => current.filter((holding) => holding.id !== holdingId));
    if (editingHoldingId === holdingId) {
      setEditingHoldingId("");
    }
  };

  const startEditHolding = (holding: PortfolioHolding) => {
    setEditingHoldingId(holding.id);
    setEditForm({
      averagePrice: String(holding.averagePrice),
      quantity: String(holding.quantity)
    });
  };

  const cancelEditHolding = () => {
    setEditingHoldingId("");
    setEditForm({ averagePrice: "", quantity: "" });
  };

  const saveEditedHolding = (holdingId: string) => {
    const averagePrice = Number(editForm.averagePrice);
    const quantity = Number(editForm.quantity);

    setHoldings((current) =>
      current.map((holding) =>
        holding.id === holdingId
          ? {
              ...holding,
              averagePrice: Number.isFinite(averagePrice) && averagePrice > 0 ? averagePrice : holding.averagePrice,
              quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : holding.quantity
            }
          : holding
      )
    );
    cancelEditHolding();
  };

  const changeSort = (nextSortKey: PortfolioSortKey) => {
    if (sortKey === nextSortKey && nextSortKey !== "manual") {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "manual" ? "asc" : "desc");
  };

  const moveHolding = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;

    setHoldings((current) => {
      const sourceIndex = current.findIndex((holding) => holding.id === sourceId);
      const targetIndex = current.findIndex((holding) => holding.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setSortKey("manual");
  };

  const exportPortfolio = () => {
    downloadCsv(
      "market-cycle-radar-portfolio.csv",
      rows.map(({ holding, stock, returnRate, profitLoss, computedWeight }) => ({
        종목명: stock?.name,
        티커: stock?.ticker,
        시장: stock?.market,
        비중: `${formatNumber(computedWeight, 1)}%`,
        매수가: holding.averagePrice,
        현재가: stock?.currentPrice,
        평가손익: profitLoss,
        수익률: formatPercent(returnRate),
        보유수량: holding.quantity,
        매수일: holding.buyDate,
        투자논리: holding.investmentThesis,
        현재판정: holding.currentDecision,
        위험도: holding.riskLevel
      }))
    );
  };
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black">내 포트폴리오</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {holdings.length}개 종목
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm((value) => !value)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white"
            >
              <Plus size={16} />
              보유종목 추가
            </button>
            {holdings.length ? (
              <button
                onClick={() => setHoldings([])}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-600"
              >
                <Trash2 size={16} />
                전체 비우기
              </button>
            ) : null}
            <button
              onClick={exportPortfolio}
              className="flex items-center gap-2 rounded-lg border border-radar-line bg-white px-4 py-2 text-sm font-black"
            >
              <Download size={16} />
              엑셀 다운로드
            </button>
            <button
              onClick={() => setShowColumnSettings((value) => !value)}
              className="flex items-center gap-2 rounded-lg border border-radar-line bg-white px-4 py-2 text-sm font-black"
            >
              <Settings2 size={16} />
              컬럼 설정
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-600">
          보유종목은 사용자가 입력한 매수가와 수량을 기준으로 수익률을 계산합니다. 종목을 선택하면 투자논리, 조건, 관련 이슈를 오른쪽 패널에서 확인할 수 있습니다.
        </div>

        <div className="mt-4 grid grid-cols-4 items-start gap-3 rounded-lg border border-radar-line bg-white p-4 shadow-sm max-xl:grid-cols-2 max-md:grid-cols-1">
          <div>
            <p className="text-xs font-black text-slate-500">국내 평가금액</p>
            <p className="mt-1 text-2xl font-black text-radar-ink">
              {formatPortfolioSummaryMoney(portfolioSummary.domestic.value, "KRW")}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              투자원금 {formatPortfolioSummaryMoney(portfolioSummary.domestic.cost, "KRW")} · {portfolioSummary.domestic.count}개
            </p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">국내 평가손익</p>
            <p className={cn("mt-1 text-2xl font-black", getMarketMoveTextClass(portfolioSummary.domestic.profitLoss))}>
              {formatPortfolioSummaryMoney(portfolioSummary.domestic.profitLoss, "KRW")}
            </p>
            <p className={cn("mt-1 text-xs font-black", getMarketMoveTextClass(portfolioSummary.domestic.returnRate))}>
              {formatPercent(portfolioSummary.domestic.returnRate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">해외 평가금액</p>
            <p className="mt-1 text-2xl font-black text-radar-ink">
              {formatPortfolioSummaryMoney(portfolioSummary.overseas.value, "USD")}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              투자원금 {formatPortfolioSummaryMoney(portfolioSummary.overseas.cost, "USD")} · {portfolioSummary.overseas.count}개
            </p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">해외 평가손익</p>
            <p className={cn("mt-1 text-2xl font-black", getMarketMoveTextClass(portfolioSummary.overseas.profitLoss))}>
              {formatPortfolioSummaryMoney(portfolioSummary.overseas.profitLoss, "USD")}
            </p>
            <p className={cn("mt-1 text-xs font-black", getMarketMoveTextClass(portfolioSummary.overseas.returnRate))}>
              {formatPercent(portfolioSummary.overseas.returnRate)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <RebalanceCandidatesPanel rows={rows} />
        </div>

        {showAddForm ? (
          <section className="mt-4 rounded-lg border border-radar-line bg-slate-50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">
                종목명/티커, 매수가, 보유수량, 매수일만 입력하면 현재가와 시장 데이터 기준으로 비중과 수익률을 계산합니다.
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-radar-line bg-white p-2 text-slate-500 hover:bg-slate-50"
                aria-label="패널 닫기"
                title="패널 닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 items-start gap-3 max-xl:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                종목명 또는 티커
                <input
                  value={form.stockQuery}
                  onChange={(event) => setForm((current) => ({ ...current, stockQuery: event.target.value }))}
                  list="portfolio-stock-options"
                  placeholder="삼성전자 또는 005930"
                  className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
                />
                <datalist id="portfolio-stock-options">
                  {stocks.map((stock) => (
                    <option key={stock.id} value={`${stock.name} (${stock.ticker})`}>
                      {stock.name} ({stock.ticker})
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="text-xs font-black text-slate-600">
                매수가
                <input
                  value={form.averagePrice}
                  onChange={(event) => setForm((current) => ({ ...current, averagePrice: event.target.value }))}
                  type="number"
                  className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                보유수량
                <input
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  type="number"
                  className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                매수일
                <input
                  value={form.buyDate}
                  onChange={(event) => setForm((current) => ({ ...current, buyDate: event.target.value }))}
                  type="date"
                  className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold"
                />
              </label>
            </div>
            <button
              onClick={addHolding}
              className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white"
            >
              <Save size={16} />
              저장
            </button>
          </section>
        ) : null}

        {showColumnSettings ? (
          <div className="mt-4 rounded-lg border border-radar-line bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-slate-600">컬럼 표시 설정</p>
              <button
                type="button"
                onClick={() => setShowColumnSettings(false)}
                className="rounded-lg border border-radar-line bg-white p-2 text-slate-500 hover:bg-slate-50"
                aria-label="패널 닫기"
                title="패널 닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-black text-slate-600">
              {["종목명", "시장", "비중", "매수가", "현재가", "수익률", "기존 투자논리", "현재 판정"].map((column) => (
                <label key={column} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                  {column}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["전체", "국내", "해외"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setMarketFilter(filter)}
                className={cn(
                  "rounded-lg border border-radar-line px-4 py-2 text-sm font-black",
                  marketFilter === filter ? "bg-blue-600 text-white" : "bg-white text-slate-700"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-500">
              {sortKey === "manual" ? "수동순: 행의 손잡이를 드래그해 순서 변경" : "정렬 적용 중"}
            </span>
            {[
              ["manual", "수동순"],
              ["weight", "비중"],
              ["returnRate", "수익률"],
              ["profitLoss", "평가손익"]
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeSort(key as PortfolioSortKey)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-black",
                  sortKey === key ? "border-blue-200 bg-blue-50 text-blue-700" : "border-radar-line bg-white text-slate-600"
                )}
              >
                {label}
                {sortKey === key && key !== "manual" ? (sortDirection === "desc" ? "↓" : "↑") : null}
              </button>
            ))}
            {sortKey !== "manual" ? (
              <button
                type="button"
                onClick={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-radar-line bg-white px-3 text-xs font-black text-slate-600"
              >
                <ArrowDownUp size={14} />
                {sortDirection === "desc" ? "내림차순" : "오름차순"}
              </button>
            ) : null}
          </div>
        </div>

        {holdings.length ? (
          <DataTable
            headers={["순서", "종목명", "시장", "비중", "매수가", "보유수량", "현재가", "수익률", "평가손익", "기존 투자논리", "현재 판정", "위험도", "관리"]}
            className="mt-4"
            tableClassName="min-w-[1540px]"
          >
            {sortedFilteredRows.map(({ holding, stock, returnRate, profitLoss, computedWeight }) => {
              const isEditing = editingHoldingId === holding.id;

              return (
                <tr
                  key={holding.id}
                  draggable={sortKey === "manual"}
                  onDragStart={(event) => {
                    if (sortKey !== "manual") return;
                    setDraggingHoldingId(holding.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (sortKey !== "manual") return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (sortKey !== "manual") return;
                    event.preventDefault();
                    moveHolding(draggingHoldingId, holding.id);
                    setDraggingHoldingId("");
                  }}
                  onDragEnd={() => setDraggingHoldingId("")}
                  onClick={() => {
                    setSelectedHoldingId(holding.id);
                    setIsDetailOpen(true);
                  }}
                  className={cn(
                    "cursor-pointer hover:bg-slate-50",
                    draggingHoldingId === holding.id && "opacity-50",
                    selectedHolding?.id === holding.id && "bg-blue-50/70"
                  )}
                >
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border border-radar-line text-slate-400",
                      sortKey === "manual" ? "cursor-grab bg-white hover:text-blue-600 active:cursor-grabbing" : "cursor-not-allowed bg-slate-50 opacity-50"
                    )}
                    title={sortKey === "manual" ? "드래그해서 보유종목 순서 변경" : "수동순에서만 드래그 정렬 가능"}
                    aria-label="보유종목 순서 변경"
                  >
                    <GripVertical size={17} />
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="flex min-w-[210px] items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{stock?.name}</p>
                      <p className="text-xs font-bold text-slate-400">{stock?.ticker}</p>
                    </div>
                    {stock ? <StockExternalLink stock={stock} compact /> : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-600">{stock?.market}</td>
                <td className="min-w-28 whitespace-nowrap px-4 py-4">
                  <p className="font-black">{formatNumber(computedWeight, 1)}%</p>
                  <ScoreBar value={Math.min(computedWeight * 3, 100)} showValue={false} className="mt-2" />
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-bold">
                  {isEditing ? (
                    <input
                      value={editForm.averagePrice}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditForm((current) => ({ ...current, averagePrice: event.target.value }))}
                      type="number"
                      min="0"
                      className="h-10 w-32 rounded-lg border border-radar-line bg-white px-3 text-sm font-black outline-none focus:border-blue-500"
                    />
                  ) : (
                    priceLabel(stock, holding.averagePrice)
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-bold">
                  {isEditing ? (
                    <input
                      value={editForm.quantity}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))}
                      type="number"
                      min="0"
                      className="h-10 w-28 rounded-lg border border-radar-line bg-white px-3 text-sm font-black outline-none focus:border-blue-500"
                    />
                  ) : (
                    `${formatNumber(holding.quantity)}주`
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <p className="font-black">{priceLabel(stock, stock?.currentPrice ?? 0)}</p>
                </td>
                <td className={cn("whitespace-nowrap px-4 py-4 font-black", getMarketMoveTextClass(returnRate))}>
                  {formatPercent(returnRate)}
                </td>
                <td className={cn("whitespace-nowrap px-4 py-4 font-black", getMarketMoveTextClass(profitLoss))}>
                  {priceLabel(stock, profitLoss)}
                </td>
                <td className="min-w-[280px] max-w-[360px] px-4 py-4 text-sm leading-6 text-slate-700">
                  {holding.investmentThesis}
                </td>
                <td className="px-4 py-4">
                  <Badge value={holding.currentDecision} />
                </td>
                <td className="px-4 py-4">
                  <Badge value={holding.riskLevel} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            saveEditedHolding(holding.id);
                          }}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700"
                          title="수정 저장"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelEditHolding();
                          }}
                          className="rounded-lg border border-radar-line bg-white p-2 text-slate-600"
                          title="수정 취소"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            startEditHolding(holding);
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700"
                          title="매수가·수량 수정"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            removeHolding(holding.id);
                          }}
                          className="rounded-lg border border-radar-line bg-white p-2 text-red-600"
                          title="보유종목 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-radar-line bg-slate-50 p-10 text-center">
            <h3 className="text-xl font-black text-radar-ink">아직 등록된 보유종목이 없습니다.</h3>
            <p className="mt-3 text-sm font-bold text-slate-600">
              보유종목 추가 버튼으로 종목, 매수가, 수량을 입력하면 수익률과 이슈 모니터링이 활성화됩니다.
            </p>
          </div>
        )}

        <p className="mt-5 text-xs font-bold text-slate-500">
          * 수익률은 사용자가 입력한 평균 매입가 대비 지연/참고 시세 기준입니다. 자동매매, 고빈도 매매, 체결 판단에는 사용하지 않습니다.
        </p>
      </section>

      {selectedHolding && selectedStock && isDetailOpen ? (
        <>
          <button
            type="button"
            aria-label="보유종목 상세 패널 닫기"
            onClick={() => setIsDetailOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
          />
          <aside className="fixed right-0 top-0 z-50 h-screen w-[min(720px,calc(100vw-24px))] overflow-y-auto border-l border-radar-line bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-600">선택 보유종목</p>
                <h2 className="mt-1 text-2xl font-black leading-tight">{selectedStock.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {selectedStock.ticker} · {selectedStock.market} · {selectedHolding.buyDate} 매수
                </p>
                <div className="mt-3">
                  <StockExternalLink stock={selectedStock} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-radar-line p-2 text-slate-500 hover:bg-slate-50"
                aria-label="보유종목 상세 패널 닫기"
                title="패널 닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 items-start gap-3 max-md:grid-cols-1">
              <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">평가금액</p>
                <p className="mt-2 text-xl font-black">
                  {priceLabel(selectedStock, selectedRow?.holdingValue ?? selectedStock.currentPrice * selectedHolding.quantity)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  현재가 {priceLabel(selectedStock, selectedStock.currentPrice)}
                </p>
              </div>
              <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">수익률</p>
                <p className={cn("mt-2 text-xl font-black", getMarketMoveTextClass(selectedRow?.returnRate ?? 0))}>
                  {formatPercent(selectedRow?.returnRate ?? 0)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  매수가 {priceLabel(selectedStock, selectedHolding.averagePrice)}
                </p>
              </div>
              <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">평가손익</p>
                <p className={cn("mt-2 text-xl font-black", getMarketMoveTextClass(selectedRow?.profitLoss ?? 0))}>
                  {priceLabel(selectedStock, selectedRow?.profitLoss ?? 0)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {formatNumber(selectedHolding.quantity)}주 · 비중 {formatNumber(selectedRow?.computedWeight ?? 0, 1)}%
                </p>
              </div>
            </div>

            <section className="mt-5 rounded-lg border border-radar-line bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">내 보유 논리</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">사용자가 등록한 선택 종목 1개의 보유 근거와 관리 조건입니다.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">재평가 점수</p>
                  <p className="text-2xl font-black text-blue-600">{reevaluationTotal}<span className="text-sm text-slate-500"> /100</span></p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                {selectedHolding.investmentThesis}
              </div>
              <div className="mt-4 grid grid-cols-3 items-start gap-3 max-md:grid-cols-1">
                <div className="rounded-lg border border-radar-line bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-500">추가매수 조건</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{selectedHolding.addCondition}</p>
                </div>
                <div className="rounded-lg border border-radar-line bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-500">비중축소 조건</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{selectedHolding.reduceCondition}</p>
                </div>
                <div className="rounded-lg border border-radar-line bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-500">이탈 검토 조건</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{selectedHolding.exitCondition}</p>
                </div>
              </div>
            </section>

            <div className="mt-5">
              <InvestmentChecklistPanel
                stock={selectedStock}
                title="선택 보유종목 점검"
                description="현재 선택한 보유종목 1개를 기준으로 산업·수급·실적·밸류 부담을 확인합니다."
              />
            </div>

            <div className="mt-5">
              <ThesisMonitorPanel holdings={[selectedHolding]} stocks={stocks} issues={issues} alerts={selectedAlerts} />
            </div>

            <div className="mt-5">
              <IssueTimeline
                issues={timelineIssues}
                moreTo="/portfolio"
                title={`${selectedStock.name} 이슈 타임라인`}
                emptyMessage="선택 종목과 관련 산업 이슈가 아직 수집되지 않았습니다."
              />
            </div>

            <div className="mt-5">
              <RiskEventCalendarPanel
                stocks={stocks}
                issues={issues}
                alerts={selectedAlerts}
                stockIds={selectedStockIds}
                title="선택 보유종목 리스크 캘린더"
              />
            </div>

            <section className="mt-5 rounded-lg border border-radar-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">선택 보유종목 알림</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                  {selectedAlerts.length}건
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {!selectedAlerts.length ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                    <CheckCircle2 size={16} />
                    현재 선택 보유종목에 표시할 신규 알림은 없습니다.
                  </div>
                ) : null}
                {selectedAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          </aside>
        </>
      ) : null}
    </div>
  );
}
