import { BellRing, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AlertCard } from "../components/AlertCard";
import { useFavorites } from "../context/FavoritesContext";
import { useMarketData } from "../context/MarketDataContext";
import { isAlertRead, markAlertsRead, readAlertIds, readAlertKeys } from "../lib/alertReadState";
import { cn } from "../lib/formatters";
import type { Alert, PortfolioHolding } from "../types/portfolio";

const PORTFOLIO_STORAGE_KEY = "market-cycle-radar:portfolio-holdings";

type AlertScope = "all" | "favorites" | "holdings";

const scopeOptions: Array<{ id: AlertScope; label: string }> = [
  { id: "all", label: "전체" },
  { id: "favorites", label: "관심종목" },
  { id: "holdings", label: "보유종목" }
];

const alertConditions: Array<"전체" | Alert["condition"]> = [
  "전체",
  "실적 쇼크",
  "컨센서스 하향",
  "대규모 증자",
  "전환사채 발행",
  "주요 계약 해지",
  "200일선 이탈",
  "기관/외국인 동시 대량 매도",
  "기존 투자논리와 반대되는 산업 이슈 발생",
  "목표가 도달",
  "과열 경고"
];

function readHoldingStockIds() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PortfolioHolding[]) : [];
    return new Set(parsed.map((holding) => holding.stockId).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

export default function Alerts() {
  const { alerts } = useMarketData();
  const { favoriteIds } = useFavorites();
  const [selectedCondition, setSelectedCondition] = useState<(typeof alertConditions)[number]>("전체");
  const [selectedScope, setSelectedScope] = useState<AlertScope>("all");
  const [holdingStockIds, setHoldingStockIds] = useState<Set<string>>(() => readHoldingStockIds());
  const [readIdsAtOpen] = useState(() => readAlertIds());
  const [readKeysAtOpen] = useState(() => readAlertKeys());
  const newAlertIds = useMemo(
    () => new Set(alerts.filter((alert) => !isAlertRead(alert, readIdsAtOpen, readKeysAtOpen)).map((alert) => alert.id)),
    [alerts, readIdsAtOpen, readKeysAtOpen]
  );

  useEffect(() => {
    if (alerts.length) {
      markAlertsRead(alerts);
    }
  }, [alerts]);

  useEffect(() => {
    const syncHoldings = () => setHoldingStockIds(readHoldingStockIds());
    window.addEventListener("storage", syncHoldings);
    window.addEventListener("market-cycle-radar:portfolio-updated", syncHoldings);
    return () => {
      window.removeEventListener("storage", syncHoldings);
      window.removeEventListener("market-cycle-radar:portfolio-updated", syncHoldings);
    };
  }, []);

  const scopedAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (selectedScope === "favorites") return favoriteIds.includes(alert.stockId);
        if (selectedScope === "holdings") return holdingStockIds.has(alert.stockId);
        return true;
      }),
    [alerts, favoriteIds, holdingStockIds, selectedScope]
  );

  const conditionCounts = useMemo(
    () =>
      alertConditions.reduce<Record<string, number>>((acc, condition) => {
        acc[condition] = condition === "전체" ? scopedAlerts.length : scopedAlerts.filter((alert) => alert.condition === condition).length;
        return acc;
      }, {}),
    [scopedAlerts]
  );

  const filteredAlerts = scopedAlerts.filter(
    (alert) => selectedCondition === "전체" || alert.condition === selectedCondition
  );

  return (
    <div className="grid grid-cols-[340px_1fr] items-start gap-5 max-xl:grid-cols-1">
      <aside className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <BellRing size={22} />
          </span>
          <div>
            <h2 className="text-xl font-black">알림 조건</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              범위와 조건을 함께 선택하면 오른쪽 알림이 즉시 필터링됩니다.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-radar-line bg-slate-50 p-3">
          <p className="mb-2 text-xs font-black text-slate-500">빠른 범위</p>
          <div className="grid grid-cols-3 gap-2">
            {scopeOptions.map((scope) => (
              <button
                key={scope.id}
                onClick={() => setSelectedScope(scope.id)}
                className={cn(
                  "rounded-md border border-radar-line px-2 py-2 text-xs font-black transition",
                  selectedScope === scope.id ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-blue-50"
                )}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {alertConditions.map((condition) => (
            <button
              key={condition}
              onClick={() => setSelectedCondition(condition)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-radar-line px-4 py-3 text-left text-sm font-black transition",
                selectedCondition === condition ? "bg-blue-600 text-white" : "bg-slate-50 text-radar-ink hover:bg-blue-50"
              )}
            >
              <span>{condition}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selectedCondition === condition ? "bg-white/20 text-white" : "bg-white text-slate-600"
                )}
              >
                {conditionCounts[condition] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-600">
          알림센터에 진입하면 새 알림 표시는 읽음 처리됩니다. 조건을 선택하면 오른쪽 목록이 즉시 필터링됩니다.
        </div>
      </aside>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">최근 알림</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {scopeOptions.find((scope) => scope.id === selectedScope)?.label} · {selectedCondition} · {filteredAlerts.length}건
              {newAlertIds.size ? ` · 신규 ${newAlertIds.size}건` : " · 신규 없음"}
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <CheckCircle2 size={14} />
            읽음 상태 동기화
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 items-start gap-4 max-2xl:grid-cols-1">
          {!filteredAlerts.length ? (
            <div className="rounded-lg border border-dashed border-radar-line bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              선택한 범위와 조건에 해당하는 알림이 없습니다.
            </div>
          ) : null}
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} isNew={newAlertIds.has(alert.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
