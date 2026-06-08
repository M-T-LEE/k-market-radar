import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Layers3,
  LineChart,
  Radar,
  ShieldAlert,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  buildIndustryCycleRadar,
  buildEmergingScenarioCandidates,
  buildRiskEventCalendar,
  buildScenarioUpdateQueue,
  buildStockChecklist,
  buildThemeRotation,
  buildThesisAlerts,
  findAlternativeExposure,
  getPhaseTone,
  type ChecklistItem
} from "../lib/investmentIntelligence";
import { buildScoreProfile } from "../lib/scoring";
import { getScreenerUrl } from "../lib/externalLinks";
import { cn, formatMarketCap, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import type { Alert, Issue, PortfolioHolding } from "../types/portfolio";
import type { Scenario } from "../types/scenario";
import type { Stock, Theme } from "../types/stock";
import { HorizontalScroller } from "./HorizontalScroller";
import { ScoreBar } from "./ScoreBar";
import { StockExternalLink } from "./StockExternalLink";

function checklistTone(status: ChecklistItem["status"]) {
  if (status === "통과") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "확인") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function severityTone(severity: "info" | "warning" | "critical" | "success") {
  if (severity === "critical") return "bg-red-50 text-red-700";
  if (severity === "warning") return "bg-amber-50 text-amber-700";
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

function formatEventDate(date: string) {
  if (/^\d{8}$/.test(date)) return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10).replace(/-/g, ".");
  return date;
}

export function IndustryCycleRadarPanel({ stocks, compact = false }: { stocks: Stock[]; compact?: boolean }) {
  const insights = buildIndustryCycleRadar(stocks).slice(0, compact ? 5 : 8);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
            <Radar size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black">산업 사이클 레이더</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">시나리오별 가격 반응, 확산 폭, 선반영 부담을 함께 봅니다.</p>
          </div>
        </div>
        <Link to="/scenario" className="text-xs font-black text-blue-600">
          맵 보기
        </Link>
      </div>

      <HorizontalScroller
        ariaLabel="산업 사이클 레이더 카드 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={360}
      >
        {insights.map((insight) => (
          <Link
            key={insight.id}
            to={`/scenario?scenario=${insight.id}`}
            className="block min-h-[122px] w-[360px] shrink-0 rounded-lg border border-radar-line bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-keep text-sm font-black leading-5 text-radar-ink">{insight.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  관련 {insight.relatedCount}개 · 평균 {formatPercent(insight.averageChange)} · 확산 {insight.breadth}%
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[11px] font-black", getPhaseTone(insight.phase))}>
                {insight.phase}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-[80px_1fr_34px] items-center gap-2 text-xs font-bold text-slate-500">
              <span>사이클</span>
              <ScoreBar value={insight.cycleScore} showValue={false} />
              <span className="text-right font-black text-radar-ink">{insight.cycleScore}</span>
            </div>
          </Link>
        ))}
      </HorizontalScroller>
    </section>
  );
}

export function SectorRotationPanel({ stocks }: { stocks: Stock[] }) {
  const themes = buildThemeRotation(stocks).slice(0, 8);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-teal-50 p-2.5 text-teal-600">
          <LineChart size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">섹터 로테이션</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">테마별 자금 흐름 프록시와 주도성 순위입니다.</p>
        </div>
      </div>

      <HorizontalScroller
        ariaLabel="섹터 로테이션 카드 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={320}
      >
        {themes.map((theme) => (
          <Link key={theme.theme} to={getScreenerUrl({ theme: theme.theme })} className="block min-h-[90px] w-[320px] shrink-0 rounded-lg border border-radar-line bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50/60">
            <div className="grid grid-cols-[108px_1fr_44px] items-center gap-3 text-xs font-bold text-slate-600">
              <span className="break-keep font-black leading-5 text-radar-ink">{theme.theme}</span>
              <ScoreBar value={theme.score} showValue={false} />
              <span className={cn("text-right font-black", getMarketMoveTextClass(theme.averageChange))}>
                {formatPercent(theme.averageChange)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{theme.count}개 · 확산 {theme.breadth}%</span>
              <span>{theme.leaders[0]?.name ?? "대표 없음"}</span>
            </div>
          </Link>
        ))}
      </HorizontalScroller>
    </section>
  );
}

export function ScenarioUpdateQueuePanel({ stocks }: { stocks: Stock[] }) {
  const queue = buildScenarioUpdateQueue(stocks).slice(0, 5);
  const candidates = buildEmergingScenarioCandidates(stocks).slice(0, 5);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
          <TrendingUp size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">오늘 변화 감지</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">당일 움직임이 큰 시나리오부터 코멘트를 갱신합니다.</p>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel="오늘 변화 감지 카드 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={340}
      >
        {queue.map((item) => (
          <Link key={item.id} to={`/scenario?scenario=${item.id}`} className="min-h-[110px] w-[340px] shrink-0 rounded-lg border border-radar-line bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50/60">
            <div className="flex items-center justify-between gap-3">
              <p className="break-keep text-sm font-black leading-5">{item.name}</p>
              <span className={cn("rounded-full border px-2 py-1 text-[11px] font-black", getPhaseTone(item.phase))}>{item.phase}</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{item.updateSignal}</p>
          </Link>
        ))}
        {candidates.map((candidate) => (
          <Link
            key={candidate.id}
            to={getScreenerUrl({ theme: candidate.theme })}
            className="min-h-[110px] w-[340px] shrink-0 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-3 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="break-keep text-sm font-black leading-5">{candidate.name}</p>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-blue-700">{candidate.status}</span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{candidate.reason}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] font-black text-slate-500">
              <span>확산 {candidate.breadth}% · 관련 {candidate.count}개</span>
              <span className={getMarketMoveTextClass(candidate.averageChange)}>{formatPercent(candidate.averageChange)}</span>
            </div>
          </Link>
        ))}
      </HorizontalScroller>
    </section>
  );
}

export function IndustryReportPanel({ scenario, stocks }: { scenario: Scenario; stocks: Stock[] }) {
  const insight = buildIndustryCycleRadar(stocks, [scenario])[0];
  const related = insight?.leaders ?? [];

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">산업 리포트 요약</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">구조 논리와 오늘 시장 반응을 한 장으로 압축합니다.</p>
        </div>
        {insight ? (
          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", getPhaseTone(insight.phase))}>
            {insight.phase}
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-slate-700">
        {(insight?.reportBullets ?? scenario.summary).map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <CheckCircle2 size={16} className="mt-1 shrink-0 text-blue-600" />
            {bullet}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {related.slice(0, 4).map((stock) => (
          <div key={stock.id} className="flex items-center gap-2 rounded-md border border-radar-line bg-slate-50 px-2.5 py-1.5 text-xs font-black">
            {stock.name}
            <StockExternalLink stock={stock} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

export function InvestmentChecklistPanel({
  stock,
  title = "투자 논리 체크리스트",
  description = "추천이 아니라 검토 순서입니다. 통과·확인·주의를 분리합니다."
}: {
  stock: Stock;
  title?: string;
  description?: string;
}) {
  const checklist = buildStockChecklist(stock);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
          <ClipboardCheck size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {checklist.map((item) => (
          <div key={item.label} className="rounded-lg border border-radar-line bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black">{item.label}</p>
              <span className={cn("rounded-full border px-2 py-1 text-[11px] font-black", checklistTone(item.status))}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AlternativeExposurePanel({
  theme,
  stocks,
  excludeId
}: {
  theme: Theme;
  stocks: Stock[];
  excludeId?: string;
}) {
  const alternatives = findAlternativeExposure(theme, stocks, excludeId);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
          <Layers3 size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">ETF·대체 노출</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">국내 종목이 부족할 때 ETF와 미국 대형주를 함께 봅니다.</p>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel="ETF 대체 노출 후보 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={330}
      >
        {!alternatives.length ? (
          <p className="w-[330px] shrink-0 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">같은 테마의 대체 노출 후보가 아직 부족합니다.</p>
        ) : null}
        {alternatives.map((stock) => {
          const profile = buildScoreProfile(stock);
          return (
            <div key={stock.id} className="flex min-h-[86px] w-[330px] shrink-0 items-center justify-between gap-3 rounded-lg border border-radar-line bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="break-keep text-sm font-black leading-5">{stock.name}</p>
                <p className="text-xs font-bold text-slate-500">
                  {stock.market} · {stock.assetType === "ETF" ? "ETF" : "해외 종목"} · {formatMarketCap(stock.marketCap)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-black text-blue-600">{profile.finalScore}</span>
                <StockExternalLink stock={stock} compact />
              </div>
            </div>
          );
        })}
      </HorizontalScroller>
    </section>
  );
}

export function RiskEventCalendarPanel({
  stocks,
  issues,
  alerts,
  stockIds,
  title = "리스크 이벤트 캘린더"
}: {
  stocks: Stock[];
  issues: Issue[];
  alerts: Alert[];
  stockIds?: Set<string>;
  title?: string;
}) {
  const events = buildRiskEventCalendar(stocks, issues, alerts, stockIds).slice(0, 8);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
          <CalendarDays size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">공시·뉴스·가격 이벤트를 투자 논리 관점으로 정리합니다.</p>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel="리스크 이벤트 카드 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={380}
      >
        {!events.length ? (
          <p className="w-[380px] shrink-0 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">표시할 이벤트가 없습니다.</p>
        ) : null}
        {events.map((event) => (
          <div key={event.id} className="grid min-h-[118px] w-[380px] shrink-0 grid-cols-[74px_1fr] gap-3 rounded-lg border border-radar-line bg-slate-50 p-3">
            <span className="text-xs font-black text-slate-500">{formatEventDate(event.date)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", severityTone(event.severity))}>
                  {event.type}
                </span>
                <span className="text-xs font-bold text-slate-500">{event.stockName}</span>
              </div>
              <p className="mt-1 text-sm font-black leading-5 text-radar-ink">{event.title}</p>
            </div>
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}

export function ThesisMonitorPanel({
  holdings,
  stocks,
  issues,
  alerts
}: {
  holdings: PortfolioHolding[];
  stocks: Stock[];
  issues: Issue[];
  alerts: Alert[];
}) {
  const thesisAlerts = buildThesisAlerts(holdings, stocks, issues, alerts).slice(0, 6);

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
          <ShieldAlert size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">보유 논리 훼손 감지</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">보유종목의 논리와 반대되는 가격·이슈 신호를 먼저 띄웁니다.</p>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel="보유 논리 훼손 감지 카드 이동"
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName="flex gap-3"
        scrollStep={360}
      >
        {!thesisAlerts.length ? (
          <div className="flex min-h-[90px] w-[360px] shrink-0 items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            <CircleDot size={16} />
            현재 보유 논리를 크게 훼손하는 신호는 감지되지 않았습니다.
          </div>
        ) : null}
        {thesisAlerts.map((alert) => (
          <div key={alert.id} className="min-h-[112px] w-[360px] shrink-0 rounded-lg border border-radar-line bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black">{alert.title}</p>
              <AlertTriangle size={16} className={alert.severity === "critical" ? "text-red-600" : "text-amber-600"} />
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{alert.detail}</p>
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
