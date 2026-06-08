import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import { alerts as fallbackAlerts, issues as fallbackIssues } from "../src/data/issues";
import { stocks as fallbackStocks } from "../src/data/stocks";
import { filterActionableAlerts } from "../src/lib/alertFilters";
import { getDomesticQuotes, getNaverDelayedQuote, getQuoteWithFallback, isDomesticStock } from "../src/lib/marketDataRouter";
import { getFmpUsUniverseResult, getReferenceUsUniverse, largeCapSymbols } from "../src/providers/fmpUniverseProvider";
import { getNaverDelayedIndices } from "../src/providers/naverDelayedIndexProvider";
import { getNaverHistoricalTechnicalSignalsBatch } from "../src/providers/naverHistoricalPriceProvider";
import { getNaverDomesticUniverse } from "../src/providers/naverUniverseProvider";
import { enrichUsStocksWithSecMetadata, getSecCompanyTickerMap } from "../src/providers/secCompanyTickerProvider";
import { getStooqUsIndices, getStooqUsUniverseResult } from "../src/providers/stooqUsMarketProvider";
import type { MarketDataSnapshot, MarketDataSourceStatus, MarketIndexSnapshot, Quote } from "../src/types/marketData";
import type { Alert, Issue } from "../src/types/portfolio";
import type { Stock, TechnicalSignalKind } from "../src/types/stock";
import { dartDisclosureProvider } from "./providers/dartDisclosureProvider";

const CACHE_TTL_MS = 15 * 60 * 1000;
const WARNING_LIMIT = 8;

let cachedSnapshot: { expiresAt: number; data: MarketDataSnapshot } | null = null;

const usSymbols = new Map<string, string>([
  ["nvidia", "NVDA"],
  ["broadcom", "AVGO"],
  ["amd", "AMD"],
  ["vertiv", "VRT"],
  ["arista-networks", "ANET"],
  ["palantir", "PLTR"],
  ["crowdstrike", "CRWD"]
]);

type Env = Record<string, string | undefined>;
type KrxRow = Record<string, string>;
type KrxRowsResponse = { basDd: string; rows: KrxRow[] };

function loadEnv(): Env {
  const envPath = resolve(process.cwd(), ".env.local");
  const entries: Env = {};

  try {
    const contents = readFileSync(envPath, "utf8");
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((line) => {
        const index = line.indexOf("=");
        if (index > -1) {
          entries[line.slice(0, index)] = line.slice(index + 1);
        }
      });
  } catch {
    return process.env as Env;
  }

  return { ...(process.env as Env), ...entries };
}

function numeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toKoreanMarketCap(value: number) {
  return value / 100000000;
}

function krxDateToIso(value: string | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return new Date().toISOString();
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T15:30:00+09:00`;
}

function quoteProviderFromSource(source: Quote["source"]): NonNullable<Stock["quoteProvider"]> {
  if (source === "NAVER_DELAYED") return "naverDelayedQuoteProvider";
  if (source === "KRX_DAILY") return "krxDailyProvider";
  if (source === "FMP") return "fmpQuoteProvider";
  if (source === "STOOQ") return "stooqQuoteProvider";
  return "referenceQuoteProvider";
}

function applyDomesticQuote(stock: Stock, quote: Quote): Stock {
  return {
    ...stock,
    currentPrice: quote.price || stock.currentPrice,
    dailyChange: quote.change ?? stock.dailyChange,
    dailyChangeRate: quote.changeRate ?? stock.dailyChangeRate,
    priceChange3M: quote.changeRate ?? stock.priceChange3M,
    volume: quote.volume || stock.volume,
    marketCap: quote.marketCap || stock.marketCap,
    quoteProvider: quoteProviderFromSource(quote.source),
    quoteSourceLabel: quote.sourceLabel,
    quoteUpdatedAt: quote.updatedAt,
    quoteAsOf: quote.updatedAt,
    quoteIsRealtime: quote.isRealtime,
    quoteNote:
      quote.source === "NAVER_DELAYED"
        ? "공식 Open API가 아닌 참고용 지연시세입니다. 자동매매, 고빈도 호출, 체결 판단에는 사용하지 않습니다."
        : "국내 현재가 fallback Provider입니다."
  };
}

function mergeUniverseStocks(referenceStocks: Stock[], universeStocks: Stock[], flags: {
  domesticUniverseLoaded: boolean;
  usUniverseLoaded: boolean;
}) {
  const byTicker = new Map<string, Stock>();

  universeStocks.forEach((stock) => {
    byTicker.set(stock.ticker, stock);
  });

  referenceStocks.forEach((reference) => {
    const live = byTicker.get(reference.ticker);
    if (live) {
      byTicker.set(reference.ticker, {
        ...reference,
        market: live.market,
        exchange: live.exchange,
        cik: live.cik,
        sector: live.sector,
        theme: live.theme,
        marketCap: live.marketCap,
        currentPrice: live.currentPrice,
        volume: live.volume,
        assetType: live.assetType,
        universeSource: live.universeSource,
        quoteProvider: live.quoteProvider,
        quoteSourceLabel: live.quoteSourceLabel,
        quoteUpdatedAt: live.quoteUpdatedAt,
        quoteAsOf: live.quoteAsOf,
        quoteIsRealtime: live.quoteIsRealtime,
        quoteNote: live.quoteNote,
        dailyChange: live.dailyChange,
        dailyChangeRate: live.dailyChangeRate,
        priceChange3M: live.priceChange3M,
        priceChange6M: live.priceChange6M,
        priceChange12M: live.priceChange12M,
        ma200Gap: live.ma200Gap,
        preReflectionRiskScore: live.preReflectionRiskScore,
        finalScore: live.finalScore,
        finalDecision: live.finalDecision,
        valuationStatus: live.valuationStatus
      });
      return;
    }

    if (
      (isDomesticStock(reference) && !flags.domesticUniverseLoaded) ||
      (reference.market.startsWith("US") && !flags.usUniverseLoaded)
    ) {
      byTicker.set(reference.ticker, reference);
    }
  });

  return Array.from(byTicker.values()).sort((a, b) => b.marketCap - a.marketCap);
}

function jsonResponse(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return data as T;
}

async function readJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) as T : {} as T;
}

function pushBusinessDateWindow(dates: string[], start: Date, targetCount: number) {
  const cursor = new Date(start);

  while (dates.length < targetCount) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}${m}${d}`);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
}

function recentBusinessDates() {
  const dates: string[] = [];
  const today = new Date();
  const previousYear = new Date(today);
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  pushBusinessDateWindow(dates, today, 10);
  pushBusinessDateWindow(dates, previousYear, 20);

  return Array.from(new Set(dates));
}

function buildFallbackIndices(): MarketIndexSnapshot[] {
  const now = new Date().toISOString();

  return [
    {
      name: "KOSPI",
      value: 0,
      change: 0,
      changeRate: 0,
      baseDate: "fallback",
      source: "REFERENCE",
      sourceLabel: "참고 지수",
      isRealtime: false,
      isDelayed: true,
      updatedAt: now
    },
    {
      name: "KOSDAQ",
      value: 0,
      change: 0,
      changeRate: 0,
      baseDate: "fallback",
      source: "REFERENCE",
      sourceLabel: "참고 지수",
      isRealtime: false,
      isDelayed: true,
      updatedAt: now
    }
  ];
}

async function fetchKrxRows(endpoint: string, key: string) {
  let lastError = "";

  for (const basDd of recentBusinessDates()) {
    const url = `https://data-dbg.krx.co.kr/svc/apis/${endpoint}?basDd=${basDd}`;
    const response = await fetch(url, { headers: { AUTH_KEY: key } });
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      throw new Error("KRX 401 Unauthorized: 인증키는 있지만 해당 API 서비스 활용 승인 또는 권한이 필요합니다.");
    }

    if (response.ok && Array.isArray(data?.OutBlock_1) && data.OutBlock_1.length) {
      return { basDd, rows: data.OutBlock_1 as KrxRow[] };
    }

    lastError = data?.respMsg ?? `${basDd} ${response.status} ${response.statusText}`;
  }

  throw new Error(lastError || "KRX 응답 데이터가 비어 있습니다.");
}

async function buildKrxData(key: string) {
  const [kospiIndex, kosdaqIndex, kospiStocks, kosdaqStocks] = await Promise.all([
    fetchKrxRows("idx/kospi_dd_trd", key),
    fetchKrxRows("idx/kosdaq_dd_trd", key),
    fetchKrxRows("sto/stk_bydd_trd", key),
    fetchKrxRows("sto/ksq_bydd_trd", key)
  ]);

  const indexRows = [
    { name: "KOSPI" as const, response: kospiIndex },
    { name: "KOSDAQ" as const, response: kosdaqIndex }
  ];

  const indices = indexRows.map(({ name, response }) => {
    const row =
      response.rows.find((item) => numeric(item.CLSPRC_IDX ?? item.TDD_CLSPRC ?? item.IDX_VAL) > 0 && item.IDX_CLSS === name) ??
      response.rows[0];
    /*
      response.rows.find((item) => numeric(item.CLSPRC_IDX) > 0 && item.IDX_NM === (name === "KOSPI" ? "코스피" : "코스닥")) ??
      response.rows.find((item) => numeric(item.CLSPRC_IDX) > 0 && item.IDX_CLSS === name) ??
      response.rows[0];

    */
    return {
      name,
      value: numeric(row.CLSPRC_IDX ?? row.TDD_CLSPRC ?? row.IDX_VAL),
      change: numeric(row.CMPPREVDD_IDX ?? row.CMPPREVDD_PRC ?? row.PRVD_DD_CMPR),
      changeRate: numeric(row.FLUC_RT),
      baseDate: response.basDd,
      source: "KRX" as const,
      sourceLabel: "KRX 일별 지수",
      isRealtime: false,
      isDelayed: true,
      updatedAt: krxDateToIso(response.basDd)
    };
  });

  const stockRows = new Map<string, KrxRow>();
  [...kospiStocks.rows, ...kosdaqStocks.rows].forEach((row) => {
    stockRows.set(row.ISU_CD, row);
  });

  return { indices, stockRows };
}

async function overlayFmpQuotes(stocks: Stock[], apiKey: string) {
  const quoteResults = await Promise.allSettled(
    stocks
      .filter((stock) => usSymbols.has(stock.id))
      .map(async (stock) => {
        const symbol = usSymbols.get(stock.id)!;
        const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        const rows = await fetchJson<any[]>(url);
        return { stock, quote: Array.isArray(rows) ? rows[0] : null };
      })
  );

  const quoteMap = new Map<string, Record<string, unknown>>();
  quoteResults.forEach((result) => {
    if (result.status === "fulfilled" && result.value.quote) {
      quoteMap.set(result.value.stock.id, result.value.quote);
    }
  });

  return stocks.map((stock) => {
    const quote = quoteMap.get(stock.id);
    if (!quote) return stock;

    const priceAvg200 = numeric(quote.priceAvg200);
    const price = numeric(quote.price);
    const changePercentage = numeric(quote.changePercentage);

    return {
      ...stock,
      currentPrice: price || stock.currentPrice,
      marketCap: numeric(quote.marketCap) ? numeric(quote.marketCap) / 100000000 : stock.marketCap,
      fiftyTwoWeekHigh: numeric(quote.yearHigh) || stock.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: numeric(quote.yearLow) || stock.fiftyTwoWeekLow,
      dailyChange: numeric(quote.change) || stock.dailyChange,
      dailyChangeRate: changePercentage || stock.dailyChangeRate,
      priceChange3M: changePercentage || stock.priceChange3M,
      ma200Gap: priceAvg200 ? ((price - priceAvg200) / priceAvg200) * 100 : stock.ma200Gap,
      quoteProvider: "fmpQuoteProvider" as const,
      quoteSourceLabel: "FMP 참고 시세",
      quoteUpdatedAt: new Date().toISOString(),
      quoteAsOf: quote.timestamp ? new Date(numeric(quote.timestamp) * 1000).toISOString() : new Date().toISOString(),
      quoteIsRealtime: false,
      quoteNote: "미국 종목 분석 대시보드용 참고 시세입니다."
    };
  });
}

function overlayKrxStocks(stocks: Stock[], stockRows: Map<string, KrxRow>, options: { preferKrxCurrent?: boolean } = {}) {
  return stocks.map((stock) => {
    const row = stockRows.get(stock.ticker);
    if (!row) return stock;

    const close = numeric(row.TDD_CLSPRC);
    const change = numeric(row.CMPPREVDD_PRC);
    const marketCap = numeric(row.MKTCAP);
    const changeRate = numeric(row.FLUC_RT);
    const volume = numeric(row.ACC_TRDVOL);
    const hasNaverDelayedQuote =
      stock.quoteProvider === "naverUniverseProvider" ||
      stock.quoteProvider === "naverDelayedQuoteProvider" ||
      stock.quoteSourceLabel?.includes("네이버페이증권");
    const useKrxCurrent = options.preferKrxCurrent || !hasNaverDelayedQuote;

    return {
      ...stock,
      currentPrice: useKrxCurrent ? close || stock.currentPrice : stock.currentPrice,
      marketCap: marketCap ? toKoreanMarketCap(marketCap) : stock.marketCap,
      volume: volume || stock.volume,
      dailyChange: useKrxCurrent ? change || stock.dailyChange : stock.dailyChange,
      dailyChangeRate: useKrxCurrent ? changeRate || stock.dailyChangeRate : stock.dailyChangeRate,
      priceChange3M: useKrxCurrent ? changeRate || stock.priceChange3M : stock.priceChange3M,
      quoteProvider: useKrxCurrent ? "krxDailyProvider" : stock.quoteProvider,
      quoteSourceLabel: useKrxCurrent ? "KRX 일별 종가" : stock.quoteSourceLabel,
      quoteUpdatedAt: useKrxCurrent ? krxDateToIso(row.BAS_DD) : stock.quoteUpdatedAt,
      quoteAsOf: useKrxCurrent ? krxDateToIso(row.BAS_DD) : stock.quoteAsOf,
      quoteIsRealtime: false,
      quoteNote: useKrxCurrent
        ? "KRX Open API 일별 종가 기반 참고 데이터입니다. 실시간 체결 판단에는 사용하지 않습니다."
        : `${stock.quoteNote ?? ""} KRX Open API 일별 시세로 시가총액·거래량을 보강했습니다.`.trim()
    };
  });
}

function stripHtml(text = "") {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchNaverIssues(stocks: Stock[], env: Env) {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) return [];

  const targets = stocks.filter((stock) => stock.market === "KOSPI" || stock.market === "KOSDAQ").slice(0, 10);
  const settled = await Promise.allSettled(
    targets.map(async (stock) => {
      const query = encodeURIComponent(`${stock.name} 실적 수주 투자 공시`);
      const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=2&sort=date`;
      const data = await fetchJson<{ items?: Array<Record<string, string>> }>(url, {
        headers: {
          "X-Naver-Client-Id": env.NAVER_CLIENT_ID!,
          "X-Naver-Client-Secret": env.NAVER_CLIENT_SECRET!
        }
      });

      return (data.items ?? []).map((item, index): Issue => ({
        id: `naver-${stock.id}-${index}-${item.pubDate}`,
        stockId: stock.id,
        date: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        title: stripHtml(item.title),
        type: "단순 뉴스",
        sentiment: "neutral",
        impactScore: 50,
        thesisImpact: "판단 보류",
        description: stripHtml(item.description)
      }));
    })
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchNewsApiIssues(stocks: Stock[], env: Env) {
  if (!env.NEWS_API_KEY) return [];

  const targets = stocks.filter((stock) => stock.market.startsWith("US")).slice(0, 6);
  const settled = await Promise.allSettled(
    targets.map(async (stock) => {
      const query = encodeURIComponent(`${stock.ticker} earnings datacenter AI`);
      const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=2&sortBy=publishedAt&language=en&apiKey=${env.NEWS_API_KEY}`;
      const data = await fetchJson<{ articles?: any[] }>(url);

      return (data.articles ?? []).map((item, index): Issue => ({
        id: `newsapi-${stock.id}-${index}-${item.publishedAt}`,
        stockId: stock.id,
        date: String(item.publishedAt ?? "").slice(0, 10),
        title: item.title ?? `${stock.name} news`,
        type: "단순 뉴스",
        sentiment: "neutral",
        impactScore: 50,
        thesisImpact: "판단 보류",
        description: item.description ?? item.source?.name ?? "뉴스 원문 확인 필요"
      }));
    })
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchOpenDartAlerts(env: Env, stocks: Stock[]) {
  if (!env.OPEN_DART_API_KEY) return [];

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  const fmt = (date: Date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${env.OPEN_DART_API_KEY}&bgn_de=${fmt(start)}&end_de=${fmt(now)}&page_count=100`;
  const data = await fetchJson<{ list?: Array<Record<string, string>> }>(url);
  const filings = Array.isArray(data.list) ? data.list : [];

  const alerts: Alert[] = [];
  filings.forEach((filing, index) => {
    const stock = stocks.find((item) => filing.corp_name?.includes(item.name) || item.name.includes(filing.corp_name ?? ""));
    if (!stock) return;

    const isCorrection = filing.report_nm?.includes("정정");
    const reportName = filing.report_nm ?? "";
    const condition: Alert["condition"] =
      reportName.includes("전환사채") || reportName.includes("CB")
        ? "전환사채 발행"
        : reportName.includes("유상증자") || reportName.includes("증자")
          ? "대규모 증자"
          : reportName.includes("계약해지") || reportName.includes("해지")
            ? "주요 계약 해지"
            : isCorrection
              ? "기존 투자논리와 반대되는 산업 이슈 발생"
              : "컨센서스 하향";

    alerts.push({
      id: `dart-${filing.rcept_no ?? index}`,
      stockId: stock.id,
      title: `${filing.corp_name} ${filing.report_nm}`,
      condition,
      createdAt: filing.rcept_dt ?? new Date().toISOString().slice(0, 10),
      severity: isCorrection ? "warning" : "info"
    });
  });

  return alerts.slice(0, 8);
}

function makeSourceStatus(overrides: Partial<MarketDataSourceStatus>): MarketDataSourceStatus {
  return {
    naverDelayedIndexProvider: "fallback",
    naverDelayedQuoteProvider: "fallback",
    naverUniverseProvider: "fallback",
    krxDailyProvider: "fallback",
    dartDisclosureProvider: "fallback",
    brokerRealtimeProvider: "disabled",
    referenceQuoteProvider: "fallback",
    fmpUniverseProvider: "fallback",
    fmp: "fallback",
    stooqQuoteProvider: "fallback",
    stooqIndexProvider: "fallback",
    krx: "fallback",
    openDart: "fallback",
    naverSearch: "fallback",
    newsApi: "fallback",
    sec: "disabled",
    ...overrides
  };
}

function pushWarning(warnings: string[], message: string) {
  if (warnings.length < WARNING_LIMIT) {
    warnings.push(message);
  }
}

function getSecRequestsPerSecond(env: Env) {
  const parsed = Number(env.SEC_REQUESTS_PER_SECOND);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10) : 10;
}

function mergeIndices(current: MarketIndexSnapshot[], additions: MarketIndexSnapshot[]) {
  const byName = new Map<string, MarketIndexSnapshot>();
  current.forEach((index) => byName.set(index.name, index));
  additions.forEach((index) => byName.set(index.name, index));
  return Array.from(byName.values());
}

function setStooqStatus(sourceStatus: MarketDataSourceStatus, failuresLength: number) {
  sourceStatus.stooqQuoteProvider = failuresLength ? "partial" : "live";
}

async function buildMarketDataSnapshot(): Promise<MarketDataSnapshot> {
  if (cachedSnapshot && cachedSnapshot.expiresAt > Date.now()) {
    return cachedSnapshot.data;
  }

  const env = loadEnv();
  const warnings: string[] = [];
  let stocks = fallbackStocks;
  let issues = fallbackIssues;
  let alerts = fallbackAlerts;
  let indices = buildFallbackIndices();
  const universeStocks: Stock[] = [];
  let domesticUniverseLoaded = false;
  let usUniverseLoaded = false;
  let krxStockRows: Map<string, KrxRow> | null = null;
  const sourceStatus = makeSourceStatus({});
  sourceStatus.stooqQuoteProvider = "disabled";
  sourceStatus.stooqIndexProvider = "disabled";
  if (env.KRX_API_KEY) {
    process.env.KRX_API_KEY = env.KRX_API_KEY;
  }
  sourceStatus.krxDailyProvider = env.KRX_API_KEY ? "fallback" : "disabled";
  sourceStatus.krx = env.KRX_API_KEY ? "fallback" : "disabled";

  try {
    indices = await getNaverDelayedIndices(["KOSPI", "KOSDAQ"]);
    sourceStatus.naverDelayedIndexProvider = "live";
  } catch (error) {
    sourceStatus.naverDelayedIndexProvider = "error";
    pushWarning(
      warnings,
      error instanceof Error
        ? `네이버페이증권 지연지수 Provider 실패: ${error.message}`
        : "네이버페이증권 지연지수 Provider 실패"
    );
  }

  if (env.KRX_API_KEY) {
    try {
      const krxData = await buildKrxData(env.KRX_API_KEY);
      krxStockRows = krxData.stockRows;
      sourceStatus.krxDailyProvider = "live";
      sourceStatus.krx = "live";
      if (sourceStatus.naverDelayedIndexProvider !== "live") {
        indices = krxData.indices;
      }
    } catch (error) {
      sourceStatus.krxDailyProvider = "error";
      sourceStatus.krx = "error";
      pushWarning(
        warnings,
        error instanceof Error
          ? `KRX Open API 연결 실패: ${error.message}`
          : "KRX Open API 연결 실패"
      );
    }
  }

  try {
    const usIndices = await getStooqUsIndices();
    indices = mergeIndices(indices, usIndices);
    sourceStatus.stooqIndexProvider = "live";
  } catch (error) {
    sourceStatus.stooqIndexProvider = "error";
    pushWarning(warnings, error instanceof Error ? `Stooq 미국 지수 수집 실패: ${error.message}` : "Stooq 미국 지수 수집 실패");
  }

  try {
    const domesticUniverse = await getNaverDomesticUniverse({
      markets: ["KOSPI", "KOSDAQ"],
      minMarketCapKrw: 100_000_000_000
    });
    universeStocks.push(...domesticUniverse);
    domesticUniverseLoaded = true;
    sourceStatus.naverUniverseProvider = "live";
    sourceStatus.naverDelayedQuoteProvider = "live";
  } catch (error) {
    sourceStatus.naverUniverseProvider = "error";
    sourceStatus.naverDelayedQuoteProvider = "error";
    pushWarning(
      warnings,
      error instanceof Error
        ? `네이버페이증권 국내 universe 수집 실패: ${error.message}`
        : "네이버페이증권 국내 universe 수집 실패"
    );
  }

  if (env.FMP_API_KEY) {
    try {
      const usUniverse = await getFmpUsUniverseResult(env.FMP_API_KEY);
      universeStocks.push(...usUniverse.stocks);
      usUniverseLoaded = true;
      sourceStatus.fmpUniverseProvider = usUniverse.failures.length ? "partial" : "live";
      sourceStatus.fmp = usUniverse.failures.length ? "partial" : "live";
      if (usUniverse.warning) {
        pushWarning(warnings, usUniverse.warning);
      }
    } catch (error) {
      const referenceUsUniverse = getReferenceUsUniverse();
      universeStocks.push(...referenceUsUniverse);
      usUniverseLoaded = true;
      sourceStatus.fmpUniverseProvider = "error";
      sourceStatus.fmp = "error";
      sourceStatus.referenceQuoteProvider = "fallback";
      pushWarning(warnings, error instanceof Error ? error.message : "FMP 미국 universe 수집 실패");
    }
  } else {
    const referenceUsUniverse = getReferenceUsUniverse();
    universeStocks.push(...referenceUsUniverse);
    usUniverseLoaded = true;
    sourceStatus.fmpUniverseProvider = "disabled";
    sourceStatus.fmp = "disabled";
    sourceStatus.referenceQuoteProvider = "fallback";
  }

  if (sourceStatus.fmpUniverseProvider === "partial") {
    const loadedSymbols = new Set(
      universeStocks
        .filter((stock) => stock.market.startsWith("US") && stock.universeSource === "FMP")
        .map((stock) => stock.ticker)
    );
    const missingSymbols = largeCapSymbols.filter((symbol) => !loadedSymbols.has(symbol));
    if (missingSymbols.length) {
      try {
        const stooqUniverse = await getStooqUsUniverseResult(missingSymbols);
        universeStocks.push(...stooqUniverse.stocks);
        setStooqStatus(sourceStatus, stooqUniverse.failures.length);
        if (stooqUniverse.warning) {
          pushWarning(warnings, stooqUniverse.warning);
        }
      } catch (error) {
        sourceStatus.stooqQuoteProvider = "error";
        pushWarning(warnings, error instanceof Error ? `Stooq 미국 보완 universe 실패: ${error.message}` : "Stooq 미국 보완 universe 실패");
      }
    }
  }

  if (sourceStatus.fmpUniverseProvider === "error" || sourceStatus.fmpUniverseProvider === "disabled") {
    const previousUniverse = [...universeStocks];
    const withoutReferenceUs = universeStocks.filter(
      (stock) => !(stock.market.startsWith("US") && stock.universeSource === "REFERENCE")
    );
    universeStocks.splice(0, universeStocks.length, ...withoutReferenceUs);

    try {
      const stooqUniverse = await getStooqUsUniverseResult();
      universeStocks.push(...stooqUniverse.stocks);
      usUniverseLoaded = true;
      setStooqStatus(sourceStatus, stooqUniverse.failures.length);
      if (domesticUniverseLoaded && sourceStatus.referenceQuoteProvider === "fallback") {
        sourceStatus.referenceQuoteProvider = "disabled";
      }
      if (stooqUniverse.warning) {
        pushWarning(warnings, stooqUniverse.warning);
      }
    } catch (error) {
      universeStocks.splice(0, universeStocks.length, ...previousUniverse);
      sourceStatus.stooqQuoteProvider = "error";
      sourceStatus.referenceQuoteProvider = "fallback";
      pushWarning(warnings, error instanceof Error ? `Stooq 미국 universe 실패: ${error.message}` : "Stooq 미국 universe 실패");
    }
  }

  if (env.SEC_USER_AGENT) {
    try {
      const secTickerMap = await getSecCompanyTickerMap({
        userAgent: env.SEC_USER_AGENT,
        acceptEncoding: env.SEC_ACCEPT_ENCODING,
        requestsPerSecond: getSecRequestsPerSecond(env)
      });
      const enrichedUniverse = enrichUsStocksWithSecMetadata(universeStocks, secTickerMap);
      universeStocks.splice(0, universeStocks.length, ...enrichedUniverse);
      sourceStatus.sec = "live";
    } catch (error) {
      sourceStatus.sec = "error";
      pushWarning(warnings, error instanceof Error ? `SEC 미국 종목 메타데이터 보강 실패: ${error.message}` : "SEC 미국 종목 메타데이터 보강 실패");
    }
  } else {
    sourceStatus.sec = "disabled";
  }

  if (universeStocks.length) {
    stocks = mergeUniverseStocks(fallbackStocks, universeStocks, {
      domesticUniverseLoaded,
      usUniverseLoaded
    });
  }

  if (krxStockRows) {
    stocks = overlayKrxStocks(stocks, krxStockRows, {
      preferKrxCurrent: !domesticUniverseLoaded
    });
  }

  if (!domesticUniverseLoaded) {
    const domesticQuoteMap = await getDomesticQuotes(stocks);
    const domesticQuotes = Array.from(domesticQuoteMap.values());
    const hasNaverDelayedQuote = domesticQuotes.some((quote) => quote.source === "NAVER_DELAYED");
    const hasKrxDailyQuote = domesticQuotes.some((quote) => quote.source === "KRX_DAILY");
    const hasReferenceQuote = domesticQuotes.some((quote) => quote.source === "REFERENCE");
    sourceStatus.naverDelayedQuoteProvider = hasNaverDelayedQuote ? "live" : "error";
    sourceStatus.referenceQuoteProvider = hasReferenceQuote ? "fallback" : "disabled";
    if (hasKrxDailyQuote) {
      sourceStatus.krxDailyProvider = "live";
      sourceStatus.krx = "live";
    }

    stocks = stocks.map((stock) => {
      if (!isDomesticStock(stock)) return stock;
      const quote = domesticQuoteMap.get(stock.id);
      return quote ? applyDomesticQuote(stock, quote) : stock;
    });

    if (!hasNaverDelayedQuote && stocks.some(isDomesticStock)) {
      pushWarning(warnings, "네이버페이증권 지연시세 Provider 요청 실패: 참고 시세로 보완합니다.");
    }

    if (hasReferenceQuote) {
      pushWarning(warnings, "일부 국내 종목은 지연시세 fallback도 실패하여 참고 시세를 사용했습니다.");
    }
  } else {
    if (sourceStatus.referenceQuoteProvider !== "fallback") {
      sourceStatus.referenceQuoteProvider = "disabled";
    }
  }

  if (!usUniverseLoaded && env.FMP_API_KEY) {
    try {
      stocks = await overlayFmpQuotes(stocks, env.FMP_API_KEY);
      sourceStatus.fmp = "live";
    } catch {
      if (sourceStatus.fmp !== "error") {
        sourceStatus.fmp = "error";
      }
    }
  }

  if (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
    try {
      const naverIssues = await fetchNaverIssues(stocks, env);
      issues = [...naverIssues, ...issues].slice(0, 50);
      sourceStatus.naverSearch = "live";
    } catch (error) {
      sourceStatus.naverSearch = "error";
      pushWarning(warnings, error instanceof Error ? error.message : "Naver Search API 연결 실패");
    }
  }

  if (env.NEWS_API_KEY) {
    try {
      const globalIssues = await fetchNewsApiIssues(stocks, env);
      issues = [...globalIssues, ...issues].slice(0, 60);
      sourceStatus.newsApi = "live";
    } catch (error) {
      sourceStatus.newsApi = "error";
      pushWarning(warnings, error instanceof Error ? error.message : "News API 연결 실패");
    }
  }

  if (env.OPEN_DART_API_KEY) {
    try {
      const dartAlerts = await dartDisclosureProvider.getDisclosureAlerts(env, stocks);
      alerts = [...dartAlerts, ...alerts].slice(0, 16);
      sourceStatus.dartDisclosureProvider = "live";
      sourceStatus.openDart = "live";
    } catch (error) {
      sourceStatus.dartDisclosureProvider = "error";
      sourceStatus.openDart = "error";
      pushWarning(warnings, error instanceof Error ? error.message : "OpenDART API 연결 실패");
    }
  }

  const data: MarketDataSnapshot = {
    generatedAt: new Date().toISOString(),
    indices,
    stocks,
    issues,
    alerts: filterActionableAlerts(alerts, stocks),
    sourceStatus,
    warnings
  };

  cachedSnapshot = { expiresAt: Date.now() + CACHE_TTL_MS, data };
  return data;
}

export function registerApiRoutes(viteServer: ViteDevServer) {
  viteServer.middlewares.use("/api/technical-signals", async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      jsonResponse(res, 405, { error: "POST method is required" });
      return;
    }

    try {
      const body = await readJsonBody<{
        symbols?: string[];
        kind?: TechnicalSignalKind;
        windowDays?: number;
      }>(req);
      const symbols = Array.isArray(body.symbols) ? body.symbols.slice(0, 2500) : [];
      const windowDays = Math.min(60, Math.max(1, Number(body.windowDays) || 10));

      if (!symbols.length) {
        jsonResponse(res, 400, { error: "symbols are required" });
        return;
      }

      const data = await getNaverHistoricalTechnicalSignalsBatch(symbols, {
        kind: body.kind,
        windowDays
      });
      jsonResponse(res, 200, data);
    } catch (error) {
      jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : "Technical signal verification failed"
      });
    }
  });

  viteServer.middlewares.use("/api/quotes/naver", async (req: IncomingMessage, res: ServerResponse) => {
    const symbol = req.url?.split("/").filter(Boolean)[0];
    if (!symbol) {
      jsonResponse(res, 400, { error: "symbol is required" });
      return;
    }

    try {
      const quote = await getNaverDelayedQuote(symbol);
      jsonResponse(res, 200, quote);
    } catch (error) {
      jsonResponse(res, 502, {
        error: error instanceof Error ? error.message : "Naver delayed quote failed"
      });
    }
  });

  viteServer.middlewares.use("/api/quotes/domestic", async (req: IncomingMessage, res: ServerResponse) => {
    const symbol = req.url?.split("/").filter(Boolean)[0];
    if (!symbol) {
      jsonResponse(res, 400, { error: "symbol is required" });
      return;
    }

    try {
      const quote = await getQuoteWithFallback(symbol);
      jsonResponse(res, 200, quote);
    } catch (error) {
      jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : "Domestic quote failed"
      });
    }
  });

  viteServer.middlewares.use("/api/market-data", async (_req: IncomingMessage, res: ServerResponse) => {
    try {
      const data = await buildMarketDataSnapshot();
      jsonResponse(res, 200, data);
    } catch (error) {
      jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : "Unknown market data error"
      });
    }
  });

  viteServer.middlewares.use("/api/status", async (_req: IncomingMessage, res: ServerResponse) => {
    jsonResponse(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString()
    });
  });
}
