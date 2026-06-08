export const serverEnvKeys = [
  "OPEN_DART_API_KEY",
  "KRX_API_KEY",
  "FMP_API_KEY",
  "NEWS_API_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "SEC_USER_AGENT",
  "SEC_ACCEPT_ENCODING",
  "SEC_REQUESTS_PER_SECOND"
] as const;

export type ServerEnvKey = (typeof serverEnvKeys)[number];

export interface ApiCredentialStatus {
  key: ServerEnvKey;
  label: string;
  provider: "OpenDART" | "KRX" | "FMP" | "News API" | "Naver Search" | "SEC EDGAR";
  secret: boolean;
}

export const apiCredentialChecklist: ApiCredentialStatus[] = [
  {
    key: "OPEN_DART_API_KEY",
    label: "국내 공시/재무",
    provider: "OpenDART",
    secret: true
  },
  {
    key: "KRX_API_KEY",
    label: "국내 종목/일별 시세",
    provider: "KRX",
    secret: true
  },
  {
    key: "FMP_API_KEY",
    label: "미국 주가/재무",
    provider: "FMP",
    secret: true
  },
  {
    key: "NEWS_API_KEY",
    label: "뉴스/이슈",
    provider: "News API",
    secret: true
  },
  {
    key: "NAVER_CLIENT_ID",
    label: "국내 뉴스 검색",
    provider: "Naver Search",
    secret: true
  },
  {
    key: "NAVER_CLIENT_SECRET",
    label: "국내 뉴스 검색 Secret",
    provider: "Naver Search",
    secret: true
  },
  {
    key: "SEC_USER_AGENT",
    label: "미국 공시 요청 식별자",
    provider: "SEC EDGAR",
    secret: false
  },
  {
    key: "SEC_ACCEPT_ENCODING",
    label: "SEC 압축 응답",
    provider: "SEC EDGAR",
    secret: false
  },
  {
    key: "SEC_REQUESTS_PER_SECOND",
    label: "SEC 요청 속도 제한",
    provider: "SEC EDGAR",
    secret: false
  }
];
