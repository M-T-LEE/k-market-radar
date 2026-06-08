export type UpdatePolicyItem = {
  id: string;
  label: string;
  cadence: string;
  description: string;
};

export const industryUpdatePolicies: UpdatePolicyItem[] = [
  {
    id: "quote",
    label: "가격·수급",
    cadence: "새로고침",
    description: "네이버페이증권 지연시세와 연결된 universe 기준으로 등락률, 거래대금, 시장 유동성을 재계산합니다."
  },
  {
    id: "scenario",
    label: "시나리오 정렬",
    cadence: "일간",
    description: "장 마감 후 테마별 평균 등락률, 확산 폭, 과열도를 기준으로 주도 시나리오 순서를 재정렬합니다."
  },
  {
    id: "value-chain",
    label: "대표기업·밸류체인",
    cadence: "월간+이벤트",
    description: "대형 수주, 공시, 실적, 정책 변화가 발생하면 정기 점검 전이라도 대표기업과 병목 구간을 갱신합니다."
  },
  {
    id: "new-theme",
    label: "신규 테마 후보",
    cadence: "주간",
    description: "뉴스·공시·가격 움직임이 동시에 커지는 산업은 후보 테마로 올려 검증 후 시나리오에 편입합니다."
  }
];

