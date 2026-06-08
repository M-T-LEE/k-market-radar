import { Database, KeyRound, Moon, PlugZap, ShieldCheck } from "lucide-react";
import { useMarketData } from "../context/MarketDataContext";
import { useTheme } from "../context/ThemeContext";
import { apiCredentialChecklist } from "../lib/api/env";
import { getSourceStateLabel, providerLabels } from "../lib/dataSourceLabels";
import { cn } from "../lib/formatters";
import type { DataSourceState, MarketDataSourceStatus } from "../types/marketData";

function getStatusTone(status: DataSourceState | string) {
  return cn(
    "rounded-full px-3 py-1 text-xs font-black",
    status === "live" && "bg-emerald-50 text-emerald-700",
    status === "partial" && "bg-blue-50 text-blue-700",
    status === "error" && "bg-red-50 text-red-700",
    status === "fallback" && "bg-amber-50 text-amber-700",
    status === "disabled" && "bg-slate-200 text-slate-500"
  );
}

function getRuntimeDetail(status: DataSourceState) {
  if (status === "live") return "서버 API 응답을 실제로 확인했습니다.";
  if (status === "partial") return "일부 데이터만 수집되어 경고 내용을 함께 확인해야 합니다.";
  if (status === "fallback") return "대체 데이터로 보완 중입니다.";
  if (status === "error") return "실제 API 요청이 실패했습니다. 경고 원인을 확인해야 합니다.";
  return "서버 설정이 없거나 현재 비활성입니다.";
}

function getCredentialRuntimeStatus(key: string, sourceStatus: MarketDataSourceStatus) {
  const statusMap: Record<string, DataSourceState> = {
    OPEN_DART_API_KEY: sourceStatus.openDart,
    KRX_API_KEY: sourceStatus.krxDailyProvider,
    FMP_API_KEY: sourceStatus.fmpUniverseProvider,
    NEWS_API_KEY: sourceStatus.newsApi,
    NAVER_CLIENT_ID: sourceStatus.naverSearch,
    NAVER_CLIENT_SECRET: sourceStatus.naverSearch,
    SEC_USER_AGENT: sourceStatus.sec,
    SEC_ACCEPT_ENCODING: sourceStatus.sec,
    SEC_REQUESTS_PER_SECOND: sourceStatus.sec
  };
  const status = statusMap[key] ?? "disabled";

  return {
    status,
    detail: getRuntimeDetail(status)
  };
}

export default function Settings() {
  const { sourceStatus, warnings } = useMarketData();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <PlugZap size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">데이터 어댑터</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">실데이터 우선, 실패 소스만 fallback으로 보완합니다.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {Object.entries(sourceStatus).map(([provider, status]) => (
            <div key={provider} className="flex items-center justify-between rounded-lg border border-radar-line bg-slate-50 p-4">
              <span className="font-black">{providerLabels[provider] ?? provider}</span>
              <span
                className={getStatusTone(status)}
              >
                {getSourceStateLabel(status)}
              </span>
            </div>
          ))}
        </div>
        {warnings.length ? (
          <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-teal-50 p-3 text-teal-600">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">투자 판단 안전장치</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">최종 상태는 추천이 아닌 검토 분류로 표시합니다.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {["매수 검토", "조정 대기", "실적 확인 대기", "과열 경고", "제외", "보유 강화", "비중 축소 검토", "이탈 검토"].map((item) => (
            <div key={item} className="rounded-lg border border-radar-line bg-slate-50 p-4 font-black">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-amber-50 p-3 text-amber-600">
            <KeyRound size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">API 키 상태</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">키 값은 .env.local에서만 읽고 화면에는 노출하지 않습니다.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {apiCredentialChecklist.map((item) => {
            const runtime = getCredentialRuntimeStatus(item.key, sourceStatus);

            return (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg border border-radar-line bg-slate-50 p-4">
                <div>
                  <p className="font-black">{item.provider}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.label}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">{runtime.detail}</p>
                </div>
                <span className={getStatusTone(runtime.status)}>
                  {getSourceStateLabel(runtime.status)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Database size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">데이터 기준</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">API 미제공 항목은 기준 데이터로 유지합니다.</p>
          </div>
        </div>
        <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          SEC EDGAR 요청은 서버 어댑터에서 User-Agent, gzip/deflate 압축, 초당 10회 이하 제한을 적용하도록 준비했습니다.
          현재 UI는 주가/뉴스/공시를 실데이터 우선으로 표시하고, 컨센서스 히스토리처럼 API가 아직 붙지 않은 항목은 기준 데이터로 보완합니다.
          국내 현재가는 네이버페이증권 지연시세 Provider를 우선 사용하며, 해당 Provider는 공식 Open API가 아니므로 운영환경에서는 캐싱과 사용량 제한을 전제로 한 참고 시세로만 취급합니다.
        </p>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-slate-100 p-3 text-slate-700">
            <Database size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">화면 표시 정책</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">사용자 화면에서 숨긴 연결·산식 정보를 이곳에서 관리합니다.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 text-sm font-bold leading-6 text-slate-600">
          <p className="rounded-lg bg-slate-50 p-4">
            대시보드 히트맵은 일반 화면에서는 산식 문구를 숨기고, 색상은 등락률, 크기는 시가총액 영향도를 기준으로 계산합니다.
          </p>
          <p className="rounded-lg bg-slate-50 p-4">
            API 연결 상태, fallback 여부, 지연시세 정책은 투자 판단 화면을 방해하지 않도록 설정 화면에서만 확인합니다.
          </p>
          <p className="rounded-lg bg-slate-50 p-4">
            상승은 국내 증시 관습에 맞춰 붉은색, 하락은 파란색으로 표시합니다.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Moon size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black">화면 테마</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">라이트/다크 모드를 전환합니다.</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="mt-6 flex w-full items-center justify-between rounded-lg border border-radar-line bg-slate-50 p-4 text-left"
        >
          <span>
            <span className="block font-black">현재 테마</span>
            <span className="mt-1 block text-sm font-bold text-slate-500">
              {theme === "dark" ? "다크 모드" : "라이트 모드"}
            </span>
          </span>
          <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">
            전환
          </span>
        </button>
      </section>
    </div>
  );
}
