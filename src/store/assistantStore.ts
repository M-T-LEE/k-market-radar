import type { IssueMonitoringRegistration } from "../services/internalAssistant/types";

export const ISSUE_MONITORING_STORAGE_KEY = "market-cycle-radar:issue-monitoring";

export function readIssueMonitoringRegistrations(): IssueMonitoringRegistration[] {
  try {
    const raw = localStorage.getItem(ISSUE_MONITORING_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeIssueMonitoringRegistrations(items: IssueMonitoringRegistration[]) {
  localStorage.setItem(ISSUE_MONITORING_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("market-cycle-radar:issue-monitoring-updated"));
}
