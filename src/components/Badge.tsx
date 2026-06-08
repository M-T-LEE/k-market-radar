import type { FinalDecision, ValuationStatus } from "../types/stock";
import type { HoldingDecision, RiskLevel, ThesisImpact } from "../types/portfolio";
import { cn } from "../lib/formatters";

type BadgeValue =
  | FinalDecision
  | HoldingDecision
  | ValuationStatus
  | RiskLevel
  | ThesisImpact
  | "높음"
  | "중간"
  | "낮음"
  | "매우 높음";

const tones: Record<string, string> = {
  "매수 검토": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "조정 대기": "bg-amber-50 text-amber-700 border-amber-200",
  "실적 확인 대기": "bg-blue-50 text-blue-700 border-blue-200",
  "과열 경고": "bg-red-50 text-red-700 border-red-200",
  "테마 노출 검토": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "분할 접근": "bg-amber-50 text-amber-700 border-amber-200",
  관망: "bg-blue-50 text-blue-700 border-blue-200",
  "상품 구조 확인": "bg-slate-100 text-slate-700 border-slate-200",
  제외: "bg-slate-100 text-slate-600 border-slate-200",
  "보유 강화": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "보유 유지": "bg-blue-50 text-blue-700 border-blue-200",
  "비중 축소 검토": "bg-amber-50 text-amber-700 border-amber-200",
  경고: "bg-red-50 text-red-700 border-red-200",
  "이탈 검토": "bg-rose-100 text-rose-800 border-rose-300",
  저평가: "bg-blue-50 text-blue-700 border-blue-200",
  적정: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "기대 반영": "bg-amber-50 text-amber-700 border-amber-200",
  과열: "bg-red-50 text-red-700 border-red-200",
  "버블 위험": "bg-rose-100 text-rose-800 border-rose-300",
  "투자 논리 강화": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "투자 논리 유지": "bg-blue-50 text-blue-700 border-blue-200",
  "투자 논리 일부 훼손": "bg-amber-50 text-amber-700 border-amber-200",
  "투자 논리 중대 훼손": "bg-red-50 text-red-700 border-red-200",
  "판단 보류": "bg-slate-100 text-slate-600 border-slate-200",
  "매우 높음": "bg-emerald-50 text-emerald-700 border-emerald-200",
  높음: "bg-emerald-50 text-emerald-700 border-emerald-200",
  중간: "bg-slate-100 text-slate-600 border-slate-200",
  낮음: "bg-blue-50 text-blue-700 border-blue-200"
};

export function Badge({ value, className }: { value: BadgeValue; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        tones[value] ?? "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      {value}
    </span>
  );
}
