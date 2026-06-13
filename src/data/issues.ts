import type { Alert, Issue } from "../types/portfolio.js";

// 보유종목 이슈 모니터링 화면을 위한 기준 데이터입니다.
export const issues: Issue[] = [
  {
    id: "issue-sk-1",
    stockId: "sk-hynix",
    date: "2025.05.29",
    title: "HBM3E 12단 본격 양산 시작",
    type: "실적 개선",
    sentiment: "positive",
    impactScore: 88,
    thesisImpact: "투자 논리 강화",
    description: "AI 고객사향 공급 본격화로 하반기 출하 확대 기대."
  },
  {
    id: "issue-sk-2",
    stockId: "sk-hynix",
    date: "2025.05.23",
    title: "엔비디아 공급 확대 전망",
    type: "고객사 확대",
    sentiment: "positive",
    impactScore: 82,
    thesisImpact: "투자 논리 강화",
    description: "차세대 AI 칩에 HBM3E 탑재 확대 예상."
  },
  {
    id: "issue-sk-3",
    stockId: "sk-hynix",
    date: "2025.05.08",
    title: "마이크론 생산 차질 보도",
    type: "경쟁 심화",
    sentiment: "neutral",
    impactScore: 45,
    thesisImpact: "판단 보류",
    description: "단기 공급 지연 이슈는 반사이익 가능성과 가격 변동성을 동시에 키움."
  },
  {
    id: "issue-samsung-1",
    stockId: "samsung-electronics",
    date: "2025.05.27",
    title: "HBM 고객사 품질 검증 진전",
    type: "고객사 확대",
    sentiment: "positive",
    impactScore: 75,
    thesisImpact: "투자 논리 강화",
    description: "품질 인증 절차 진전으로 하반기 고부가 메모리 매출 기대."
  },
  {
    id: "issue-hd-1",
    stockId: "hd-hyundai-electric",
    date: "2025.05.21",
    title: "미국 변압기 인증 획득",
    type: "수주/계약",
    sentiment: "positive",
    impactScore: 78,
    thesisImpact: "투자 논리 강화",
    description: "북미 전력 인프라 교체 수요 대응 범위 확대."
  },
  {
    id: "issue-hanmi-1",
    stockId: "hanmi-semiconductor",
    date: "2025.05.16",
    title: "1분기 실적 발표",
    type: "실적 개선",
    sentiment: "positive",
    impactScore: 66,
    thesisImpact: "투자 논리 유지",
    description: "매출과 영업이익이 컨센서스를 상회했으나 주가 기대도 높음."
  },
  {
    id: "issue-isu-1",
    stockId: "isu-petasys",
    date: "2025.05.13",
    title: "단기 수주 모멘텀 약화 우려",
    type: "수급 악화",
    sentiment: "negative",
    impactScore: 72,
    thesisImpact: "투자 논리 일부 훼손",
    description: "주요 고객사의 발주 속도 조절 가능성이 제기됨."
  },
  {
    id: "issue-palantir-1",
    stockId: "palantir",
    date: "2025.05.11",
    title: "200일선 대비 괴리율 확대",
    type: "수급 악화",
    sentiment: "negative",
    impactScore: 86,
    thesisImpact: "투자 논리 일부 훼손",
    description: "실적 상향보다 주가가 빠르게 상승하며 밸류 부담이 증가."
  }
];

export const alerts: Alert[] = [
  {
    id: "alert-1",
    stockId: "hanmi-semiconductor",
    title: "한미반도체 14일 RSI 과열 구간 진입",
    condition: "과열 경고",
    createdAt: "09:12",
    severity: "critical"
  },
  {
    id: "alert-2",
    stockId: "isu-petasys",
    title: "이수페타시스 12M Forward PER 업종 평균 대비 65% 초과",
    condition: "과열 경고",
    createdAt: "08:45",
    severity: "warning"
  },
  {
    id: "alert-3",
    stockId: "palantir",
    title: "기존 투자논리와 반대되는 수급 이슈 발생",
    condition: "기존 투자논리와 반대되는 산업 이슈 발생",
    createdAt: "08:31",
    severity: "critical"
  },
  {
    id: "alert-4",
    stockId: "hd-hyundai-electric",
    title: "목표가 448,000원 도달 근접",
    condition: "목표가 도달",
    createdAt: "08:02",
    severity: "success"
  }
];
