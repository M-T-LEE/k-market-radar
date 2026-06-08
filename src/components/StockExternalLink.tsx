import { ExternalLink } from "lucide-react";
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
  return (
    <a
      href={getStockExternalUrl(stock)}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-radar-line bg-white px-2.5 py-1.5 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-50",
        className
      )}
      title={`${stock.name} ${getStockExternalLabel(stock)} 열기`}
    >
      {compact ? "외부" : getStockExternalLabel(stock)}
      <ExternalLink size={13} />
    </a>
  );
}
