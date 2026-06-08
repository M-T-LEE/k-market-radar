import type { Quote } from "../types/marketData";
import type { Stock } from "../types/stock";
import { getRuntimeEnv, parseNumber, toKoreanMarketCapUnit } from "./providerUtils";

type KrxRow = Record<string, string>;

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

async function fetchKrxRows(endpoint: string, apiKey: string) {
  let lastError = "";

  for (const basDd of recentBusinessDates()) {
    const response = await fetch(`https://data-dbg.krx.co.kr/svc/apis/${endpoint}?basDd=${basDd}`, {
      headers: { AUTH_KEY: apiKey }
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      throw new Error("KRX 401 Unauthorized");
    }

    if (response.ok && Array.isArray(data?.OutBlock_1) && data.OutBlock_1.length) {
      return { basDd, rows: data.OutBlock_1 as KrxRow[] };
    }

    lastError = data?.respMsg ?? `${response.status} ${response.statusText}`;
  }

  throw new Error(lastError || "KRX daily data unavailable");
}

export function normalizeKrxDailyQuote(row: KrxRow, stock?: Stock): Quote {
  return {
    symbol: row.ISU_CD ?? stock?.ticker ?? "UNKNOWN",
    name: row.ISU_NM ?? stock?.name ?? row.ISU_CD ?? "UNKNOWN",
    market: stock?.market === "KOSPI" || stock?.market === "KOSDAQ" ? stock.market : "UNKNOWN",
    price: parseNumber(row.TDD_CLSPRC),
    change: parseNumber(row.CMPPREVDD_PRC),
    changeRate: parseNumber(row.FLUC_RT),
    volume: parseNumber(row.ACC_TRDVOL),
    marketCap: parseNumber(row.MKTCAP) ? toKoreanMarketCapUnit(parseNumber(row.MKTCAP)) : stock?.marketCap,
    source: "KRX_DAILY",
    sourceLabel: "KRX 일별 종가",
    isRealtime: false,
    isDelayed: true,
    updatedAt: row.BAS_DD ?? new Date().toISOString()
  };
}

export async function getKrxDailyQuote(symbol: string, stock?: Stock, apiKey = getRuntimeEnv("KRX_API_KEY")) {
  if (!apiKey) {
    throw new Error("KRX_API_KEY is not configured");
  }

  const marketEndpoint = stock?.market === "KOSDAQ" ? "sto/ksq_bydd_trd" : "sto/stk_bydd_trd";
  const { rows } = await fetchKrxRows(marketEndpoint, apiKey);
  const row = rows.find((item) => item.ISU_CD === symbol);

  if (!row) {
    throw new Error(`KRX daily quote not found: ${symbol}`);
  }

  return normalizeKrxDailyQuote(row, stock);
}
