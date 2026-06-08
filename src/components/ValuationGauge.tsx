import type { ValuationStatus } from "../types/stock";
import { getValuationPosition } from "../lib/valuation";

export function ValuationGauge({ status }: { status: ValuationStatus }) {
  return (
    <div className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">기대치 판단</h3>
        <span className="text-sm font-bold text-slate-500">현재 구간: {status}</span>
      </div>
      <div className="relative mt-10">
        <div className="grid grid-cols-4 text-center text-sm font-black">
          <span className="text-blue-600">저평가</span>
          <span className="text-emerald-600">적정</span>
          <span className="text-amber-600">기대 반영</span>
          <span className="text-red-600">과열</span>
        </div>
        <div className="relative mt-6 h-3 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-400 to-red-500">
          <div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-teal-500 shadow-lg"
            style={{ left: `${getValuationPosition(status)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
