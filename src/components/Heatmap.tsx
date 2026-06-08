import { TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Stock } from "../types/stock";
import { cn, formatMarketCap, formatPercent, getMarketMoveHeatColor } from "../lib/formatters";
import { getScreenerUrl, getStockExternalLabel, getStockExternalUrl } from "../lib/externalLinks";

const tileColor = (change: number) => getMarketMoveHeatColor(change);

type HeatmapMode = "종목별" | "섹터별";

type SectorTile = {
  sector: string;
  count: number;
  totalMarketCap: number;
  weightedChange: number;
  impact: number;
  leaders: Stock[];
};

function dailyRate(stock: Stock) {
  const value = stock.dailyChangeRate;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function marketCapValue(stock: Stock) {
  return Math.max(Number(stock.marketCap ?? 0), 0);
}

function heatmapImpact(stock: Stock) {
  return marketCapValue(stock) * Math.abs(dailyRate(stock));
}

function sizeClass(index: number) {
  if (index < 2) return "col-span-4 row-span-2";
  if (index < 6) return "col-span-3 row-span-2";
  return "col-span-2 row-span-1";
}

function sectorSizeClass(index: number) {
  if (index < 2) return "col-span-4 row-span-2";
  if (index < 5) return "col-span-3 row-span-2";
  return "col-span-2 row-span-1";
}

function weightedAverageChange(stocks: Stock[]) {
  const denominator = stocks.reduce((sum, stock) => sum + marketCapValue(stock), 0);
  if (!denominator) return 0;

  return stocks.reduce((sum, stock) => sum + dailyRate(stock) * marketCapValue(stock), 0) / denominator;
}

function formatHeatmapMarketCap(value: number, marketLabel: string) {
  if (marketLabel === "US") {
    return `$${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value / 10)}B`;
  }

  return formatMarketCap(value).replace(/\s/g, "");
}

function HeatmapTileContent({
  label,
  subLabel,
  change,
  marketCap,
  compact
}: {
  label: string;
  subLabel: string;
  change: number;
  marketCap: string;
  compact: boolean;
}) {
  if (compact) {
    return (
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        <div className="absolute left-0 right-0 top-0 min-w-0 overflow-hidden pr-1">
          <div className="truncate break-keep text-xs font-black leading-4 text-white drop-shadow-sm">{label}</div>
          <div className="mt-1 truncate break-keep text-[10px] font-bold leading-3 text-white/90">{subLabel}</div>
        </div>

        <div className="absolute bottom-0 right-0 flex max-w-[78px] flex-col items-end text-right font-black text-white drop-shadow-sm">
          <div className="whitespace-nowrap text-xs leading-none">{formatPercent(change)}</div>
          <div className="mt-1 max-w-[78px] truncate whitespace-nowrap text-[10px] font-bold leading-none text-white/85">
            {marketCap}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
      <div className="min-w-0 overflow-hidden">
        <div
          className={cn(
            "truncate break-keep font-black text-white drop-shadow-sm",
            compact ? "text-xs leading-4" : "text-sm leading-5"
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "mt-1 truncate break-keep font-bold text-white/90",
            compact ? "text-[10px] leading-3" : "text-[11px] leading-4"
          )}
        >
          {subLabel}
        </div>
      </div>

      <div className="flex min-w-[58px] shrink-0 flex-col items-end justify-end text-right font-black text-white drop-shadow-sm">
        <div className={cn("flex items-center justify-end gap-1 whitespace-nowrap leading-none", compact ? "text-xs" : "text-base")}>
          {!compact && (change >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />)}
          {formatPercent(change)}
        </div>
        <div className="mt-1 max-w-[76px] truncate whitespace-nowrap text-[10px] font-bold leading-none text-white/85">
          {marketCap}
        </div>
      </div>
    </div>
  );
}

export function Heatmap({
  stocks,
  mode = "종목별",
  marketLabel = "선택 시장",
  className,
  gridClassName
}: {
  stocks: Stock[];
  mode?: HeatmapMode;
  marketLabel?: string;
  className?: string;
  gridClassName?: string;
}) {
  const sectorTiles = Object.values(
    stocks.reduce<Record<string, { sector: string; count: number; totalMarketCap: number; leaders: Stock[] }>>((acc, stock) => {
      const key = stock.theme;
      if (!acc[key]) {
        acc[key] = { sector: key, count: 0, totalMarketCap: 0, leaders: [] };
      }
      const group = acc[key]!;
      group.count += 1;
      group.totalMarketCap += marketCapValue(stock);
      group.leaders.push(stock);
      return acc;
    }, {})
  )
    .map((item): SectorTile => {
      const weightedChange = weightedAverageChange(item.leaders);
      return {
        ...item,
        weightedChange,
        impact: item.totalMarketCap * Math.abs(weightedChange),
        leaders: [...item.leaders].sort((a, b) => heatmapImpact(b) - heatmapImpact(a)).slice(0, 3)
      };
    })
    .sort((a, b) => b.impact - a.impact);

  const stockTiles = [...stocks].sort((a, b) => heatmapImpact(b) - heatmapImpact(a)).slice(0, 16);
  const tiles = mode === "섹터별" ? sectorTiles.slice(0, 12) : stockTiles;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div
        className={cn(
          "grid min-h-[680px] grid-cols-12 auto-rows-[minmax(78px,1fr)] gap-2 overflow-hidden rounded-lg border border-radar-line bg-slate-100 p-2 dark:bg-slate-900 xl:h-[790px] 2xl:h-[830px] max-xl:h-[680px]",
          gridClassName
        )}
      >
        {tiles.map((tile, index) => {
          const isSector = mode === "섹터별";
          const sectorTile = tile as SectorTile;
          const stockTile = tile as Stock;
          const label = isSector ? sectorTile.sector : stockTile.name;
          const change = isSector ? sectorTile.weightedChange : dailyRate(stockTile);
          const span = isSector ? sectorSizeClass(index) : sizeClass(index);
          const compact = index >= 6;
          const leaderLabel = sectorTile.leaders?.[0]?.name ?? "대표 없음";
          const tileMarketCap = isSector ? sectorTile.totalMarketCap : marketCapValue(stockTile);
          const marketCapText = formatHeatmapMarketCap(tileMarketCap, marketLabel);
          const subLabel = isSector ? `${sectorTile.count}개 · 대표 ${leaderLabel}` : stockTile.theme;
          const content = (
            <HeatmapTileContent
              label={label}
              subLabel={subLabel}
              change={change}
              marketCap={marketCapText}
              compact={compact}
            />
          );

          return isSector ? (
            <Link
              key={label}
              to={getScreenerUrl({ theme: label, market: marketLabel === "KOSPI" || marketLabel === "KOSDAQ" ? marketLabel : undefined })}
              className={cn(
                "flex min-h-0 overflow-hidden rounded-md p-3 text-white shadow-sm transition duration-150 hover:brightness-110",
                span
              )}
              style={{ backgroundColor: tileColor(change) }}
              title={`${label} · 관련 ${sectorTile.count}개 · 대표 ${sectorTile.leaders.map((stock) => stock.name).join(", ")} · 시총가중 등락률 ${formatPercent(change)} · 섹터 시총 ${marketCapText}`}
            >
              {content}
            </Link>
          ) : (
            <a
              key={stockTile.id}
              href={getStockExternalUrl(stockTile)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex min-h-0 overflow-hidden rounded-md p-3 text-white shadow-sm transition duration-150 hover:brightness-110",
                span
              )}
              style={{ backgroundColor: tileColor(change) }}
              title={`${stockTile.name} · ${getStockExternalLabel(stockTile)} 열기 · 당일 등락률 ${formatPercent(change)} · 시가총액 ${marketCapText}`}
            >
              {content}
            </a>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span>-2% 이하</span>
        <div className="h-3 flex-1 rounded-full bg-gradient-to-r from-blue-700 via-slate-200 to-red-700" />
        <span>+5% 이상</span>
      </div>
    </div>
  );
}
