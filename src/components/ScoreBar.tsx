import { cn, getScoreTone } from "../lib/formatters";

export function ScoreBar({
  value,
  showValue = true,
  className
}: {
  value: number;
  showValue?: boolean;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
          style={{ width: `${width}%` }}
        />
      </div>
      {showValue ? (
        <span className={cn("w-9 text-right text-sm font-bold", getScoreTone(value))}>
          {Math.round(value)}
        </span>
      ) : null}
    </div>
  );
}
