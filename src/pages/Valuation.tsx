import {
  Activity,
  BarChart3,
  Coins,
  LineChart as LineChartIcon,
  Percent,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "../components/Badge";
import { InvestmentChecklistPanel, RiskEventCalendarPanel } from "../components/InvestmentIntelligencePanels";
import { StockExternalLink } from "../components/StockExternalLink";
import { ValuationGauge } from "../components/ValuationGauge";
import { useMarketData } from "../context/MarketDataContext";
import { formatCurrency, formatMarketCap, formatNumber } from "../lib/formatters";
import { formatQuoteTime } from "../lib/dataSourceLabels";
import { buildValuationMetrics, getValuationNarrative } from "../lib/valuation";
import { buildScoreProfile, getFinalDecision } from "../lib/scoring";

function MetricCard({
  icon,
  title,
  value,
  note
}: {
  icon: JSX.Element;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-black text-blue-900">
        <span className="rounded-full bg-blue-50 p-2 text-blue-600">{icon}</span>
        {title}
      </div>
      <p className="mt-5 text-center text-2xl font-black text-radar-ink">{value}</p>
      <p className="mt-4 text-center text-sm leading-6 text-slate-500">{note}</p>
    </section>
  );
}

export default function Valuation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { stocks, issues, alerts } = useMarketData();
  const selectedId = searchParams.get("stock") ?? "hpsp";
  const stock = stocks.find((item) => item.id === selectedId) ?? stocks.find((item) => item.id === "hpsp") ?? stocks[0];
  const metrics = useMemo(() => buildValuationMetrics(stock), [stock]);
  const scoreProfile = useMemo(() => buildScoreProfile(stock), [stock]);
  const finalScore = scoreProfile.finalScore;
  const risk = scoreProfile.preReflectionRiskScore;
  const decision = getFinalDecision(finalScore, risk, scoreProfile.earningsLinkScore, stock.assetType);
  const epsDowngrade = stock.valuationHistory.find((point) => point.marker === "EPS 하향");

  const valuationChecks = useMemo(() => {
    const perPremium = stock.forwardPer / Math.max(stock.industryAvgPer, 1);
    const classify = (score: "good" | "watch" | "risk") => {
      if (score === "good") return "bg-emerald-50 text-emerald-700";
      if (score === "watch") return "bg-amber-50 text-amber-700";
      return "bg-red-50 text-red-700";
    };

    return [
      {
        label: "필요 이익 배수",
        value: `${formatNumber(metrics.requiredProfitGrowth, 1)}배`,
        status: metrics.requiredProfitGrowth <= 1.2 ? "양호" : metrics.requiredProfitGrowth <= 1.8 ? "검증" : "부담",
        tone: classify(metrics.requiredProfitGrowth <= 1.2 ? "good" : metrics.requiredProfitGrowth <= 1.8 ? "watch" : "risk"),
        note: "현재 시가총액을 정당화하려면 필요한 순이익 증가 강도"
      },
      {
        label: "주가 상승 정당화율",
        value: `${formatNumber(metrics.priceJustificationRatio * 100, 0)}%`,
        status: metrics.priceJustificationRatio >= 0.8 ? "양호" : metrics.priceJustificationRatio >= 0.45 ? "추적" : "부족",
        tone: classify(metrics.priceJustificationRatio >= 0.8 ? "good" : metrics.priceJustificationRatio >= 0.45 ? "watch" : "risk"),
        note: "주가 상승률 대비 이익 증가율이 따라오는 정도"
      },
      {
        label: "컨센서스 동행률",
        value: `${formatNumber(metrics.consensusSyncRatio * 100, 0)}%`,
        status: metrics.consensusSyncRatio >= 0.75 ? "동행" : metrics.consensusSyncRatio >= 0.4 ? "부분" : "괴리",
        tone: classify(metrics.consensusSyncRatio >= 0.75 ? "good" : metrics.consensusSyncRatio >= 0.4 ? "watch" : "risk"),
        note: "EPS 추정치가 주가 움직임을 뒷받침하는 정도"
      },
      {
        label: "PER 프리미엄",
        value: `${formatNumber(perPremium, 1)}배`,
        status: perPremium <= 1 ? "할인" : perPremium <= 1.45 ? "적정권" : "프리미엄",
        tone: classify(perPremium <= 1 ? "good" : perPremium <= 1.45 ? "watch" : "risk"),
        note: "업종 평균 Forward PER 대비 현재 부담"
      },
      {
        label: "선반영 위험",
        value: `${risk}점`,
        status: risk < 45 ? "낮음" : risk < 65 ? "관리" : "높음",
        tone: classify(risk < 45 ? "good" : risk < 65 ? "watch" : "risk"),
        note: "저점 대비 상승, 200일선 괴리, 밸류 프리미엄 합산"
      }
    ];
  }, [metrics, risk, stock.forwardPer, stock.industryAvgPer]);

  const onStockChange = (id: string) => {
    setSearchParams({ stock: id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-3 text-sm font-black text-slate-700">
          스크리너 선택
          <select
            value={stock.id}
            onChange={(event) => onStockChange(event.target.value)}
            className="h-11 min-w-64 rounded-lg border border-radar-line bg-white px-4 text-sm font-black outline-none focus:border-blue-500"
          >
            {stocks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.ticker}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_180px] items-center gap-5 max-xl:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-slate-500">선택 종목</p>
            <div className="mt-2 flex items-end gap-3">
              <h2 className="text-3xl font-black">{stock.name}</h2>
              <span className="pb-1 text-lg font-bold text-slate-500">{stock.ticker}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {stock.market}
              </span>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {stock.theme}
              </span>
              <StockExternalLink stock={stock} className="px-3 py-1" />
            </div>
          </div>
          <div className="border-l border-radar-line pl-6">
            <p className="text-xs font-bold text-slate-500">테마</p>
            <p className="mt-3 text-lg font-black">{stock.sector}</p>
          </div>
          <div className="border-l border-radar-line pl-6">
            <p className="text-xs font-bold text-slate-500">현재가</p>
            <p className="mt-3 text-2xl font-black">{stock.market.startsWith("US") ? `$${stock.currentPrice}` : formatCurrency(stock.currentPrice)}</p>
            <p className="mt-1 text-sm font-bold text-blue-600">3M {stock.priceChange3M > 0 ? "+" : ""}{stock.priceChange3M}%</p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              업데이트 {formatQuoteTime(stock.quoteUpdatedAt ?? stock.quoteAsOf)}
            </p>
          </div>
          <div className="border-l border-radar-line pl-6">
            <p className="text-xs font-bold text-slate-500">최종점수</p>
            <p className="mt-3 text-3xl font-black text-blue-600">{finalScore}<span className="text-base text-slate-400"> /100</span></p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500">최종 판정</p>
            <div className="mt-3">
              <Badge value={decision} className="px-4 py-2 text-sm" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-6 items-start gap-4 max-xl:grid-cols-3">
        <MetricCard
          icon={<Coins size={18} />}
          title="현재 시가총액"
          value={formatMarketCap(stock.marketCap)}
          note="현재 가격 기준 평가 규모"
        />
        <MetricCard icon={<Target size={18} />} title="시장 기대 순이익" value={formatMarketCap(metrics.expectedNetIncome)} note="현재 가격에 반영된 이익 기대치" />
        <MetricCard icon={<TrendingUp size={18} />} title="필요 이익 성장 배수" value={`${formatNumber(metrics.requiredProfitGrowth, 2)}배`} note="현재 실적 대비 필요한 성장 강도" />
        <MetricCard icon={<BarChart3 size={18} />} title="필요 매출" value={formatMarketCap(metrics.requiredRevenue)} note="목표 수익성을 감안한 매출 규모" />
        <MetricCard icon={<Percent size={18} />} title="주가 상승 정당화율" value={`${formatNumber(metrics.priceJustificationRatio * 100, 0)}%`} note="주가 움직임을 실적이 따라가는 정도" />
        <MetricCard icon={<Users size={18} />} title="컨센서스 동행률" value={`${formatNumber(metrics.consensusSyncRatio * 100, 0)}%`} note="이익 추정치가 가격을 뒷받침하는 정도" />
      </div>

      <div className="grid grid-cols-[1.15fr_0.85fr] items-start gap-5 max-xl:grid-cols-1">
        <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChartIcon size={20} className="text-blue-600" />
              <h3 className="text-lg font-black">주가 vs EPS 컨센서스 추이</h3>
            </div>
            <div className="flex gap-2">
              {["6M", "1Y", "2Y", "3Y"].map((label) => (
                <span key={label} className={label === "1Y" ? "rounded-md bg-blue-600 px-3 py-1 text-xs font-black text-white" : "rounded-md border border-radar-line px-3 py-1 text-xs font-black text-slate-500"}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 h-[390px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stock.valuationHistory} margin={{ top: 20, right: 22, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }} />
                <YAxis yAxisId="left" tick={{ fill: "#64748B", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "price" ? formatNumber(value, 0) : formatNumber(value, 1),
                    name === "price" ? "주가" : "EPS 컨센서스"
                  ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="price" name="주가" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="stepAfter" dataKey="epsConsensus" name="EPS 컨센서스" stroke="#14B8A6" strokeWidth={2.5} dot={false} />
                {epsDowngrade ? (
                  <ReferenceDot yAxisId="right" x={epsDowngrade.date} y={epsDowngrade.epsConsensus} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">
            * EPS 컨센서스 히스토리는 API 미제공 항목이라 현재는 모델 검증용 기준 데이터로 유지합니다.
          </p>
        </section>

        <div className="space-y-5">
          <ValuationGauge status={stock.valuationStatus} />
          <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">평가기준</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                보수적 검증식
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {valuationChecks.map((check) => (
                <div key={check.label} className="rounded-lg border border-radar-line bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-radar-ink">{check.label}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{check.note}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-radar-ink">{check.value}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${check.tone}`}>
                        {check.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-teal-600" />
              <h3 className="text-lg font-black">인사이트</h3>
            </div>
            <div className="mt-5 rounded-lg bg-emerald-50 p-5 text-center text-sm font-bold leading-7 text-slate-700">
              {getValuationNarrative(stock)}
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <li className="flex gap-2">
                <span className="mt-1 h-5 w-5 rounded-full bg-emerald-100 text-center text-xs font-black text-emerald-600">✓</span>
                2025E EPS 컨센서스 상향 추세 유지 여부를 핵심 확인 지표로 둡니다.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-5 w-5 rounded-full bg-emerald-100 text-center text-xs font-black text-emerald-600">✓</span>
                주가 대비 이익 기대치 리레이팅 여지는 컨센서스 동행률로 추적합니다.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-5 w-5 rounded-full bg-amber-100 text-center text-xs font-black text-amber-600">!</span>
                리스크 요인: 고객사 투자 지연, 경쟁 심화, 마진 둔화.
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-[0.95fr_1.05fr] items-start gap-5 max-xl:grid-cols-1">
        <InvestmentChecklistPanel stock={stock} />
        <RiskEventCalendarPanel
          stocks={stocks}
          issues={issues}
          alerts={alerts}
          stockIds={new Set([stock.id])}
          title="선택 종목 리스크 캘린더"
        />
      </div>

      <p className="text-center text-xs font-bold text-slate-500">
        본 화면은 투자 판단을 돕기 위한 검토 자료이며, 실제 투자 결과에 대한 책임은 투자자 본인에게 있습니다.
      </p>
    </div>
  );
}
