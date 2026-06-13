import type { Alert } from "../../src/types/portfolio.js";
import type { Stock } from "../../src/types/stock.js";
import type { Env } from "./types.js";
import { fetchJson } from "./utils.js";

function toAlertCondition(reportName = ""): Alert["condition"] {
  if (reportName.includes("전환사채") || reportName.includes("CB")) return "전환사채 발행";
  if (reportName.includes("유상증자") || reportName.includes("증자")) return "대규모 증자";
  if (reportName.includes("계약해지") || reportName.includes("해지")) return "주요 계약 해지";
  if (reportName.includes("정정")) return "기존 투자논리와 반대되는 산업 이슈 발생";
  return "컨센서스 하향";
}

export const dartDisclosureProvider = {
  id: "dartDisclosureProvider" as const,
  label: "OpenDART 공시",

  async getDisclosureAlerts(env: Env, stocks: Stock[]) {
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

      const reportName = filing.report_nm ?? "";
      alerts.push({
        id: `dart-${filing.rcept_no ?? index}`,
        stockId: stock.id,
        title: `${filing.corp_name} ${reportName}`,
        condition: toAlertCondition(reportName),
        createdAt: filing.rcept_dt ?? new Date().toISOString().slice(0, 10),
        severity: reportName.includes("정정") ? "warning" : "info"
      });
    });

    return alerts.slice(0, 8);
  }
};
