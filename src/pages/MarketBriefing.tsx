import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Globe2,
  RadioTower,
  Sparkles,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { HorizontalScroller } from "../components/HorizontalScroller";
import { useMarketData } from "../context/MarketDataContext";
import { scenarios } from "../data/scenarios";
import { buildMacroBriefing } from "../lib/advancedInsights";
import { cn, formatNumber, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import type { Stock } from "../types/stock";

type BriefingThemeItem = {
  theme: string;
  count: number;
  avgMove: number;
  upRatio: number;
  moneyFlowScore: number;
  leader?: Stock;
  reason?: string;
};

function IssueToneBadge({ tone }: { tone: "positive" | "neutral" | "negative" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-black",
        tone === "positive" && "border-red-200 bg-red-50 text-red-700",
        tone === "neutral" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "negative" && "border-blue-200 bg-blue-50 text-blue-700"
      )}
    >
      {tone === "positive" ? "우호" : tone === "negative" ? "부담" : "중립"}
    </span>
  );
}

function isDomesticStock(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s·/・\-_,.()]/g, "");
}

const themeScenarioOverrides: Record<string, string> = {
  "AI 인프라": "ai-infra-cycle",
  AI: "ai-infra-cycle",
  반도체: "ai-infra-cycle",
  HBM: "ai-infra-cycle",
  데이터센터: "ai-infra-cycle",
  냉각: "ai-infra-cycle",
  보안: "ai-infra-cycle",
  방산: "defense-export-cycle",
  유도무기: "defense-export-cycle",
  항공엔진: "defense-export-cycle",
  우주항공: "space-economy-cycle",
  위성: "space-economy-cycle",
  통신: "space-economy-cycle",
  바이오: "bio-platform-cycle",
  CDMO: "bio-platform-cycle",
  의료기기: "bio-platform-cycle",
  조선: "shipbuilding-supercycle",
  LNG선: "shipbuilding-supercycle",
  전력: "energy-grid-cycle",
  원전: "energy-grid-cycle",
  SMR: "energy-grid-cycle",
  "2차전지": "battery-mobility-cycle",
  배터리: "battery-mobility-cycle",
  자동차: "battery-mobility-cycle",
  ESS: "battery-mobility-cycle",
  로봇: "robot-automation-cycle",
  자동화: "robot-automation-cycle",
  "기계/장비": "robot-automation-cycle",
  건설: "construction-infra-cycle",
  건자재: "construction-infra-cycle",
  금융: "finance-shareholder-cycle",
  은행: "finance-shareholder-cycle",
  보험: "finance-shareholder-cycle",
  증권: "finance-shareholder-cycle",
  "지주/복합": "finance-shareholder-cycle",
  "인터넷/플랫폼": "internet-platform-ai-cycle",
  플랫폼: "internet-platform-ai-cycle",
  커머스: "internet-platform-ai-cycle",
  콘텐츠: "internet-platform-ai-cycle",
  유통: "internet-platform-ai-cycle",
  미디어: "internet-platform-ai-cycle",
  에너지: "energy-commodity-cycle",
  정유: "energy-commodity-cycle",
  가스: "energy-commodity-cycle",
  화학: "energy-commodity-cycle",
  "철강/소재": "energy-commodity-cycle",
  철강: "energy-commodity-cycle"
};

function findScenarioOverride(theme: string) {
  const key = normalizeText(theme);
  const matched = Object.entries(themeScenarioOverrides).find(([alias]) => {
    const aliasKey = normalizeText(alias);
    return key === aliasKey || key.includes(aliasKey) || aliasKey.includes(key);
  });

  return matched ? scenarios.find((scenario) => scenario.id === matched[1]) : undefined;
}

function findScenarioByTheme(theme: string) {
  const override = findScenarioOverride(theme);
  if (override) return override;

  const key = normalizeText(theme);
  return scenarios.find((scenario) => {
    const nodeMatch = scenario.nodes.some((node) => {
      const themeKey = normalizeText(node.theme);
      const labelKey = normalizeText(node.label);
      return themeKey === key || labelKey === key || themeKey.includes(key) || key.includes(themeKey) || labelKey.includes(key);
    });
    const scenarioText = normalizeText(
      `${scenario.name} ${scenario.description} ${scenario.coreValueChains.join(" ")} ${scenario.nodes
        .map((node) => `${node.label} ${node.theme} ${node.description}`)
        .join(" ")}`
    );
    return nodeMatch || scenarioText.includes(key);
  });
}

function scenarioLinkForTheme(theme: string) {
  const scenario = findScenarioByTheme(theme);
  return scenario ? `/scenario?scenario=${encodeURIComponent(scenario.id)}` : "/scenario";
}

function issueDetailLink(themes: string[]) {
  return themes[0] ? scenarioLinkForTheme(themes[0]) : "/alerts";
}

function stockDetailLink(ticker: string, stocks: Stock[]) {
  const stock = stocks.find((item) => item.ticker === ticker);
  return stock ? `/valuation?stock=${encodeURIComponent(stock.id)}` : `/screener?query=${encodeURIComponent(ticker)}`;
}

function FlowList({
  title,
  description,
  items,
  tone
}: {
  title: string;
  description: string;
  items: BriefingThemeItem[];
  tone: "strong" | "weak";
}) {
  const Icon = tone === "strong" ? TrendingUp : TrendingDown;
  const accentClass =
    tone === "strong"
      ? "border-red-100 bg-red-50/60 hover:border-red-300 dark:border-red-500/30 dark:bg-red-500/10"
      : "border-blue-100 bg-blue-50/60 hover:border-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10";
  const iconClass = tone === "strong" ? "text-red-600 dark:text-red-300" : "text-blue-600 dark:text-blue-300";

  return (
    <div className="rounded-xl border border-radar-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-2">
        <span className={cn("rounded-lg bg-slate-50 p-2 dark:bg-slate-800", iconClass)}>
          <Icon size={17} />
        </span>
        <div>
          <h3 className="font-black text-radar-ink dark:text-slate-100">{title}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <Link
            key={`${title}-${item.theme}`}
            to={scenarioLinkForTheme(item.theme)}
            className={cn("group block rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-sm", accentClass)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <p className="break-keep text-sm font-black leading-5 text-radar-ink dark:text-slate-100">{item.theme}</p>
                </div>
                <p className="mt-1 break-keep text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                  관련 {item.count}개 · 상승비율 {formatNumber(item.upRatio, 0)}% · 대표 {item.leader?.name ?? "-"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-sm font-black", getMarketMoveTextClass(item.avgMove))}>{formatPercent(item.avgMove)}</p>
                <p className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">자금 {item.moneyFlowScore}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-300">
              산업 시나리오 보기 <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5" />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MarketBriefing() {
  const { stocks, generatedAt } = useMarketData();
  const domesticStocks = stocks.filter(isDomesticStock);
  const briefing = buildMacroBriefing(domesticStocks);
  const updatedAt = new Date(generatedAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Globe2 size={22} />
            </span>
            <div>
              <p className="text-sm font-black text-blue-600 dark:text-blue-300">국내 증시 브리핑</p>
              <h2 className="mt-2 text-2xl font-black text-radar-ink dark:text-slate-100">
                KOSPI·KOSDAQ 산업 흐름과 종목 움직임을 국내 데이터 기준으로 요약합니다.
              </h2>
              <p className="mt-2 max-w-5xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                강한 산업, 약한 산업, 공시·실적 이벤트, 지배구조 변화를 한 화면에서 확인합니다. 산업 카드는 종목 스크리너가 아니라 해당 산업 시나리오로 연결됩니다.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              업데이트 {updatedAt}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              국내 유니버스 {domesticStocks.length.toLocaleString("ko-KR")}개 기준
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-radar-ink dark:text-slate-100">산업 흐름·자금 이동 압축 보기</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              강한 흐름과 자금 유입, 약한 흐름과 자금 이탈을 같은 기준으로 묶었습니다.
            </p>
          </div>
          <Link to="/scenario" className="rounded-lg border border-radar-line px-3 py-2 text-xs font-black text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800">
            전체 산업 시나리오
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 items-start gap-4 max-xl:grid-cols-1">
          <FlowList
            title="강한 흐름 · 자금 유입"
            description="평균 등락률, 상승 확산, 시장 주도성 점수가 높은 산업입니다."
            items={briefing.strongThemes}
            tone="strong"
          />
          <FlowList
            title="약한 흐름 · 자금 이탈"
            description="가격 반응과 확산이 약해 보유·관심 논리 점검이 필요한 산업입니다."
            items={briefing.weakThemes}
            tone="weak"
          />
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="font-black text-radar-ink dark:text-slate-100">오늘 새로 시장이 인정한 산업 후보</h3>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                인프라·지정학·금융여건처럼 시장이 새로 반응한 산업 축을 큰 흐름 단위로 묶었습니다.
              </p>
            </div>
          </div>
        </div>
        <HorizontalScroller
          ariaLabel="신규 산업 후보와 시장 인정 카드 이동"
          className="mt-4"
          viewportClassName="pb-1"
          contentClassName="flex gap-4"
          scrollStep={460}
        >
          {briefing.issues.map((issue) => (
            <Link
              key={issue.id}
              to={issueDetailLink(issue.affectedThemes)}
              className="group flex min-h-[264px] w-[440px] shrink-0 flex-col rounded-lg border border-radar-line bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 max-xl:w-[390px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-white p-2 text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                    <RadioTower size={17} />
                  </span>
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400">{issue.category}</p>
                </div>
                <IssueToneBadge tone={issue.tone} />
              </div>
              <h3 className="mt-4 line-clamp-2 text-lg font-black leading-6 text-radar-ink dark:text-slate-100">{issue.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{issue.marketRead}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {issue.affectedThemes.slice(0, 5).map((theme) => (
                  <span key={theme} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {theme}
                  </span>
                ))}
              </div>
              <p className="mt-auto flex items-center gap-1 pt-4 text-xs font-black text-blue-600 dark:text-blue-300">
                관련 산업 시나리오 보기 <ArrowUpRight size={13} />
              </p>
            </Link>
          ))}
        </HorizontalScroller>
      </section>

      <section className="grid grid-cols-2 items-start gap-4 max-xl:grid-cols-1">
        <article className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600" />
            <h3 className="font-black text-radar-ink dark:text-slate-100">산업 시나리오별 실적 발표 캘린더</h3>
          </div>
          <HorizontalScroller
            ariaLabel="실적 발표 캘린더 카드 이동"
            className="mt-4"
            viewportClassName="pb-1"
            contentClassName="grid auto-cols-[360px] grid-flow-col grid-rows-2 gap-3 max-md:auto-cols-[320px]"
            scrollStep={360}
          >
            {briefing.earnings.map((event) => (
              <Link
                key={event.id}
                to={stockDetailLink(event.ticker, domesticStocks)}
                className="grid min-h-[132px] grid-cols-[64px_1fr] items-start gap-3 rounded-lg bg-slate-50 p-3 transition hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <span className="text-sm font-black text-blue-600 dark:text-blue-300">{event.date.slice(5)}</span>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-keep text-sm font-black leading-5 text-radar-ink dark:text-slate-100">{event.company}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {event.expectedImpact === "large" ? "대형" : event.expectedImpact === "medium" ? "중간" : "소형"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 break-keep text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{event.theme} · {event.focus}</p>
                </div>
              </Link>
            ))}
          </HorizontalScroller>
        </article>

        <article className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-black text-radar-ink dark:text-slate-100">그룹 지배구조 변화 알림</h3>
          </div>
          <HorizontalScroller
            ariaLabel="그룹 지배구조 변화 알림 카드 이동"
            className="mt-4"
            viewportClassName="pb-1"
            contentClassName="grid auto-cols-[360px] grid-flow-col grid-rows-2 gap-3 max-md:auto-cols-[320px]"
            scrollStep={360}
          >
            {briefing.governance.map((item) => (
              <Link
                key={`${item.groupName}-${item.company}`}
                to="/governance"
                className="block min-h-[132px] rounded-lg bg-slate-50 p-3 transition hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="break-keep text-sm font-black leading-5 text-radar-ink dark:text-slate-100">{item.groupName} · {item.company}</p>
                  <IssueToneBadge tone={item.impact === "positive" ? "positive" : item.impact === "negative" ? "negative" : "neutral"} />
                </div>
                <p className="mt-3 line-clamp-2 break-keep text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{item.comment}</p>
              </Link>
            ))}
          </HorizontalScroller>
        </article>
      </section>
    </div>
  );
}
