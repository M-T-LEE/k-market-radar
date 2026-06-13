export type MacroIssueTone = "positive" | "neutral" | "negative";
export type MacroIssueImpact = "high" | "medium" | "low";

export interface MacroIssue {
  id: string;
  title: string;
  category: string;
  tone: MacroIssueTone;
  impact: MacroIssueImpact;
  affectedThemes: string[];
  marketRead: string;
  watchPoints: string[];
  updatedAt: string;
}

export interface EarningsCalendarEvent {
  id: string;
  company: string;
  ticker: string;
  date: string;
  theme: string;
  focus: string;
  expectedImpact: "large" | "medium" | "small";
}

export interface RepresentativeChangeHistory {
  chainName: string;
  date: string;
  from: string;
  to: string;
  reason: string;
}

export interface DisclosureValueChainImpact {
  chainName: string;
  company: string;
  event: string;
  impact: "upgrade" | "watch" | "downgrade";
  comment: string;
  date: string;
}

export interface GovernanceChangeWatch {
  groupName: string;
  company: string;
  event: string;
  impact: "watch" | "positive" | "negative";
  comment: string;
  date: string;
}

export const macroIssues: MacroIssue[] = [
  {
    id: "macro-ai-power-capex",
    title: "AI 인프라 투자와 전력 병목 동시 확대",
    category: "인프라",
    tone: "positive",
    impact: "high",
    affectedThemes: ["반도체", "AI 인프라", "전력", "냉각", "데이터센터"],
    marketRead: "국내 AI 서버·반도체 투자 흐름은 전력기기, 냉각, 네트워크까지 수요를 동시에 밀어 올릴 수 있습니다.",
    watchPoints: ["국내 데이터센터 투자 계획", "전력망 투자 계획", "HBM 공급 단가"],
    updatedAt: "2026-06-01"
  },
  {
    id: "macro-defense-export",
    title: "방산 수출 잔고와 재무장 사이클",
    category: "지정학",
    tone: "positive",
    impact: "medium",
    affectedThemes: ["방산", "우주항공", "조선"],
    marketRead: "국내 방산·조선 기업은 수출 계약이 실적 인식으로 이어지는 기업과 단순 기대감 기업의 분리가 필요합니다.",
    watchPoints: ["수주잔고", "인도 일정", "원달러 환율과 원가율"],
    updatedAt: "2026-06-01"
  },
  {
    id: "macro-bio-funding",
    title: "바이오 플랫폼 자금조달과 임상 이벤트 양극화",
    category: "금융여건",
    tone: "neutral",
    impact: "medium",
    affectedThemes: ["바이오", "의료기기"],
    marketRead: "임상 성공 확률과 현금 소진 속도를 함께 봐야 하며, 기술이전 이벤트는 단기 변동성을 크게 만들 수 있습니다.",
    watchPoints: ["임상 단계", "현금 보유", "기술이전 계약 구조"],
    updatedAt: "2026-06-01"
  },
  {
    id: "macro-rate-sensitive",
    title: "금리 경로 불확실성과 성장주 할인율 부담",
    category: "금리",
    tone: "negative",
    impact: "high",
    affectedThemes: ["인터넷/플랫폼", "2차전지", "바이오", "로봇"],
    marketRead: "장기 성장 스토리가 강해도 실적 확인이 늦은 종목은 할인율 변화에 민감하게 반응할 수 있습니다.",
    watchPoints: ["국고채 금리", "원달러 환율", "국내 성장주 컨센서스 하향 여부"],
    updatedAt: "2026-06-01"
  },
  {
    id: "macro-shipbuilding-cycle",
    title: "LNG선과 친환경 선박 발주 사이클",
    category: "산업정책",
    tone: "positive",
    impact: "medium",
    affectedThemes: ["조선", "에너지"],
    marketRead: "선가와 원가, 인도 일정이 동시에 개선될 때 조선 밸류체인 전반으로 확산됩니다.",
    watchPoints: ["신조선가", "후판 가격", "엔진·기자재 납기"],
    updatedAt: "2026-06-01"
  }
];

export const earningsCalendarEvents: EarningsCalendarEvent[] = [
  {
    id: "earnings-sk-hynix",
    company: "SK하이닉스",
    ticker: "000660",
    date: "2026-07-24",
    theme: "반도체",
    focus: "HBM ASP와 서버 DRAM 믹스",
    expectedImpact: "large"
  },
  {
    id: "earnings-hd-electric",
    company: "HD현대일렉트릭",
    ticker: "267260",
    date: "2026-07-28",
    theme: "전력",
    focus: "수주잔고와 북미 변압기 마진",
    expectedImpact: "medium"
  },
  {
    id: "earnings-lg-energy",
    company: "LG에너지솔루션",
    ticker: "373220",
    date: "2026-07-30",
    theme: "2차전지",
    focus: "ESS 비중 확대와 고객사 재고",
    expectedImpact: "large"
  },
  {
    id: "earnings-hanwha-aero",
    company: "한화에어로스페이스",
    ticker: "012450",
    date: "2026-08-01",
    theme: "방산",
    focus: "수출 인도 속도와 우주 사업 비용",
    expectedImpact: "medium"
  }
];

export const representativeChangeHistory: RepresentativeChangeHistory[] = [
  {
    chainName: "HBM",
    date: "2026-05-31",
    from: "삼성전자",
    to: "SK하이닉스",
    reason: "HBM 공급 레퍼런스와 가격 프리미엄 확인도가 더 높아졌습니다."
  },
  {
    chainName: "전력기기",
    date: "2026-05-24",
    from: "LS ELECTRIC",
    to: "HD현대일렉트릭",
    reason: "북미 변압기 수주잔고와 마진 가시성이 대표성 판단을 끌어올렸습니다."
  },
  {
    chainName: "로봇 액추에이터",
    date: "2026-05-18",
    from: "에스피지",
    to: "로보티즈",
    reason: "서비스 로봇과 휴머노이드 부품 노출도가 더 선명해졌습니다."
  },
  {
    chainName: "발사체·추진체",
    date: "2026-05-30",
    from: "한국항공우주",
    to: "한화에어로스페이스",
    reason: "엔진·추진체·발사 서비스 연결성이 우주 밸류체인 중심에 가깝습니다."
  }
];

export const disclosureValueChainImpacts: DisclosureValueChainImpact[] = [
  {
    chainName: "HBM",
    company: "SK하이닉스",
    event: "고대역폭 메모리 증설 투자",
    impact: "upgrade",
    comment: "생산능력 확대가 HBM 병목 해소와 실적 연결성을 동시에 강화합니다.",
    date: "2026-05-31"
  },
  {
    chainName: "전력기기",
    company: "효성중공업",
    event: "북미 전력기기 수주 공시",
    impact: "upgrade",
    comment: "수주잔고가 전력 인프라 사이클의 실적 가시성을 높입니다.",
    date: "2026-05-29"
  },
  {
    chainName: "2차전지 소재",
    company: "포스코퓨처엠",
    event: "고객사 출하 계획 조정",
    impact: "watch",
    comment: "산업 구조는 유지되지만 단기 가동률과 마진 확인이 필요합니다.",
    date: "2026-05-27"
  },
  {
    chainName: "바이오시밀러",
    company: "셀트리온",
    event: "제품 포트폴리오 확대",
    impact: "upgrade",
    comment: "글로벌 판매망과 제품 다변화가 실적 연결성을 보강합니다.",
    date: "2026-05-26"
  }
];

export const governanceChangeWatchlist: GovernanceChangeWatch[] = [
  {
    groupName: "삼성그룹",
    company: "레인보우로보틱스",
    event: "전략 지분 확대 여부 관찰",
    impact: "watch",
    comment: "로봇 사업 옵션이 커질수록 삼성전자와의 사업 연결성 재평가가 필요합니다.",
    date: "2026-06-01"
  },
  {
    groupName: "현대차그룹",
    company: "현대오토에버",
    event: "SDV·차량 SW 계열 내 역할 확대",
    impact: "positive",
    comment: "현대차·기아의 소프트웨어 전환과 지분 구조를 함께 봐야 합니다.",
    date: "2026-06-01"
  },
  {
    groupName: "HD현대그룹",
    company: "HD현대일렉트릭",
    event: "전력기기 자회사 가치 반영 확대",
    impact: "positive",
    comment: "조선과 전력기기 사이클이 같은 그룹 내에서 다른 속도로 움직일 수 있습니다.",
    date: "2026-06-01"
  },
  {
    groupName: "한화그룹",
    company: "한화에어로스페이스",
    event: "방산·우주 밸류체인 통합 관찰",
    impact: "watch",
    comment: "방산 수출과 우주 사업 투자비가 동시에 기업가치에 반영됩니다.",
    date: "2026-06-01"
  }
];
