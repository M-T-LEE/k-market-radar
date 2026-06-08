import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts";
import { ShieldCheck, Star } from "lucide-react";
import type { Stock } from "../types/stock";
import { Badge } from "./Badge";
import { buildScoreProfile, getFinalDecision } from "../lib/scoring";
import { getTechnicalSignals } from "../lib/technicalSignals";
import { StockExternalLink } from "./StockExternalLink";
import { ScoreBar } from "./ScoreBar";

export function RadarScoreCard({ stock }: { stock: Stock }) {
  const profile = buildScoreProfile(stock);
  const technicalSignals = getTechnicalSignals(stock).slice(0, 3);
  const risk = profile.preReflectionRiskScore;
  const finalScore = profile.finalScore;
  const decision = getFinalDecision(finalScore, risk, profile.earningsLinkScore, stock.assetType);
  const isEtf = stock.assetType === "ETF";
  const data = isEtf
    ? [
        { axis: "테마 노출도", value: profile.scenarioScore },
        { axis: "구성종목 품질", value: profile.valueChainScore },
        { axis: "유동성/AUM", value: profile.companyCentralityScore },
        { axis: "분산도", value: profile.earningsLinkScore },
        { axis: "비용/추적", value: profile.financialStabilityScore },
        { axis: "모멘텀", value: profile.valuationJustificationScore },
        { axis: "상품위험 여유", value: profile.riskBufferScore }
      ]
    : [
        { axis: "산업 시나리오", value: profile.scenarioScore },
        { axis: "밸류체인 핵심성", value: profile.valueChainScore },
        { axis: "기업 중심성", value: profile.companyCentralityScore },
        { axis: "시장 주도성", value: profile.marketAttentionScore },
        { axis: "실적 연결성", value: profile.earningsLinkScore },
        { axis: "밸류 정당화", value: profile.valuationJustificationScore },
        { axis: "선반영 여유", value: profile.riskBufferScore }
      ];
  const breakdown = isEtf
    ? [
        { label: "테마", value: profile.scenarioScore },
        { label: "구성", value: profile.valueChainScore },
        { label: "유동성", value: profile.companyCentralityScore },
        { label: "분산", value: profile.earningsLinkScore },
        { label: "추적", value: profile.financialStabilityScore },
        { label: "모멘텀", value: profile.valuationJustificationScore },
        { label: "위험", value: profile.riskBufferScore }
      ]
    : [
        { label: "산업", value: profile.scenarioScore },
        { label: "밸류체인", value: profile.valueChainScore },
        { label: "중심성", value: profile.companyCentralityScore },
        { label: "시장", value: profile.marketAttentionScore },
        { label: "실적", value: profile.earningsLinkScore },
        { label: "밸류", value: profile.valuationJustificationScore },
        { label: "선반영", value: profile.riskBufferScore }
      ];

  return (
    <aside className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-blue-50 p-2 text-blue-600">
            <Star size={20} fill="currentColor" />
          </span>
          <div>
            <h3 className="text-lg font-black">{stock.name}</h3>
            <p className="text-xs font-bold text-slate-500">
              {stock.ticker} · {stock.market}
            </p>
          </div>
        </div>
        <Badge value={decision} />
      </div>
      <div className="mt-4 flex justify-end">
        <StockExternalLink stock={stock} />
      </div>

      <div className="mt-5 rounded-lg border border-radar-line bg-slate-50 p-4">
        <p className="text-xs font-bold text-slate-500">종합 점수</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-4xl font-black text-blue-600">{finalScore}</span>
          <span className="pb-1 text-sm font-bold text-slate-500">/100</span>
        </div>
      </div>

      <div className="mt-4 h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#D8E2EF" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#334155", fontSize: 11, fontWeight: 700 }} />
            <Radar
              dataKey="value"
              stroke="#2563EB"
              fill="#2563EB"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-radar-line bg-slate-50 p-3">
        {breakdown.map((item) => (
          <div key={item.label} className="grid grid-cols-[74px_1fr_34px] items-center gap-2 text-xs font-bold text-slate-600">
            <span>{item.label}</span>
            <ScoreBar value={item.value} showValue={false} />
            <span className="text-right font-black text-radar-ink">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-radar-line bg-white p-4">
        <p className="text-sm font-black text-radar-ink">기술 이벤트</p>
        {technicalSignals.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {technicalSignals.map((signal) => (
              <span
                key={signal.kind}
                title={signal.note}
                className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700"
              >
                {signal.label} · {signal.daysAgo}일
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-slate-500">최근 권장 기간 내 강한 기술 이벤트는 감지되지 않았습니다.</p>
        )}
      </div>

      <div className="rounded-lg border border-radar-line bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-black text-radar-ink">
          <ShieldCheck size={16} className="text-teal-600" />
          종합 결론
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isEtf
            ? "ETF는 개별 기업의 실적 연결성이 아니라 테마 노출도, 구성종목 품질, 유동성/AUM, 분산도, 비용/추적 안정성, 모멘텀, 상품 구조 리스크를 기준으로 평가합니다."
            : "산업 시나리오와 밸류체인 점수만으로 올리지 않고, 실적 연결성·재무 안정성·밸류 부담·선반영 리스크를 함께 차감한 점수입니다."}
          현재 {isEtf ? "상품위험" : "선반영 리스크"}는 {risk >= 65 ? "높은" : risk >= 45 ? "관리 필요" : "낮은"} 구간입니다.
          최종 판정은 실제 매매 추천이 아닌 검토 상태입니다.
        </p>
      </div>
    </aside>
  );
}
