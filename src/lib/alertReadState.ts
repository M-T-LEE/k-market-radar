import type { Alert } from "../types/portfolio";

const ALERT_READ_IDS_KEY = "market-cycle-radar:read-alert-ids";
const ALERT_READ_KEYS_KEY = "market-cycle-radar:read-alert-keys";
const ALERTS_READ_EVENT = "market-cycle-radar:alerts-read";

function getAlertReadKey(alert: Alert) {
  return [alert.stockId, alert.condition, alert.title, alert.createdAt].join("|");
}

function readStringSet(key: string) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function readAlertIds() {
  return readStringSet(ALERT_READ_IDS_KEY);
}

export function readAlertKeys() {
  return readStringSet(ALERT_READ_KEYS_KEY);
}

export function markAlertsRead(alerts: Alert[]) {
  if (!alerts.length) return;

  const currentIds = readAlertIds();
  const currentKeys = readAlertKeys();
  alerts.forEach((alert) => {
    currentIds.add(alert.id);
    currentKeys.add(getAlertReadKey(alert));
  });
  localStorage.setItem(ALERT_READ_IDS_KEY, JSON.stringify(Array.from(currentIds)));
  localStorage.setItem(ALERT_READ_KEYS_KEY, JSON.stringify(Array.from(currentKeys)));
  window.dispatchEvent(new Event(ALERTS_READ_EVENT));
}

export function isAlertRead(alert: Alert, readIds = readAlertIds(), readKeys = readAlertKeys()) {
  return readIds.has(alert.id) || readKeys.has(getAlertReadKey(alert));
}

export function getUnreadAlertIds(alerts: Alert[]) {
  const readIds = readAlertIds();
  const readKeys = readAlertKeys();
  return alerts
    .filter((alert) => !isAlertRead(alert, readIds, readKeys))
    .map((alert) => alert.id);
}
