import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn, formatPercent, getMarketMoveTextClass } from "../lib/formatters";

export function StatCard({
  label,
  value,
  suffix,
  change,
  icon,
  tone = "blue"
}: {
  label: string;
  value: number;
  suffix: string;
  change: number;
  icon: ReactNode;
  tone?: "blue" | "teal" | "amber" | "red";
}) {
  const isUp = change >= 0;
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600"
  }[tone];

  return (
    <section className="min-h-[150px] rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("break-keep text-sm font-bold leading-5", tone === "red" ? "text-red-600" : "text-blue-700")}>
            {label}
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-4xl font-black leading-none tracking-normal text-radar-ink">
              {value}
            </span>
            <span className="pb-1 text-sm font-bold leading-5 text-slate-600">{suffix}</span>
          </div>
        </div>
        <div className={cn("shrink-0 rounded-full p-3", toneClass)}>{icon}</div>
      </div>
      <div
        className={cn(
          "mt-4 flex items-center gap-1 text-sm font-bold",
          getMarketMoveTextClass(change)
        )}
      >
        {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        <span>{formatPercent(change)}</span>
      </div>
    </section>
  );
}
