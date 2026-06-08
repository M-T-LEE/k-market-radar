import { Circle } from "lucide-react";
import { Link } from "react-router-dom";
import type { Issue } from "../types/portfolio";
import { Badge } from "./Badge";
import { cn } from "../lib/formatters";

const dotTone = {
  positive: "text-emerald-500",
  neutral: "text-blue-500",
  negative: "text-amber-500"
};

export function IssueTimeline({
  issues,
  moreTo = "/issues",
  title = "이슈 타임라인",
  emptyMessage = "선택 종목의 직접 이슈가 아직 수집되지 않았습니다."
}: {
  issues: Issue[];
  moreTo?: string;
  title?: string;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">{title}</h3>
        <Link to={moreTo} className="text-xs font-bold text-blue-600">
          더보기
        </Link>
      </div>
      <div className="mt-5 space-y-0">
        {!issues.length ? (
          <div className="rounded-lg border border-dashed border-radar-line bg-slate-50 p-5 text-sm font-bold text-slate-500">
            {emptyMessage}
          </div>
        ) : null}
        {issues.map((issue, index) => (
          <div key={issue.id} className="grid grid-cols-[86px_24px_1fr] gap-3">
            <span className="pt-1 text-xs font-bold text-slate-500">{issue.date}</span>
            <div className="flex flex-col items-center">
              <Circle size={11} fill="currentColor" className={cn(dotTone[issue.sentiment])} />
              {index < issues.length - 1 ? <div className="h-full min-h-16 w-px bg-radar-line" /> : null}
            </div>
            <div className="pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-radar-ink">{issue.title}</p>
                <Badge value={issue.thesisImpact} />
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">{issue.type}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
