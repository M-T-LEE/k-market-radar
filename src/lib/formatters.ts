import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)}%`;
}

export function formatCurrency(value: number) {
  return `${formatNumber(value)}원`;
}

export function formatMarketCap(value: number) {
  if (value >= 10000) {
    return `${formatNumber(value / 10000, 1)}조 원`;
  }

  return `${formatNumber(value)}억 원`;
}

export function getScoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getMarketMoveTextClass(value: number, variant: "light" | "dark" = "light") {
  if (value > 0) return variant === "dark" ? "text-red-300" : "text-red-600";
  if (value < 0) return variant === "dark" ? "text-blue-300" : "text-blue-600";
  return variant === "dark" ? "text-slate-300" : "text-slate-500";
}

export function getMarketMoveBadgeClass(value: number) {
  if (value > 0) return "border-red-100 bg-red-50 text-red-700";
  if (value < 0) return "border-blue-100 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function getMarketMoveHeatColor(value: number) {
  if (value >= 5) return "#991B1B";
  if (value >= 2) return "#DC2626";
  if (value >= 0.3) return "#EF4444";
  if (value > -0.3) return "#64748B";
  if (value > -2) return "#2563EB";
  return "#1E40AF";
}
