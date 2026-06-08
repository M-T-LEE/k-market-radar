import type { ReactNode } from "react";
import { cn } from "../lib/formatters";
import { HorizontalScroller } from "./HorizontalScroller";

export function DataTable({
  headers,
  children,
  className,
  tableClassName,
  stickyColumnCount = 0
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  stickyColumnCount?: 0 | 1 | 2;
}) {
  return (
    <HorizontalScroller
      ariaLabel="테이블 가로 이동"
      className={cn(
        "rounded-lg border border-radar-line dark:border-slate-700",
        stickyColumnCount >= 1 && "sticky-table sticky-left-1",
        stickyColumnCount >= 2 && "sticky-left-2",
        className
      )}
      viewportClassName="rounded-lg"
      contentClassName="min-w-full"
      scrollStep={560}
    >
      <table className={cn("min-w-full border-collapse bg-white text-sm dark:bg-slate-900", tableClassName)}>
        <thead className="bg-slate-50 text-xs font-bold text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap border-b border-radar-line px-4 py-3 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-radar-line dark:divide-slate-700">{children}</tbody>
      </table>
    </HorizontalScroller>
  );
}
