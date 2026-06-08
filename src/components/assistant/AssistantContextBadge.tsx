import { Database, Globe2, MonitorDot } from "lucide-react";
import { cn } from "../../lib/formatters";
import type { AssistantScope } from "../../services/internalAssistant/types";

export function AssistantContextBadge({
  pageLabel,
  scope,
  onScopeChange
}: {
  pageLabel: string;
  scope: AssistantScope;
  onScopeChange: (scope: AssistantScope) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
          <MonitorDot className="size-4 text-blue-600" />
          <span className="break-keep leading-5">현재 화면: {pageLabel}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
          <Database className="size-3" />
          내부 데이터
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white p-1 dark:bg-slate-950">
        {[
          { value: "page" as const, label: "현재 화면 기준", icon: MonitorDot },
          { value: "all" as const, label: "전체 데이터 기준", icon: Globe2 }
        ].map((item) => {
          const Icon = item.icon;
          const active = scope === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onScopeChange(item.value)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-black transition",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
