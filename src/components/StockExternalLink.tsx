import { ExternalLink } from "lucide-react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { Stock } from "../types/stock";
import { cn } from "../lib/formatters";
import { getStockExternalLabel, getStockExternalUrl } from "../lib/externalLinks";

export function StockExternalLink({
  stock,
  compact = false,
  className
}: {
  stock: Pick<Stock, "market" | "ticker" | "name">;
  compact?: boolean;
  className?: string;
}) {
  const url = getStockExternalUrl(stock);
  const label = getStockExternalLabel(stock);

  const stopParentAction = (event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-external-stock-link="true"
      onPointerDownCapture={stopParentAction}
      onMouseDownCapture={stopParentAction}
      onClick={stopParentAction}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-radar-line bg-white px-2.5 py-1.5 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-50",
        className
      )}
      title={`${stock.name} ${label} 열기`}
    >
      {compact ? "외부" : label}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}
