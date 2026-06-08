import { AlertTriangle, CheckCircle2, Info, Siren } from "lucide-react";
import type { Alert } from "../types/portfolio";
import { useMarketData } from "../context/MarketDataContext";
import { cn } from "../lib/formatters";
import { StockExternalLink } from "./StockExternalLink";

const config = {
  info: { icon: Info, tone: "text-blue-600 bg-blue-50" },
  warning: { icon: AlertTriangle, tone: "text-amber-600 bg-amber-50" },
  critical: { icon: Siren, tone: "text-red-600 bg-red-50" },
  success: { icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" }
};

export function AlertCard({ alert, isNew = false }: { alert: Alert; isNew?: boolean }) {
  const { stocks } = useMarketData();
  const stock = stocks.find((item) => item.id === alert.stockId);
  const Icon = config[alert.severity].icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-radar-line bg-white p-4", isNew && "border-blue-300 bg-blue-50/60")}>
      <span className={cn("rounded-full p-2", config[alert.severity].tone)}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {isNew ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">신규</span> : null}
            <p className="break-keep text-sm font-black leading-5 text-radar-ink">{alert.condition}</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{alert.createdAt}</span>
        </div>
        <p className="mt-1 text-sm leading-5 text-slate-600">{alert.title}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-blue-600">{stock?.name ?? alert.stockId}</p>
          {stock ? <StockExternalLink stock={stock} compact className="px-2 py-1" /> : null}
        </div>
      </div>
    </div>
  );
}
