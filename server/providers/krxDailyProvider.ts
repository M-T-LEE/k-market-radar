import type { MarketIndexSnapshot } from "../../src/types/marketData.js";
import type { DomesticQuote, KrxDailyData, KrxRow } from "./types.js";
import { numeric, recentBusinessDates, toKoreanMarketCap } from "./utils.js";

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

    lastError = data?.respMsg ?? `${response.status} ${response.statusText}`;
  }

  throw new Error(lastError || "KRX 응답 데이터가 비어 있습니다.");
}

function buildIndexSnapshot(name: "KOSPI" | "KOSDAQ", response: { basDd: string; rows: KrxRow[] }): MarketIndexSnapshot {
  const row =
    response.rows.find((item) => item.IDX_NM === name || item.IDX_CLSS === name) ??
    response.rows[0];

  return {
    name,
    value: numeric(row.CLSPRC_IDX ?? row.TDD_CLSPRC ?? row.IDX_VAL),
    change: numeric(row.CMPPREVDD_IDX ?? row.CMPPREVDD_PRC ?? row.PRVD_DD_CMPR),
    changeRate: numeric(row.FLUC_RT),
    baseDate: response.basDd,
    source: "KRX",
    sourceLabel: "KRX 일별 지수",
    isRealtime: false,
    isDelayed: true,
    updatedAt: response.basDd
  };
}

function buildKrxQuote(row: KrxRow, basDd: string): DomesticQuote {
  return {
    ticker: row.ISU_CD,
    currentPrice: numeric(row.TDD_CLSPRC),
    change: numeric(row.CMPPREVDD_PRC),
    changeRate: numeric(row.FLUC_RT),
    volume: numeric(row.ACC_TRDVOL),
    marketCap: numeric(row.MKTCAP) ? toKoreanMarketCap(numeric(row.MKTCAP)) : undefined,
    asOf: basDd,
    updatedAt: new Date().toISOString(),
    provider: "krxDailyProvider",
    label: "KRX 일별 종가",
    isRealtime: false,
    note: "KRX 일별 매매정보 기반 최근 종가입니다."
  };
}

export const krxDailyProvider = {
  id: "krxDailyProvider" as const,
  label: "KRX 일별 시세",

  async getDailyData(apiKey: string): Promise<KrxDailyData> {
    const [kospiIndex, kosdaqIndex, kospiStocks, kosdaqStocks] = await Promise.all([
      fetchKrxRows("idx/kospi_dd_trd", apiKey),
      fetchKrxRows("idx/kosdaq_dd_trd", apiKey),
      fetchKrxRows("sto/stk_bydd_trd", apiKey),
      fetchKrxRows("sto/ksq_bydd_trd", apiKey)
    ]);

    const indices = [
      buildIndexSnapshot("KOSPI", kospiIndex),
      buildIndexSnapshot("KOSDAQ", kosdaqIndex)
    ];

    const stockRows = new Map<string, KrxRow>();
    const quotes = new Map<string, DomesticQuote>();
    [...kospiStocks.rows, ...kosdaqStocks.rows].forEach((row) => {
      stockRows.set(row.ISU_CD, row);
      quotes.set(row.ISU_CD, buildKrxQuote(row, row.BAS_DD ?? kospiStocks.basDd ?? kosdaqStocks.basDd));
    });

    return { indices, stockRows, quotes };
  }
};
