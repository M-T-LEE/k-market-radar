import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileText,
  History,
  Layers3,
  Newspaper,
  ShieldAlert,
  Shuffle,
  Target,
  TrendingUp
} from "lucide-react";
import type { ReactNode } from "react";
import {
  buildEtfExposureMap,
  buildIndustryMoneyFlowRanking,
  buildMacroBriefing,
  buildRebalanceCandidates,
  buildValueChainComparison,
  getCaptureHistory,
  getDisclosureImpacts,
  getHighProximityLiquidity,
  getRepresentativeHistory,
  getScoreContributions,
  getScoreTrend,
  getStockWarnings,
  getThemeEarningsEvents
} from "../lib/advancedInsights";
import { getStockExternalUrl } from "../lib/externalLinks";
import { cn, formatNumber, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import type { PortfolioHolding } from "../types/portfolio";
import type { Stock } from "../types/stock";

function Panel({
  title,
  icon,
  children,
  right
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-radar-line bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-blue-600 dark:text-blue-300">{icon}</span> : null}
          <h3 className="text-sm font-black text-radar-ink dark:text-slate-100">{title}</h3>
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ToneBadge({ tone, children }: { tone: "strong" | "neutral" | "weak"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-black",
        tone === "strong" && "border-red-200 bg-red-50 text-red-700",
        tone === "neutral" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "weak" && "border-blue-200 bg-blue-50 text-blue-700"
      )}
    >
      {children}
    </span>
  );
}

export function ScoreContributionPanel({ stock }: { stock: Stock }) {
  const rows = getScoreContributions(stock);

  return (
    <Panel title="점수 기여도 분해" icon={<BarChart3 size={17} />}>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-black text-radar-ink dark:text-slate-100">{row.label}</p>
                <p className="mt-0.5 break-keep font-bold leading-5 text-slate-500 dark:text-slate-400">{row.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ToneBadge tone={row.tone}>{row.value}점</ToneBadge>
                <span className="font-black text-slate-500 dark:text-slate-300">기여 {row.weighted}</span>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.tone === "strong" && "bg-red-500",
                  row.tone === "neutral" && "bg-amber-500",
                  row.tone === "weak" && "bg-blue-500"
                )}
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ScoreTrendPanel({ stock }: { stock: Stock }) {
  const trend = getScoreTrend(stock);
  const maxScore = Math.max(100, ...trend.map((item) => item.score));

  return (
    <Panel title="종목 점수 변화 추이" icon={<TrendingUp size={17} />}>
      <div className="flex h-28 items-end gap-2">
        {trend.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-20 w-full items-end rounded-md bg-slate-50 px-1 dark:bg-slate-800">
              <div
                className="w-full rounded-md bg-gradient-to-t from-blue-600 to-teal-400"
                style={{ height: `${Math.max(10, (item.score / maxScore) * 100)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black text-radar-ink dark:text-slate-100">{item.score}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function CaptureHistoryPanel({ stock }: { stock: Stock }) {
  const history = getCaptureHistory(stock);
  const liquidity = getHighProximityLiquidity(stock);

  return (
    <Panel title="포착 사유 히스토리" icon={<History size={17} />} right={<ToneBadge tone={liquidity.hasVolumeSurge ? "strong" : "neutral"}>{liquidity.label}</ToneBadge>}>
      <div className="space-y-3">
        {history.map((item) => (
          <div key={`${item.date}-${item.title}`} className="grid grid-cols-[56px_1fr] gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <span className="text-xs font-black text-blue-600 dark:text-blue-300">{item.date}</span>
            <div>
              <p className="text-sm font-black text-radar-ink dark:text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function StockWarningPanel({ stock }: { stock: Stock }) {
  const warnings = getStockWarnings(stock);
  if (!warnings.length) return null;

  return (
    <Panel title="주의 신호" icon={<ShieldAlert size={17} />}>
      <div className="space-y-2">
        {warnings.map((warning) => (
          <div
            key={warning.title}
            className={cn(
              "rounded-lg border p-3",
              warning.tone === "danger" && "border-red-200 bg-red-50 text-red-800",
              warning.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
              warning.tone === "watch" && "border-blue-200 bg-blue-50 text-blue-800"
            )}
          >
            <p className="text-sm font-black">{warning.title}</p>
            <p className="mt-1 text-xs font-bold leading-5">{warning.description}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function StockResearchTabs({ stock }: { stock: Stock }) {
  const externalUrl = getStockExternalUrl(stock);
  const dartUrl = `https://dart.fss.or.kr/dsab007/main.do?option=corp&textCrpNm=${encodeURIComponent(stock.name)}`;
  const newsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(`${stock.name} 주식`)}`;
  const financeUrl = externalUrl;

  const links = [
    { label: "네이버증권", url: externalUrl, icon: <ExternalLink size={14} /> },
    { label: "공시", url: dartUrl, icon: <FileText size={14} /> },
    { label: "뉴스", url: newsUrl, icon: <Newspaper size={14} /> },
    { label: "재무", url: financeUrl, icon: <BarChart3 size={14} /> }
  ];

  return (
    <Panel title="외부 조회 탭" icon={<ExternalLink size={17} />}>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-radar-line bg-slate-50 px-3 py-2 text-sm font-black text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800"
          >
            {link.label}
            {link.icon}
          </a>
        ))}
      </div>
    </Panel>
  );
}

export function ValueChainHistoryPanel({ chainName }: { chainName: string }) {
  const history = getRepresentativeHistory(chainName);
  if (!history.length) return null;

  return (
    <Panel title="대표기업 교체 이력" icon={<Shuffle size={17} />}>
      <div className="space-y-2">
        {history.map((item) => (
          <div key={`${item.chainName}-${item.date}`} className="rounded-lg bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-radar-ink dark:text-slate-100">{item.from} → {item.to}</p>
              <span className="text-slate-400">{item.date}</span>
            </div>
            <p className="mt-1">{item.reason}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ValueChainDisclosureImpactPanel({ chainName }: { chainName: string }) {
  const impacts = getDisclosureImpacts(chainName);
  if (!impacts.length) return null;

  return (
    <Panel title="공시 이벤트 영향" icon={<FileText size={17} />}>
      <div className="space-y-2">
        {impacts.map((item) => (
          <div key={`${item.company}-${item.date}`} className="rounded-lg border border-radar-line p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-radar-ink dark:text-slate-100">{item.company}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.event}</p>
              </div>
              <ToneBadge tone={item.impact === "upgrade" ? "strong" : item.impact === "downgrade" ? "weak" : "neutral"}>
                {item.impact === "upgrade" ? "상향" : item.impact === "downgrade" ? "하향" : "관찰"}
              </ToneBadge>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">{item.comment}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ThemeEarningsCalendarPanel({ theme }: { theme: string }) {
  const events = getThemeEarningsEvents(theme);
  if (!events.length) return null;

  return (
    <Panel title="산업 실적 캘린더" icon={<CalendarDays size={17} />}>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="grid grid-cols-[74px_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs font-bold dark:bg-slate-800">
            <span className="font-black text-blue-600 dark:text-blue-300">{event.date.slice(5)}</span>
            <div className="min-w-0">
              <p className="break-keep font-black leading-5 text-radar-ink dark:text-slate-100">{event.company}</p>
              <p className="mt-0.5 break-keep leading-5 text-slate-500 dark:text-slate-400">{event.focus}</p>
            </div>
            <ToneBadge tone={event.expectedImpact === "large" ? "strong" : event.expectedImpact === "medium" ? "neutral" : "weak"}>
              {event.expectedImpact === "large" ? "대형" : event.expectedImpact === "medium" ? "중간" : "소형"}
            </ToneBadge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function IndustryMoneyFlowPanel({ stocks }: { stocks: Stock[] }) {
  const ranking = buildIndustryMoneyFlowRanking(stocks).slice(0, 6);

  return (
    <Panel title="산업별 자금 유입/이탈 랭킹" icon={<TrendingUp size={17} />}>
      <div className="space-y-2">
        {ranking.map((item, index) => (
          <div key={item.theme} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-lg border border-radar-line p-3 dark:border-slate-700">
            <span className="text-xs font-black text-slate-400">{index + 1}</span>
            <div className="min-w-0">
              <p className="break-keep text-sm font-black leading-5 text-radar-ink dark:text-slate-100">{item.theme}</p>
              <p className="mt-0.5 break-keep text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">대표 {item.leader?.name ?? "-"} · 상승비율 {formatNumber(item.upRatio, 0)}%</p>
            </div>
            <span className={cn("text-sm font-black", getMarketMoveTextClass(item.avgMove))}>{formatPercent(item.avgMove)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function StrongWeakValueChainPanel({ stocks }: { stocks: Stock[] }) {
  const { strong, weak } = buildValueChainComparison(stocks);
  const row = (title: string, items: typeof strong, tone: "strong" | "weak") => (
    <div>
      <p className="text-xs font-black text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-2 space-y-2">
        {items.slice(0, 4).map((item) => (
          <div key={`${title}-${item.theme}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-slate-800">
            <span className="break-keep leading-5 text-radar-ink dark:text-slate-100">{item.theme}</span>
            <ToneBadge tone={tone}>{formatPercent(item.avgMove)}</ToneBadge>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Panel title="오늘 강한/약한 밸류체인" icon={<Layers3 size={17} />}>
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        {row("강한 축", strong, "strong")}
        {row("약한 축", weak, "weak")}
      </div>
    </Panel>
  );
}

export function EtfExposureMapPanel({ stocks }: { stocks: Stock[] }) {
  const rows = buildEtfExposureMap(stocks).slice(0, 6);

  return (
    <Panel title="ETF·일반종목 노출도 맵" icon={<CircleDot size={17} />}>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.theme} className="rounded-lg border border-radar-line p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-radar-ink dark:text-slate-100">{row.theme}</p>
              <span className="text-xs font-black text-blue-600 dark:text-blue-300">일반 {row.commonCount} · ETF {row.etfCount}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="break-keep rounded bg-slate-50 px-2 py-1 leading-5 dark:bg-slate-800">종목: {row.commonLeader?.name ?? "-"}</span>
              <span className="break-keep rounded bg-slate-50 px-2 py-1 leading-5 dark:bg-slate-800">ETF: {row.etfLeader?.name ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function OverheatMatrixPanel({ stocks }: { stocks: Stock[] }) {
  const rows = buildMacroBriefing(stocks).matrix.slice(0, 6);

  return (
    <Panel title="테마 과열도 · 실적 확인 필요도" icon={<AlertTriangle size={17} />}>
      <div className="grid grid-cols-2 gap-2 max-lg:grid-cols-1">
        {rows.map((row) => (
          <div key={row.theme} className="rounded-lg border border-radar-line p-3 dark:border-slate-700">
            <p className="text-sm font-black text-radar-ink dark:text-slate-100">{row.theme}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="rounded bg-red-50 p-2 text-red-700">과열 {row.overheat}</div>
              <div className="rounded bg-blue-50 p-2 text-blue-700">실적확인 {row.earningsNeed}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function RebalanceCandidatesPanel({
  rows
}: {
  rows: Array<{
    holding: PortfolioHolding;
    stock?: Stock;
    returnRate: number;
    profitLoss: number;
    computedWeight: number;
  }>;
}) {
  const candidates = buildRebalanceCandidates(rows);
  if (!candidates.length) return null;

  return (
    <Panel title="리밸런싱 후보 자동 분류" icon={<Target size={17} />}>
      <div className="grid grid-cols-5 gap-2 max-2xl:grid-cols-3 max-lg:grid-cols-1">
        {candidates.map((item) => (
          <div key={item.holding.id} className="rounded-lg border border-radar-line bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-keep text-sm font-black leading-5 text-radar-ink dark:text-slate-100">{item.stock?.name}</p>
              <ToneBadge tone={item.action.includes("확대") ? "strong" : item.action.includes("축소") || item.action.includes("이탈") ? "weak" : "neutral"}>
                {item.action}
              </ToneBadge>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{item.reason}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function GovernanceChangeWatchPanel({
  groupName,
  shortName
}: {
  groupName?: string;
  shortName?: string;
} = {}) {
  const allItems = buildMacroBriefing([]).governance;
  const groupKeys = [groupName, shortName]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/그룹$/, "").toLowerCase());
  const items = (groupKeys.length
    ? allItems.filter((item) => {
        const itemGroup = item.groupName.replace(/그룹$/, "").toLowerCase();
        return groupKeys.some((key) => itemGroup.includes(key) || key.includes(itemGroup));
      })
    : allItems
  ).slice(0, 4);

  return (
    <Panel title="그룹 지배구조 변화 알림" icon={<CheckCircle2 size={17} />}>
      <div className="space-y-2">
        {items.length ? items.map((item) => (
          <div key={`${item.groupName}-${item.company}`} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-radar-ink dark:text-slate-100">{item.groupName} · {item.company}</p>
              <ToneBadge tone={item.impact === "positive" ? "strong" : item.impact === "negative" ? "weak" : "neutral"}>
                {item.impact === "positive" ? "긍정" : item.impact === "negative" ? "주의" : "관찰"}
              </ToneBadge>
            </div>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{item.comment}</p>
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-radar-line bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            선택한 그룹 기준으로 감지된 지배구조 변화 알림이 없습니다.
          </div>
        )}
      </div>
    </Panel>
  );
}
