import type { Alert } from "../types/portfolio.js";
import type { Stock } from "../types/stock.js";

const TARGET_PRICE_NEAR_RATIO = 0.08;

export function parseWonTargetPrice(title: string) {
  const wonMatch = title.match(/([\d,]+)\s*원/);
  if (wonMatch) return Number(wonMatch[1].replace(/,/g, ""));

  const manWonMatch = title.match(/([\d.]+)\s*만원/);
  if (manWonMatch) return Number(manWonMatch[1]) * 10000;

  return undefined;
}

function isDomesticStock(stock: Stock | undefined): stock is Stock {
  return Boolean(stock && (stock.market === "KOSPI" || stock.market === "KOSDAQ"));
}

export function isTargetPriceAlert(alert: Alert) {
  return alert.condition === "목표가 도달";
}

export function isActionableTargetPriceAlert(alert: Alert, stock: Stock | undefined) {
  if (!isTargetPriceAlert(alert)) return true;
  if (!isDomesticStock(stock)) return false;
  if (!Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) return false;

  const targetPrice = parseWonTargetPrice(alert.title);
  if (!targetPrice || targetPrice <= 0) return false;

  // Target alerts are useful only near the target range. Old targets far below
  // the current price create false confidence, so hide them globally.
  const lowerBound = targetPrice * (1 - TARGET_PRICE_NEAR_RATIO);
  const upperBound = targetPrice * (1 + TARGET_PRICE_NEAR_RATIO);

  return stock.currentPrice >= lowerBound && stock.currentPrice <= upperBound;
}

export function isActionableAlert(alert: Alert, stock: Stock | undefined) {
  if (!isTargetPriceAlert(alert)) return true;
  return isActionableTargetPriceAlert(alert, stock);
}

export function isStaleTargetAlert(alert: Alert, stock: Stock | undefined) {
  return isTargetPriceAlert(alert) && !isActionableTargetPriceAlert(alert, stock);
}

export function filterActionableAlerts(alerts: Alert[], stocks: Stock[]) {
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
  return alerts.filter((alert) => isActionableAlert(alert, stockById.get(alert.stockId)));
}
