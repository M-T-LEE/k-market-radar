import type { ValueChain } from "../types/scenario";
import { Badge } from "./Badge";
import { HorizontalScroller } from "./HorizontalScroller";
import { ScoreBar } from "./ScoreBar";

export type ValueChainTableRow = ValueChain & {
  structuralCentralityScore: number;
  marketConfirmationScore: number;
  marketReactionScore: number;
  currentTemperature: "주도" | "관심 회복" | "중립" | "소외" | "약세";
  leadershipTag: "주도" | "동행" | "후행 관찰" | "소외" | "과열 주의";
  averageDailyChange: number;
  relatedCount: number;
  leaderName?: string;
};

function temperatureTone(value: ValueChainTableRow["currentTemperature"]) {
  if (value === "주도") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "관심 회복") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "중립") return "border-slate-200 bg-slate-100 text-slate-600";
  if (value === "소외") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function leadershipTagTone(value: ValueChainTableRow["leadershipTag"]) {
  if (value === "주도") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "동행") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "후행 관찰") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "과열 주의") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

export function ValueChainTable({
  rows,
  selectedId,
  onSelect
}: {
  rows: ValueChainTableRow[];
  selectedId?: string;
  onSelect: (row: ValueChainTableRow) => void;
}) {
  return (
    <HorizontalScroller
      ariaLabel="밸류체인 표 가로 이동"
      className="sticky-table sticky-left-2 sticky-value-chain-table rounded-lg border border-radar-line bg-white"
      viewportClassName="rounded-lg"
      contentClassName="min-w-full"
      scrollStep={600}
    >
      <table className="min-w-[1420px] w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
          <tr>
            <th className="whitespace-nowrap px-5 py-4 text-left">밸류체인</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">핵심 부품/기술</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">대표 기업</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">산업 병목도</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">시장 유동성</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">시장 반응</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">현재 온도</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">상태 태그</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">실적 연결성</th>
            <th className="whitespace-nowrap px-5 py-4 text-left">코멘트</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-radar-line">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row)}
              className={selectedId === row.id ? "sticky-row-selected bg-blue-50/70 dark:bg-blue-950/35" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70"}
            >
              <td className="px-4 py-4 font-black text-radar-ink">{row.name}</td>
              <td className="px-4 py-4 text-slate-700">{row.coreTechnology}</td>
              <td className="px-4 py-4 font-bold text-blue-700">
                {row.representativeCompanies.join(", ")}
              </td>
              <td className="px-4 py-4">
                <ScoreBar value={row.structuralCentralityScore} />
              </td>
              <td className="px-4 py-4">
                <div className="min-w-[120px]">
                  <ScoreBar value={row.marketConfirmationScore} />
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    평균 {row.averageDailyChange >= 0 ? "+" : ""}{row.averageDailyChange.toFixed(1)}% · {row.relatedCount}개
                  </p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="min-w-[110px]">
                  <ScoreBar value={row.marketReactionScore} />
                </div>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-black ${temperatureTone(row.currentTemperature)}`}>
                  {row.currentTemperature}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-black ${leadershipTagTone(row.leadershipTag)}`}>
                  {row.leadershipTag}
                </span>
              </td>
              <td className="px-4 py-4">
                <Badge value={row.earningsLinkLevel} />
              </td>
              <td className="px-4 py-4 text-slate-700">{row.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </HorizontalScroller>
  );
}
