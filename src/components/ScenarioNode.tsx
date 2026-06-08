import type { ReactNode } from "react";
import { cn } from "../lib/formatters";

export function ScenarioNode({
  label,
  icon,
  meta,
  step,
  active,
  onClick
}: {
  label: string;
  icon: ReactNode;
  meta?: {
    relatedCount: number;
    commonCount?: number;
    etfCount?: number;
    averageChange: string;
    leaderName?: string;
  };
  step?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative min-h-[118px] w-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-card",
        active ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100" : "border-radar-line"
      )}
    >
      {step ? (
        <span className="absolute right-3 top-3 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
          STEP {String(step).padStart(2, "0")}
        </span>
      ) : null}
      <span className="flex min-w-0 items-start gap-3 pr-14">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block break-keep text-base font-black leading-5 text-radar-ink">{label}</span>
          <span className="mt-1 block text-xs font-bold text-slate-500">산업 흐름 노드</span>
        </span>
      </span>
      <span className="mt-4 block">
        {meta ? (
          <span className="grid grid-cols-4 gap-2 text-[11px] font-bold text-slate-500">
            <span className="rounded-md bg-slate-50 px-2 py-2">
              일반
              <strong className="mt-0.5 block text-sm text-radar-ink">{meta.commonCount ?? meta.relatedCount}개</strong>
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-2">
              ETF
              <strong className="mt-0.5 block text-sm text-radar-ink">{meta.etfCount ?? 0}개</strong>
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-2">
              평균
              <strong className="mt-0.5 block text-sm text-radar-ink">{meta.averageChange}</strong>
            </span>
            <span className="min-w-0 rounded-md bg-slate-50 px-2 py-2">
              대표
              <strong className="mt-0.5 block break-keep text-sm leading-5 text-radar-ink">{meta.leaderName ?? "-"}</strong>
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
