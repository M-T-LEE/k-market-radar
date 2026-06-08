import type { BusinessGroup, GovernanceEdge, GovernanceNode } from "../types/governance";

const defaultSources = [
  { label: "OpenDART 공시검색", url: "https://dart.fss.or.kr/" },
  { label: "공정거래위원회 기업집단포털", url: "https://www.egroup.go.kr/" },
  { label: "KRX 상장회사 정보", url: "https://kind.krx.co.kr/" }
];

const updateTriggers = [
  "최대주주 변경, 주식등의대량보유상황보고서 제출",
  "합병·분할·공개매수·주식교환 등 주요사항보고서 제출",
  "자회사 상장, 물적분할, 지분매각, 블록딜 공시",
  "같은 그룹 내 2개 이상 상장사의 동시 급등락 또는 거래량 급증"
];

function edge(
  id: string,
  from: string,
  to: string,
  ownershipPercent: number,
  relation: GovernanceEdge["relation"],
  note?: string
): GovernanceEdge {
  return {
    id,
    from,
    to,
    ownershipPercent,
    relation,
    source: "CURATED",
    asOf: "2026-05-31",
    confidence: "확인필요",
    note
  };
}

function node(
  id: string,
  name: string,
  type: GovernanceNode["type"],
  role: string,
  x: number,
  y: number,
  options: Partial<GovernanceNode> = {}
): GovernanceNode {
  return {
    id,
    name,
    type,
    role,
    x,
    y,
    listed: Boolean(options.ticker),
    market: options.market ?? (options.ticker ? "KOSPI" : "비상장"),
    ...options
  };
}

export const groupGovernanceData: BusinessGroup[] = [
  {
    id: "samsung",
    name: "삼성그룹",
    shortName: "삼성",
    description: "삼성물산·삼성생명·삼성전자를 축으로 전자, 바이오, 금융 계열과 로봇 전략투자가 연결되는 구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 사업보고서와 대량보유 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("samsung-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("samsung-ct", "삼성물산", "HOLDING", "그룹 지배구조 핵심 축", 30, 36, { ticker: "028260", market: "KOSPI" }),
      node("samsung-life", "삼성생명", "FINANCE", "삼성전자 지분 보유 금융 계열", 30, 66, { ticker: "032830", market: "KOSPI" }),
      node("samsung-fire", "삼성화재", "FINANCE", "손해보험 금융 계열", 30, 82, { ticker: "000810", market: "KOSPI" }),
      node("samsung-card", "삼성카드", "FINANCE", "카드 금융 계열", 30, 94, { ticker: "029780", market: "KOSPI" }),
      node("samsung-sec", "삼성증권", "FINANCE", "증권 금융 계열", 44, 94, { ticker: "016360", market: "KOSPI" }),
      node("samsung-elec", "삼성전자", "OPERATING", "반도체·모바일 핵심 사업회사", 58, 42, { ticker: "005930", market: "KOSPI" }),
      node("samsung-sds", "삼성에스디에스", "OPERATING", "클라우드·물류 IT·그룹 DX", 58, 62, { ticker: "018260", market: "KOSPI" }),
      node("samsung-em", "삼성전기", "OPERATING", "MLCC·반도체 기판", 70, 24, { ticker: "009150", market: "KOSPI" }),
      node("samsung-bio", "삼성바이오로직스", "OPERATING", "바이오 CDMO 성장 축", 82, 24, { ticker: "207940", market: "KOSPI" }),
      node("rainbow-robotics", "레인보우로보틱스", "STRATEGIC", "AI 휴머노이드·로봇 전략투자", 82, 50, {
        ticker: "277810",
        market: "KOSDAQ",
        notes: ["삼성전자의 로봇 전략투자 축", "계열회사 편입 여부와 지분 변동은 공시 기준 재검증 대상"]
      }),
      node("samsung-sdi", "삼성SDI", "OPERATING", "2차전지·전자재료", 82, 76, { ticker: "006400", market: "KOSPI" }),
      node("samsung-heavy", "삼성중공업", "OPERATING", "조선·해양플랜트", 82, 94, { ticker: "010140", market: "KOSPI" })
    ],
    edges: [
      edge("samsung-e1", "samsung-owner", "samsung-ct", 33.5, "지배", "특수관계인 보유 지분을 단순화한 기준입니다."),
      edge("samsung-e2", "samsung-ct", "samsung-elec", 5.0, "주요지분"),
      edge("samsung-e3", "samsung-life", "samsung-elec", 8.5, "주요지분"),
      edge("samsung-e4", "samsung-ct", "samsung-bio", 43.1, "자회사"),
      edge("samsung-e5", "samsung-elec", "samsung-sdi", 19.6, "전략지분"),
      edge("samsung-e6", "samsung-elec", "rainbow-robotics", 35.0, "전략지분", "삼성전자가 로봇 사업 확장을 위해 보유한 전략투자 지분입니다. 실제 지분율은 대량보유·사업보고서 기준으로 갱신해야 합니다.")
    ],
    keyIssues: ["금융 계열 지분 규제", "바이오 자회사 가치 반영", "전자·부품 계열 동조화"],
    investmentRoadmap: [
      {
        id: "samsung-roadmap-memory",
        title: "AI 반도체·HBM 중심축",
        theme: "반도체",
        stage: "핵심 사업",
        leadingCompanies: ["삼성전자", "삼성전기", "삼성에스디에스"],
        listedTickers: ["005930", "009150", "018260"],
        rationale: "HBM, 파운드리, 패키징, AI 서버용 기판 수요가 그룹 내 전자·부품 계열로 이어집니다.",
        watchPoints: ["HBM 고객 승인", "파운드리 가동률", "패키징·기판 투자 확대", "클라우드·그룹 IT 투자"]
      },
      {
        id: "samsung-roadmap-bio",
        title: "바이오 CDMO와 신약 플랫폼",
        theme: "바이오",
        stage: "성장 투자",
        leadingCompanies: ["삼성바이오로직스", "삼성물산"],
        listedTickers: ["207940", "028260"],
        rationale: "바이오 자회사 가치가 지주성 자산인 삼성물산 평가에 영향을 줄 수 있습니다.",
        watchPoints: ["대형 위탁생산 계약", "공장 가동률", "ADC·항체 의약품 수요"]
      },
      {
        id: "samsung-roadmap-battery",
        title: "전고체·ESS·전자재료",
        theme: "2차전지",
        stage: "관찰",
        leadingCompanies: ["삼성SDI", "삼성전자"],
        listedTickers: ["006400", "005930"],
        rationale: "전기차 성장 둔화 이후 ESS와 차세대 전지 모멘텀 확인이 필요합니다.",
        watchPoints: ["ESS 수주", "전고체 파일럿", "고객사 재고 조정"]
      },
      {
        id: "samsung-roadmap-robotics",
        title: "AI 로봇·휴머노이드 전략투자",
        theme: "로봇",
        stage: "성장 투자",
        leadingCompanies: ["삼성전자", "레인보우로보틱스"],
        listedTickers: ["005930", "277810"],
        rationale: "삼성전자의 로봇 투자 지분은 단순 계열 지배구조가 아니라 AI·로봇 신사업 옵션으로 추적해야 합니다.",
        watchPoints: ["로봇 양산 계획", "콜옵션·지분 변동", "삼성전자 로봇 사업화", "레인보우로보틱스 수주·매출화"]
      },
      {
        id: "samsung-roadmap-ship-finance",
        title: "조선·금융 계열 보조축",
        theme: "조선·금융",
        stage: "관찰",
        leadingCompanies: ["삼성중공업", "삼성생명", "삼성화재", "삼성카드", "삼성증권"],
        listedTickers: ["010140", "032830", "000810", "029780", "016360"],
        rationale: "지분선으로 직접 연결되지 않는 상장 계열도 그룹 전체 수급과 업황 변화에는 영향을 주므로 별도 관찰 축으로 둡니다.",
        watchPoints: ["조선 수주·선가", "금리·보험손익", "금융 규제", "그룹 계열 동반 수급"]
      }
    ],
    watchSignals: ["삼성전자 급등락이 삼성물산·삼성생명 할인율에 미치는 영향", "삼성바이오로직스 가치 재평가", "전자부품·2차전지 계열 동반 수급", "삼성전자·레인보우로보틱스 로봇 투자 동조화"]
  },
  {
    id: "sk",
    name: "SK그룹",
    shortName: "SK",
    description: "SK스퀘어·SK하이닉스와 SK㈜·에너지·통신 계열이 병렬로 움직이는 구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "대량보유 공시와 투자회사 포트폴리오 변경 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("sk-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("sk-inc", "SK", "HOLDING", "투자형 지주회사", 30, 35, { ticker: "034730", market: "KOSPI" }),
      node("sk-square", "SK스퀘어", "HOLDING", "반도체 투자회사", 30, 68, { ticker: "402340", market: "KOSPI" }),
      node("sk-hynix", "SK하이닉스", "OPERATING", "HBM·메모리 핵심 사업회사", 58, 66, { ticker: "000660", market: "KOSPI" }),
      node("sk-telecom", "SK텔레콤", "OPERATING", "통신·AI 인프라", 58, 32, { ticker: "017670", market: "KOSPI" }),
      node("sk-innovation", "SK이노베이션", "OPERATING", "에너지·배터리 중간 축", 82, 34, { ticker: "096770", market: "KOSPI" }),
      node("sk-on", "SK온", "UNLISTED", "배터리 비상장 자회사", 82, 64, { listed: false, market: "비상장" })
    ],
    edges: [
      edge("sk-e1", "sk-owner", "sk-inc", 25.6, "지배"),
      edge("sk-e2", "sk-inc", "sk-telecom", 30.6, "자회사"),
      edge("sk-e3", "sk-inc", "sk-square", 30.0, "주요지분"),
      edge("sk-e4", "sk-square", "sk-hynix", 20.1, "자회사"),
      edge("sk-e5", "sk-inc", "sk-innovation", 36.2, "자회사"),
      edge("sk-e6", "sk-innovation", "sk-on", 89.5, "자회사")
    ],
    keyIssues: ["SK하이닉스 가치의 SK스퀘어 반영", "배터리 자금조달", "통신·AI 인프라 재평가"],
    investmentRoadmap: [
      {
        id: "sk-roadmap-hbm",
        title: "HBM·AI 메모리",
        theme: "반도체",
        stage: "핵심 사업",
        leadingCompanies: ["SK하이닉스", "SK스퀘어"],
        listedTickers: ["000660", "402340"],
        rationale: "SK스퀘어가 보유한 SK하이닉스 가치가 그룹 지분가치의 핵심 민감도입니다.",
        watchPoints: ["HBM3E·HBM4 공급", "AI 고객사 CAPEX", "메모리 ASP"]
      },
      {
        id: "sk-roadmap-ai-telco",
        title: "AI 데이터센터·통신 인프라",
        theme: "AI 인프라",
        stage: "성장 투자",
        leadingCompanies: ["SK텔레콤", "SK"],
        listedTickers: ["017670", "034730"],
        rationale: "통신망, 데이터센터, AI 서비스 투자가 장기 성장축으로 재분류될 수 있습니다.",
        watchPoints: ["AI 서비스 매출화", "데이터센터 투자", "배당 여력"]
      },
      {
        id: "sk-roadmap-battery",
        title: "배터리 자금조달·재편",
        theme: "2차전지",
        stage: "회수·재편",
        leadingCompanies: ["SK이노베이션", "SK온"],
        listedTickers: ["096770"],
        rationale: "비상장 배터리 자회사의 자금조달과 수익성 개선 여부가 지주·에너지 계열 평가에 중요합니다.",
        watchPoints: ["상장·투자 유치", "CAPEX 조정", "흑자 전환 시점"]
      }
    ],
    watchSignals: ["SK하이닉스와 SK스퀘어 동조화", "SK온 투자·상장 이벤트", "에너지 계열 실적 변동"]
  },
  {
    id: "hyundai-motor",
    name: "현대차그룹",
    shortName: "현대차",
    description: "현대자동차그룹입니다. 현대모비스·현대차·기아의 순환출자 축에 SDV·방산·건설·물류 계열이 연결됩니다. HD현대그룹과는 별도 기업집단입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "지배구조 개편, 자사주, 합병·분할 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("hm-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 8, 50, { listed: false }),
      node("mobis", "현대모비스", "HOLDING", "부품·지배구조 핵심 축", 28, 38, { ticker: "012330", market: "KOSPI" }),
      node("hyundai", "현대차", "OPERATING", "완성차 핵심 사업회사", 50, 26, { ticker: "005380", market: "KOSPI" }),
      node("kia", "기아", "OPERATING", "완성차 수익성 축", 50, 56, { ticker: "000270", market: "KOSPI" }),
      node("glovis", "현대글로비스", "OPERATING", "물류·CKD·배당 관찰", 72, 12, { ticker: "086280", market: "KOSPI" }),
      node("autoever", "현대오토에버", "OPERATING", "SDV·클라우드·그룹 IT", 72, 34, { ticker: "307950", market: "KOSPI" }),
      node("rotem", "현대로템", "OPERATING", "철도·방산·수소 모빌리티", 72, 56, { ticker: "064350", market: "KOSPI" }),
      node("fortytwodot", "포티투닷", "STRATEGIC", "자율주행·SDV 소프트웨어", 72, 80, { listed: false, market: "비상장" }),
      node("steel", "현대제철", "OPERATING", "소재·원가 민감 계열", 90, 18, { ticker: "004020", market: "KOSPI" }),
      node("wia", "현대위아", "OPERATING", "파워트레인·열관리·공작기계", 90, 42, { ticker: "011210", market: "KOSPI" }),
      node("hdec", "현대건설", "OPERATING", "건설·인프라·에너지 플랜트", 90, 66, { ticker: "000720", market: "KOSPI" }),
      node("boston-dynamics", "보스턴 다이내믹스", "STRATEGIC", "로봇 플랫폼 전략투자", 90, 90, { listed: false, market: "기타" })
    ],
    edges: [
      edge("hm-e1", "hm-owner", "mobis", 7.0, "지배"),
      edge("hm-e2", "mobis", "hyundai", 21.4, "주요지분"),
      edge("hm-e3", "hyundai", "kia", 33.9, "자회사"),
      edge("hm-e4", "kia", "mobis", 17.5, "순환출자"),
      edge("hm-e5", "hyundai", "glovis", 4.9, "전략지분"),
      edge("hm-e6", "hyundai", "steel", 6.9, "전략지분"),
      edge("hm-e7", "hyundai", "autoever", 31.6, "자회사", "현대오토에버는 현대차·현대모비스·기아가 함께 보유하는 SDV·그룹 IT 핵심 계열입니다."),
      edge("hm-e8", "mobis", "autoever", 20.1, "주요지분", "현대모비스의 SDV·부품 소프트웨어 전환과 연결되는 지분입니다."),
      edge("hm-e9", "kia", "autoever", 16.2, "주요지분", "기아의 SDV·커넥티드카 시스템 연결 지분입니다."),
      edge("hm-e10", "hm-owner", "autoever", 7.3, "전략지분", "특수관계인 지분을 별도 표시해 지배구조 민감도를 확인합니다."),
      edge("hm-e11", "hyundai", "rotem", 33.8, "자회사", "현대로템은 철도와 방산 수출 사이클을 함께 확인하는 계열입니다."),
      edge("hm-e12", "hyundai", "wia", 25.4, "주요지분", "현대위아는 구동·열관리·기계 부품 사이클과 연결됩니다."),
      edge("hm-e13", "kia", "wia", 13.4, "주요지분"),
      edge("hm-e14", "hyundai", "hdec", 21.0, "주요지분", "현대건설은 그룹의 건설·플랜트·에너지 인프라 축입니다."),
      edge("hm-e15", "hyundai", "fortytwodot", 55.9, "전략지분", "포티투닷은 현대차그룹 SDV·자율주행 소프트웨어 전략투자 축입니다."),
      edge("hm-e16", "kia", "fortytwodot", 37.3, "전략지분", "기아의 SDV·커넥티드카 소프트웨어 전환과 연결됩니다."),
      edge("hm-e17", "hyundai", "boston-dynamics", 30.0, "전략지분", "보스턴 다이내믹스는 로봇 플랫폼 전략투자 축입니다. 비상장이라 직접 시세 대신 현대차·모비스·글로비스와 로봇 업황을 함께 봅니다."),
      edge("hm-e18", "mobis", "boston-dynamics", 20.0, "전략지분"),
      edge("hm-e19", "glovis", "boston-dynamics", 10.0, "전략지분")
    ],
    keyIssues: ["지배구조 개편 가능성", "완성차와 부품사의 이익 배분", "자사주·배당 정책"],
    investmentRoadmap: [
      {
        id: "hm-roadmap-sdv",
        title: "SDV·자율주행·전장",
        theme: "자동차",
        stage: "성장 투자",
        leadingCompanies: ["현대차", "현대모비스", "기아", "현대오토에버", "포티투닷"],
        listedTickers: ["005380", "012330", "000270", "307950"],
        rationale: "완성차 수익성이 소프트웨어, 전장, 부품 내재화로 이어지는지 확인하는 축입니다.",
        watchPoints: ["전장 수주", "SDV 투자", "현대오토에버 그룹 IT 매출", "포티투닷 자율주행 소프트웨어", "로보택시·자율주행 협력"]
      },
      {
        id: "hm-roadmap-robotics",
        title: "로봇 플랫폼 전략투자",
        theme: "로봇",
        stage: "성장 투자",
        leadingCompanies: ["현대차", "현대모비스", "현대글로비스", "보스턴 다이내믹스"],
        listedTickers: ["005380", "012330", "086280"],
        rationale: "보스턴 다이내믹스는 비상장 전략투자지만 로봇 플랫폼 상용화 기대가 현대차그룹 신사업 프리미엄에 영향을 줄 수 있습니다.",
        watchPoints: ["로봇 양산", "물류·공장 자동화 적용", "현대차그룹 로봇 투자 확대", "비상장 가치평가 변화"]
      },
      {
        id: "hm-roadmap-shareholder",
        title: "주주환원·지배구조 개편",
        theme: "지주 복합",
        stage: "관찰",
        leadingCompanies: ["현대차", "기아", "현대모비스"],
        listedTickers: ["005380", "000270", "012330"],
        rationale: "배당·자사주·순환출자 해소 기대가 그룹사 동반 재평가로 연결될 수 있습니다.",
        watchPoints: ["자사주 소각", "모비스 역할 변화", "순환출자 재편"]
      },
      {
        id: "hm-roadmap-logistics",
        title: "물류·소재 밸류체인",
        theme: "물류·소재",
        stage: "핵심 사업",
        leadingCompanies: ["현대글로비스", "현대제철"],
        listedTickers: ["086280", "004020"],
        rationale: "완성차 생산과 물류·소재 원가 사이클이 그룹 수익성에 연결됩니다.",
        watchPoints: ["운임", "강판 가격", "CKD 물량"]
      },
      {
        id: "hm-roadmap-defense-rail",
        title: "철도·방산·기계 부품",
        theme: "방산·기계",
        stage: "성장 투자",
        leadingCompanies: ["현대로템", "현대위아"],
        listedTickers: ["064350", "011210"],
        rationale: "현대로템의 방산·철도 수주와 현대위아의 구동·열관리 부품이 완성차 외 성장축으로 작동합니다.",
        watchPoints: ["방산 수출", "철도 수주", "열관리·구동 부품 수주"]
      },
      {
        id: "hm-roadmap-infra",
        title: "건설·플랜트·에너지 인프라",
        theme: "건설",
        stage: "관찰",
        leadingCompanies: ["현대건설"],
        listedTickers: ["000720"],
        rationale: "현대건설은 그룹의 인프라·원전·플랜트 수주 사이클을 확인하는 별도 축입니다.",
        watchPoints: ["원전·플랜트 수주", "해외 인프라", "주택 경기"]
      }
    ],
    watchSignals: ["현대차·기아 실적 서프라이즈와 현대모비스 할인율", "전기차·로봇·SDV 투자", "원화·미국 관세 민감도"]
  },
  {
    id: "lg",
    name: "LG그룹",
    shortName: "LG",
    description: "LG 지주회사와 전자·화학·에너지솔루션·통신 계열의 자회사 가치가 핵심입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "자회사 실적·상장·지분매각 이벤트 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("lg-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("lg-holdings", "LG", "HOLDING", "지주회사", 32, 50, { ticker: "003550", market: "KOSPI" }),
      node("lg-electronics", "LG전자", "OPERATING", "가전·전장·플랫폼", 58, 25, { ticker: "066570", market: "KOSPI" }),
      node("lg-chem", "LG화학", "OPERATING", "소재·배터리 지분", 58, 50, { ticker: "051910", market: "KOSPI" }),
      node("lg-uplus", "LG유플러스", "OPERATING", "통신·AI 인프라", 58, 75, { ticker: "032640", market: "KOSPI" }),
      node("lg-energy", "LG에너지솔루션", "OPERATING", "배터리 셀·ESS", 82, 50, { ticker: "373220", market: "KOSPI" })
    ],
    edges: [
      edge("lg-e1", "lg-owner", "lg-holdings", 41.0, "지배"),
      edge("lg-e2", "lg-holdings", "lg-electronics", 33.7, "자회사"),
      edge("lg-e3", "lg-holdings", "lg-chem", 33.3, "자회사"),
      edge("lg-e4", "lg-holdings", "lg-uplus", 37.7, "자회사"),
      edge("lg-e5", "lg-chem", "lg-energy", 81.8, "자회사")
    ],
    keyIssues: ["LG에너지솔루션 가치의 LG화학 반영", "전자 전장·플랫폼 재평가", "지주회사 할인율"],
    investmentRoadmap: [
      {
        id: "lg-roadmap-battery",
        title: "배터리·ESS·소재",
        theme: "2차전지",
        stage: "핵심 사업",
        leadingCompanies: ["LG화학", "LG에너지솔루션"],
        listedTickers: ["051910", "373220"],
        rationale: "LG화학이 보유한 LG에너지솔루션 지분가치와 소재 회복 여부가 핵심입니다.",
        watchPoints: ["ESS 수요", "미국 보조금", "양극재 마진"]
      },
      {
        id: "lg-roadmap-auto-parts",
        title: "전장·가전 플랫폼",
        theme: "자동차·플랫폼",
        stage: "성장 투자",
        leadingCompanies: ["LG전자"],
        listedTickers: ["066570"],
        rationale: "가전 안정성과 전장 수주잔고가 LG전자 밸류에이션 재평가의 핵심 축입니다.",
        watchPoints: ["전장 흑자", "WebOS 플랫폼", "로봇·HVAC"]
      },
      {
        id: "lg-roadmap-ai-infra",
        title: "통신·AI 인프라",
        theme: "AI 인프라",
        stage: "관찰",
        leadingCompanies: ["LG유플러스", "LG"],
        listedTickers: ["032640", "003550"],
        rationale: "통신망과 데이터센터 수요가 그룹의 방어적 현금흐름과 연결됩니다.",
        watchPoints: ["IDC 투자", "B2B AI 서비스", "배당 안정성"]
      }
    ],
    watchSignals: ["LG화학·LG에너지솔루션 괴리", "전자 전장 수주", "통신·AI 데이터센터 투자"]
  },
  {
    id: "hanwha",
    name: "한화그룹",
    shortName: "한화",
    description: "한화㈜에서 방산·우주·조선·금융 계열로 이어지는 성장형 지배구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "방산·조선 수주, 계열 지분 재편, 유상증자 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("hanwha-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("hanwha-corp", "한화", "HOLDING", "지주·화약·솔루션 축", 32, 50, { ticker: "000880", market: "KOSPI" }),
      node("hanwha-aero", "한화에어로스페이스", "OPERATING", "방산·우주 핵심 사업회사", 58, 30, { ticker: "012450", market: "KOSPI" }),
      node("hanwha-sol", "한화솔루션", "OPERATING", "태양광·화학", 58, 70, { ticker: "009830", market: "KOSPI" }),
      node("hanwha-systems", "한화시스템", "OPERATING", "방산 전자·우주 통신", 82, 26, { ticker: "272210", market: "KOSPI" }),
      node("hanwha-ocean", "한화오션", "OPERATING", "방산·상선 조선", 82, 54, { ticker: "042660", market: "KOSPI" }),
      node("satrec", "쎄트렉아이", "STRATEGIC", "위성 제조·탑재체 전략투자", 82, 78, { ticker: "099320", market: "KOSDAQ" }),
      node("hanwha-life", "한화생명", "FINANCE", "금융 계열", 94, 78, { ticker: "088350", market: "KOSPI" })
    ],
    edges: [
      edge("hanwha-e1", "hanwha-owner", "hanwha-corp", 31.0, "지배"),
      edge("hanwha-e2", "hanwha-corp", "hanwha-aero", 33.9, "자회사"),
      edge("hanwha-e3", "hanwha-corp", "hanwha-sol", 36.0, "자회사"),
      edge("hanwha-e4", "hanwha-aero", "hanwha-systems", 46.7, "자회사"),
      edge("hanwha-e5", "hanwha-aero", "hanwha-ocean", 23.0, "주요지분"),
      edge("hanwha-e6", "hanwha-corp", "hanwha-life", 18.2, "주요지분"),
      edge("hanwha-e7", "hanwha-aero", "satrec", 36.0, "전략지분", "쎄트렉아이는 한화 우주 밸류체인의 위성 제조·탑재체 전략투자 축입니다. 실제 지분율은 사업보고서 기준으로 갱신해야 합니다.")
    ],
    keyIssues: ["방산·우주 밸류체인 재평가", "조선 계열 지분가치", "금융 계열 자본 규제"],
    investmentRoadmap: [
      {
        id: "hanwha-roadmap-defense-space",
        title: "방산·우주 통합 밸류체인",
        theme: "방산·우주항공",
        stage: "핵심 사업",
        leadingCompanies: ["한화에어로스페이스", "한화시스템", "쎄트렉아이"],
        listedTickers: ["012450", "272210", "099320"],
        rationale: "지상무기, 항공엔진, 위성·통신이 한 그룹 내에서 연결되는 성장축입니다.",
        watchPoints: ["수출 계약", "우주 발사·위성 프로젝트", "위성 제조·탑재체 수주", "국방 예산"]
      },
      {
        id: "hanwha-roadmap-ship",
        title: "방산 조선·상선 회복",
        theme: "조선",
        stage: "성장 투자",
        leadingCompanies: ["한화오션"],
        listedTickers: ["042660"],
        rationale: "특수선과 LNG·친환경선 수주가 방산 그룹 프리미엄과 결합될 수 있습니다.",
        watchPoints: ["특수선 수주", "선가", "증자·재무구조"]
      },
      {
        id: "hanwha-roadmap-solar-finance",
        title: "태양광·금융 안정화",
        theme: "에너지·금융",
        stage: "관찰",
        leadingCompanies: ["한화솔루션", "한화생명"],
        listedTickers: ["009830", "088350"],
        rationale: "태양광 업황과 금융 계열 자본 여력이 그룹 현금흐름에 영향을 줍니다.",
        watchPoints: ["태양광 가격", "금리", "보험 자본 규제"]
      }
    ],
    watchSignals: ["방산 수주와 한화·한화에어로스페이스 동조화", "한화오션 증자·수주", "우주 통신 이벤트"]
  },
  {
    id: "hd-hyundai",
    name: "HD현대그룹",
    shortName: "HD현대",
    description: "옛 현대중공업그룹 계열의 별도 기업집단입니다. HD현대를 정점으로 조선·전력기기·건설기계·해양서비스 계열이 연결됩니다. 현대자동차그룹과는 분리해서 봅니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "조선·전력기기 수주와 자회사 지분가치 변화 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("hd-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("hd-holdings", "HD현대", "HOLDING", "지주회사", 28, 50, { ticker: "267250", market: "KOSPI" }),
      node("hd-ksoe", "HD한국조선해양", "HOLDING", "조선 중간 지주", 54, 22, { ticker: "009540", market: "KOSPI" }),
      node("hd-electric", "HD현대일렉트릭", "OPERATING", "전력기기", 54, 52, { ticker: "267260", market: "KOSPI" }),
      node("hd-infracore", "HD현대인프라코어", "OPERATING", "건설기계·엔진", 54, 80, { ticker: "042670", market: "KOSPI" }),
      node("hd-heavy", "HD현대중공업", "OPERATING", "조선·해양", 82, 16, { ticker: "329180", market: "KOSPI" }),
      node("hd-mipo", "현대미포조선", "OPERATING", "중형선", 82, 40, { ticker: "010620", market: "KOSPI" }),
      node("hd-marine", "HD현대마린솔루션", "OPERATING", "선박 서비스", 82, 64, { ticker: "443060", market: "KOSPI" }),
      node("avikus", "아비커스", "STRATEGIC", "자율운항 선박 AI", 68, 88, { listed: false, market: "비상장" }),
      node("hd-construction", "HD현대건설기계", "OPERATING", "건설장비", 88, 88, { ticker: "267270", market: "KOSPI" })
    ],
    edges: [
      edge("hd-e1", "hd-owner", "hd-holdings", 36.0, "지배"),
      edge("hd-e2", "hd-holdings", "hd-ksoe", 36.7, "자회사"),
      edge("hd-e3", "hd-holdings", "hd-electric", 37.0, "자회사"),
      edge("hd-e7", "hd-holdings", "hd-infracore", 33.0, "자회사"),
      edge("hd-e8", "hd-holdings", "hd-construction", 36.0, "자회사"),
      edge("hd-e4", "hd-ksoe", "hd-heavy", 78.0, "자회사"),
      edge("hd-e5", "hd-ksoe", "hd-mipo", 42.4, "자회사"),
      edge("hd-e6", "hd-holdings", "hd-marine", 55.8, "자회사"),
      edge("hd-e9", "hd-holdings", "avikus", 100.0, "전략지분", "아비커스는 자율운항 선박 AI 전략투자 축입니다. 비상장이라 HD현대·조선 계열과 함께 모니터링합니다.")
    ],
    keyIssues: ["조선 자회사 가치 반영", "전력기기 리레이팅", "마린솔루션 상장 이후 지주 할인"],
    investmentRoadmap: [
      {
        id: "hd-roadmap-shipbuilding",
        title: "조선·친환경선",
        theme: "조선",
        stage: "핵심 사업",
        leadingCompanies: ["HD한국조선해양", "HD현대중공업", "현대미포조선"],
        listedTickers: ["009540", "329180", "010620"],
        rationale: "LNG, 암모니아, 메탄올 선박 수주가 중간지주와 조선 자회사 가치에 연결됩니다.",
        watchPoints: ["선가", "수주잔고", "후판 가격"]
      },
      {
        id: "hd-roadmap-grid",
        title: "전력기기·데이터센터 전력",
        theme: "전력",
        stage: "성장 투자",
        leadingCompanies: ["HD현대일렉트릭"],
        listedTickers: ["267260"],
        rationale: "변압기·차단기 수요가 조선과 다른 독립 리레이팅 축을 형성합니다.",
        watchPoints: ["미국 변압기 수주", "마진", "증설"]
      },
      {
        id: "hd-roadmap-marine-service",
        title: "선박 애프터마켓 서비스",
        theme: "서비스",
        stage: "핵심 사업",
        leadingCompanies: ["HD현대마린솔루션", "아비커스"],
        listedTickers: ["443060"],
        rationale: "운항 선박의 유지보수·부품·개조 수요와 자율운항 AI가 반복 매출·소프트웨어 프리미엄으로 연결될 수 있습니다.",
        watchPoints: ["서비스 마진", "친환경 개조", "부품 공급", "자율운항 솔루션 적용"]
      },
      {
        id: "hd-roadmap-construction-equipment",
        title: "건설기계·엔진",
        theme: "기계·장비",
        stage: "관찰",
        leadingCompanies: ["HD현대인프라코어", "HD현대건설기계"],
        listedTickers: ["042670", "267270"],
        rationale: "HD현대의 조선·전력 외 사이클로, 인프라 투자와 건설기계 수요를 확인하는 축입니다.",
        watchPoints: ["북미·신흥국 장비 수요", "엔진 사업", "건설장비 통합 시너지"]
      }
    ],
    watchSignals: ["HD현대일렉트릭 급등락과 HD현대 동조화", "조선 수주·선가", "해양서비스 마진"]
  },
  {
    id: "doosan",
    name: "두산그룹",
    shortName: "두산",
    description: "두산을 정점으로 에너빌리티·밥캣·로보틱스·퓨얼셀 가치가 연결됩니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "원전·SMR·로봇·자회사 지분 이벤트 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("doosan-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("doosan-corp", "두산", "HOLDING", "지주·사업회사", 32, 50, { ticker: "000150", market: "KOSPI" }),
      node("doosan-energy", "두산에너빌리티", "OPERATING", "원전·터빈·SMR", 58, 34, { ticker: "034020", market: "KOSPI" }),
      node("doosan-robotics", "두산로보틱스", "OPERATING", "협동로봇", 58, 68, { ticker: "454910", market: "KOSPI" }),
      node("doosan-bobcat", "두산밥캣", "OPERATING", "건설장비", 82, 34, { ticker: "241560", market: "KOSPI" }),
      node("doosan-fuelcell", "두산퓨얼셀", "OPERATING", "수소 연료전지", 82, 68, { ticker: "336260", market: "KOSPI" })
    ],
    edges: [
      edge("doosan-e1", "doosan-owner", "doosan-corp", 39.0, "지배"),
      edge("doosan-e2", "doosan-corp", "doosan-energy", 30.4, "자회사"),
      edge("doosan-e3", "doosan-corp", "doosan-robotics", 68.0, "자회사"),
      edge("doosan-e4", "doosan-energy", "doosan-bobcat", 46.1, "자회사"),
      edge("doosan-e5", "doosan-corp", "doosan-fuelcell", 18.1, "주요지분")
    ],
    keyIssues: ["원전 수주와 자회사 가치", "로보틱스 지분가치", "밥캣 재편 가능성"],
    investmentRoadmap: [
      {
        id: "doosan-roadmap-nuclear",
        title: "원전·SMR·터빈",
        theme: "전력·원전",
        stage: "핵심 사업",
        leadingCompanies: ["두산에너빌리티"],
        listedTickers: ["034020"],
        rationale: "원전·SMR 정책과 터빈 수주가 그룹 내 핵심 사업가치로 연결됩니다.",
        watchPoints: ["원전 수주", "SMR 인허가", "가스터빈"]
      },
      {
        id: "doosan-roadmap-robotics",
        title: "협동로봇·자동화",
        theme: "로봇",
        stage: "성장 투자",
        leadingCompanies: ["두산로보틱스"],
        listedTickers: ["454910"],
        rationale: "로봇 자회사 가치가 두산 지주회사 프리미엄에 영향을 줍니다.",
        watchPoints: ["매출 성장", "해외 채널", "흑자 전환"]
      },
      {
        id: "doosan-roadmap-equipment",
        title: "건설장비·수소",
        theme: "기계·수소",
        stage: "관찰",
        leadingCompanies: ["두산밥캣", "두산퓨얼셀"],
        listedTickers: ["241560", "336260"],
        rationale: "건설장비 현금흐름과 수소 정책 모멘텀이 그룹 재무 안정성에 영향을 줍니다.",
        watchPoints: ["북미 장비 수요", "수소 발전 정책", "지분 재편"]
      }
    ],
    watchSignals: ["두산에너빌리티·두산 동조화", "로봇주 수급", "SMR 정책 이벤트"]
  },
  {
    id: "ls",
    name: "LS그룹",
    shortName: "LS",
    description: "LS 지주회사와 전선·전력기기·소재 계열이 전력망 사이클에 연결됩니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "전력망·해저케이블 수주와 자회사 상장 이벤트 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("ls-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("ls-corp", "LS", "HOLDING", "지주회사", 32, 50, { ticker: "006260", market: "KOSPI" }),
      node("ls-electric", "LS ELECTRIC", "OPERATING", "전력기기·자동화", 58, 28, { ticker: "010120", market: "KOSPI" }),
      node("ls-cable", "LS전선", "UNLISTED", "전선·해저케이블", 58, 54, { listed: false, market: "비상장" }),
      node("ls-mnm", "LS MnM", "UNLISTED", "동제련·소재", 58, 78, { listed: false, market: "비상장" }),
      node("ls-materials", "LS머트리얼즈", "OPERATING", "전력저장·소재", 82, 54, { ticker: "417200", market: "KOSDAQ" })
    ],
    edges: [
      edge("ls-e1", "ls-owner", "ls-corp", 32.0, "지배"),
      edge("ls-e2", "ls-corp", "ls-electric", 46.0, "자회사"),
      edge("ls-e3", "ls-corp", "ls-cable", 92.0, "자회사"),
      edge("ls-e4", "ls-corp", "ls-mnm", 100.0, "자회사"),
      edge("ls-e5", "ls-cable", "ls-materials", 43.5, "자회사")
    ],
    keyIssues: ["전력망 투자 사이클", "전선 자회사 가치", "구리 가격과 소재 마진"],
    investmentRoadmap: [
      {
        id: "ls-roadmap-grid",
        title: "전력망·전력기기",
        theme: "전력",
        stage: "핵심 사업",
        leadingCompanies: ["LS ELECTRIC", "LS전선"],
        listedTickers: ["010120", "006260"],
        rationale: "데이터센터와 전력망 투자가 전력기기·전선 계열로 이어집니다.",
        watchPoints: ["북미 전력기기 수주", "해저케이블", "전력망 예산"]
      },
      {
        id: "ls-roadmap-copper-material",
        title: "구리·소재 민감도",
        theme: "소재",
        stage: "관찰",
        leadingCompanies: ["LS MnM", "LS머트리얼즈"],
        listedTickers: ["417200"],
        rationale: "구리 가격과 소재 수요가 LS 그룹의 원재료·소재 가치에 연결됩니다.",
        watchPoints: ["구리 가격", "울트라커패시터 수요", "전선 마진"]
      },
      {
        id: "ls-roadmap-sub-holdings",
        title: "비상장 자회사 재평가",
        theme: "지주 복합",
        stage: "성장 투자",
        leadingCompanies: ["LS", "LS전선"],
        listedTickers: ["006260"],
        rationale: "비상장 전선·소재 자회사 가치가 지주 할인 축소의 핵심입니다.",
        watchPoints: ["상장 가능성", "수주잔고", "배당 정책"]
      }
    ],
    watchSignals: ["LS ELECTRIC·LS 동조화", "해저케이블 수주", "구리 가격 변동"]
  },
  {
    id: "cj",
    name: "CJ그룹",
    shortName: "CJ",
    description: "CJ 지주회사에서 식품·물류·콘텐츠 계열 가치가 연결되는 구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "자회사 실적·콘텐츠 흥행·물류 재편 이벤트 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("cj-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("cj-corp", "CJ", "HOLDING", "지주회사", 32, 50, { ticker: "001040", market: "KOSPI" }),
      node("cj-food", "CJ제일제당", "OPERATING", "식품·바이오", 58, 28, { ticker: "097950", market: "KOSPI" }),
      node("cj-enm", "CJ ENM", "OPERATING", "콘텐츠·커머스", 58, 58, { ticker: "035760", market: "KOSDAQ" }),
      node("cj-logistics", "CJ대한통운", "OPERATING", "물류", 82, 28, { ticker: "000120", market: "KOSPI" }),
      node("studio-dragon", "스튜디오드래곤", "OPERATING", "드라마 제작", 82, 58, { ticker: "253450", market: "KOSDAQ" }),
      node("cj-cgv", "CJ CGV", "OPERATING", "극장·콘텐츠 소비", 82, 82, { ticker: "079160", market: "KOSPI" })
    ],
    edges: [
      edge("cj-e1", "cj-owner", "cj-corp", 43.0, "지배"),
      edge("cj-e2", "cj-corp", "cj-food", 44.6, "자회사"),
      edge("cj-e3", "cj-corp", "cj-enm", 40.1, "자회사"),
      edge("cj-e4", "cj-food", "cj-logistics", 40.0, "자회사"),
      edge("cj-e5", "cj-enm", "studio-dragon", 54.8, "자회사"),
      edge("cj-e6", "cj-corp", "cj-cgv", 48.5, "자회사")
    ],
    keyIssues: ["식품·바이오 방어력", "콘텐츠 제작비·흥행", "물류 마진 개선"],
    investmentRoadmap: [
      {
        id: "cj-roadmap-food-bio",
        title: "식품·바이오 방어 성장",
        theme: "소비재·바이오",
        stage: "핵심 사업",
        leadingCompanies: ["CJ제일제당"],
        listedTickers: ["097950"],
        rationale: "식품 브랜드와 바이오 소재 수익성이 CJ 그룹 방어력의 중심입니다.",
        watchPoints: ["글로벌 식품 매출", "바이오 마진", "원재료 가격"]
      },
      {
        id: "cj-roadmap-content",
        title: "콘텐츠 제작·유통",
        theme: "미디어",
        stage: "회수·재편",
        leadingCompanies: ["CJ ENM", "스튜디오드래곤", "CJ CGV"],
        listedTickers: ["035760", "253450", "079160"],
        rationale: "콘텐츠 흥행과 비용 구조 개선이 미디어 계열 재평가의 조건입니다.",
        watchPoints: ["제작비", "흥행작", "극장 회복"]
      },
      {
        id: "cj-roadmap-logistics",
        title: "물류 자동화·마진 개선",
        theme: "물류",
        stage: "성장 투자",
        leadingCompanies: ["CJ대한통운"],
        listedTickers: ["000120"],
        rationale: "택배·계약물류 자동화와 운임 구조가 반복 현금흐름을 만듭니다.",
        watchPoints: ["운임", "자동화 투자", "글로벌 물류"]
      }
    ],
    watchSignals: ["CJ제일제당과 CJ 지주 할인", "콘텐츠 흥행과 ENM·스튜디오드래곤", "CGV 재무구조"]
  },
  {
    id: "posco",
    name: "포스코그룹",
    shortName: "포스코",
    description: "POSCO홀딩스를 정점으로 철강, 2차전지 소재, 무역·에너지, 스마트팩토리 계열이 연결되는 구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 보고서와 타법인출자·지분 처분 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("posco-owner", "국민연금·주요주주", "OWNER", "분산 지분형 지배력 기준점", 10, 50, { listed: false }),
      node("posco-holdings", "POSCO홀딩스", "HOLDING", "철강·소재 지주회사", 32, 50, { ticker: "005490", market: "KOSPI" }),
      node("posco-steel", "POSCO", "UNLISTED", "철강 핵심 사업회사", 55, 24, { listed: false, market: "비상장" }),
      node("posco-futurem", "포스코퓨처엠", "OPERATING", "양극재·음극재 소재", 58, 42, { ticker: "003670", market: "KOSPI" }),
      node("posco-intl", "포스코인터내셔널", "OPERATING", "무역·가스·식량·에너지", 58, 62, { ticker: "047050", market: "KOSPI" }),
      node("posco-dx", "포스코DX", "OPERATING", "스마트팩토리·산업 자동화", 82, 42, { ticker: "022100", market: "KOSPI" }),
      node("posco-steeleon", "포스코스틸리온", "OPERATING", "컬러강판·표면처리", 82, 62, { ticker: "058430", market: "KOSPI" }),
      node("posco-mtech", "포스코엠텍", "AFFILIATE", "철강 포장·소재 보조축", 82, 82, { ticker: "009520", market: "KOSDAQ" })
    ],
    edges: [
      edge("posco-e1", "posco-owner", "posco-holdings", 9.0, "주요지분", "분산 지분 구조라 특정 오너 지배가 아닌 주요주주 변동을 함께 봅니다."),
      edge("posco-e2", "posco-holdings", "posco-steel", 100.0, "자회사"),
      edge("posco-e3", "posco-holdings", "posco-futurem", 59.7, "자회사", "2차전지 소재 가치가 지주 평가와 직접 연결되는 축입니다."),
      edge("posco-e4", "posco-holdings", "posco-intl", 70.7, "자회사"),
      edge("posco-e5", "posco-holdings", "posco-dx", 66.2, "자회사"),
      edge("posco-e6", "posco-holdings", "posco-steeleon", 56.9, "자회사"),
      edge("posco-e7", "posco-holdings", "posco-mtech", 48.9, "주요지분")
    ],
    keyIssues: ["2차전지 소재 업황", "철강 스프레드", "에너지·가스 가격", "지주 할인"],
    investmentRoadmap: [
      {
        id: "posco-roadmap-battery-material",
        title: "2차전지 소재 수직계열화",
        theme: "2차전지",
        stage: "성장 투자",
        leadingCompanies: ["포스코퓨처엠", "POSCO홀딩스"],
        listedTickers: ["003670", "005490"],
        rationale: "양극재·음극재와 리튬·니켈 투자 성과가 지주와 소재 계열 재평가의 핵심입니다.",
        watchPoints: ["양극재 수주", "리튬 가격", "고객사 재고", "소재 마진"]
      }
    ],
    watchSignals: ["포스코퓨처엠과 POSCO홀딩스 동조화", "철강 가격 반등", "리튬 가격과 소재주 수급"]
  },
  {
    id: "lotte",
    name: "롯데그룹",
    shortName: "롯데",
    description: "롯데지주를 중심으로 화학, 유통, 식품, 렌탈, 정밀화학 계열이 연결되는 소비·소재 복합 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "화학·유통 계열 재편, 자회사 지분 처분, 유상증자 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("lotte-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("lotte-holdings", "롯데지주", "HOLDING", "지주회사", 32, 50, { ticker: "004990", market: "KOSPI" }),
      node("lotte-chemical", "롯데케미칼", "OPERATING", "석유화학·첨단소재", 58, 24, { ticker: "011170", market: "KOSPI" }),
      node("lotte-shopping", "롯데쇼핑", "OPERATING", "백화점·마트·커머스", 58, 44, { ticker: "023530", market: "KOSPI" }),
      node("lotte-chilsung", "롯데칠성", "OPERATING", "음료·주류", 58, 64, { ticker: "005300", market: "KOSPI" }),
      node("lotte-wellfood", "롯데웰푸드", "OPERATING", "식품·빙과", 82, 64, { ticker: "280360", market: "KOSPI" }),
      node("lotte-fine", "롯데정밀화학", "OPERATING", "정밀화학·소재", 82, 24, { ticker: "004000", market: "KOSPI" }),
      node("lotte-rental", "롯데렌탈", "OPERATING", "렌탈·모빌리티", 82, 44, { ticker: "089860", market: "KOSPI" })
    ],
    edges: [
      edge("lotte-e1", "lotte-owner", "lotte-holdings", 43.0, "지배"),
      edge("lotte-e2", "lotte-holdings", "lotte-chemical", 25.6, "주요지분"),
      edge("lotte-e3", "lotte-holdings", "lotte-shopping", 40.0, "자회사"),
      edge("lotte-e4", "lotte-holdings", "lotte-chilsung", 45.0, "자회사"),
      edge("lotte-e5", "lotte-holdings", "lotte-wellfood", 48.0, "자회사"),
      edge("lotte-e6", "lotte-chemical", "lotte-fine", 43.5, "자회사"),
      edge("lotte-e7", "lotte-holdings", "lotte-rental", 37.8, "주요지분")
    ],
    keyIssues: ["석유화학 다운사이클", "유통 구조조정", "식품 방어력", "지주 할인"],
    investmentRoadmap: [
      {
        id: "lotte-roadmap-chemical",
        title: "화학·소재 구조조정",
        theme: "화학·소재",
        stage: "회수·재편",
        leadingCompanies: ["롯데케미칼", "롯데정밀화학"],
        listedTickers: ["011170", "004000"],
        rationale: "스프레드 회복과 비핵심 자산 재편 여부가 그룹 재평가의 선행 조건입니다.",
        watchPoints: ["에틸렌 스프레드", "차입금", "자산 매각", "첨단소재 수요"]
      }
    ],
    watchSignals: ["롯데케미칼 신용도", "롯데지주와 주요 자회사 동조화", "유통 계열 구조조정"]
  },
  {
    id: "gs",
    name: "GS그룹",
    shortName: "GS",
    description: "GS 지주회사 아래 에너지, 정유, 유통, 무역, 건설 계열이 연결되는 에너지·소비 복합 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "정유 마진, 에너지 전환 투자, 건설 리스크 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("gs-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("gs-holdings", "GS", "HOLDING", "지주회사", 32, 50, { ticker: "078930", market: "KOSPI" }),
      node("gs-energy", "GS에너지", "UNLISTED", "에너지 중간 지주", 56, 24, { listed: false, market: "비상장" }),
      node("gs-caltex", "GS칼텍스", "UNLISTED", "정유·화학", 82, 24, { listed: false, market: "비상장" }),
      node("gs-retail", "GS리테일", "OPERATING", "편의점·커머스", 58, 50, { ticker: "007070", market: "KOSPI" }),
      node("gs-global", "GS글로벌", "OPERATING", "무역·자원", 58, 74, { ticker: "001250", market: "KOSPI" }),
      node("gs-construction", "GS건설", "AFFILIATE", "건설·주택", 82, 74, { ticker: "006360", market: "KOSPI" })
    ],
    edges: [
      edge("gs-e1", "gs-owner", "gs-holdings", 50.0, "지배"),
      edge("gs-e2", "gs-holdings", "gs-energy", 100.0, "자회사"),
      edge("gs-e3", "gs-energy", "gs-caltex", 50.0, "자회사"),
      edge("gs-e4", "gs-holdings", "gs-retail", 57.9, "자회사"),
      edge("gs-e5", "gs-holdings", "gs-global", 50.7, "자회사"),
      edge("gs-e6", "gs-owner", "gs-construction", 30.0, "주요지분", "건설 계열은 지주 직접 연결보다 특수관계 지분과 그룹 센티먼트로 함께 관찰합니다.")
    ],
    keyIssues: ["정제마진", "전력·에너지 전환 투자", "유통 마진", "건설 PF 리스크"],
    investmentRoadmap: [
      {
        id: "gs-roadmap-energy",
        title: "정유·에너지 현금흐름",
        theme: "에너지",
        stage: "핵심 사업",
        leadingCompanies: ["GS", "GS칼텍스", "GS에너지"],
        listedTickers: ["078930"],
        rationale: "정제마진과 에너지 전환 투자가 지주 배당 여력과 할인율에 연결됩니다.",
        watchPoints: ["정제마진", "유가", "배당", "친환경 투자"]
      }
    ],
    watchSignals: ["GS와 정제마진 동조화", "GS리테일 비용 구조", "GS건설 리스크 전이 여부"]
  },
  {
    id: "kakao",
    name: "카카오그룹",
    shortName: "카카오",
    description: "카카오 플랫폼을 중심으로 금융, 게임, 엔터, 모빌리티 계열 가치가 연결되는 플랫폼 지배구조입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "플랫폼 규제, 자회사 상장·지분 매각, 전략투자 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("kakao-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("kakao", "카카오", "HOLDING", "플랫폼 지주 성격 핵심사", 32, 50, { ticker: "035720", market: "KOSPI" }),
      node("kakao-bank", "카카오뱅크", "FINANCE", "인터넷은행", 58, 22, { ticker: "323410", market: "KOSPI" }),
      node("kakao-pay", "카카오페이", "FINANCE", "간편결제·금융 플랫폼", 58, 44, { ticker: "377300", market: "KOSPI" }),
      node("kakao-games", "카카오게임즈", "OPERATING", "게임·퍼블리싱", 58, 66, { ticker: "293490", market: "KOSDAQ" }),
      node("sm-ent", "에스엠", "STRATEGIC", "K팝·엔터 전략지분", 82, 44, { ticker: "041510", market: "KOSDAQ" }),
      node("kakao-mobility", "카카오모빌리티", "UNLISTED", "모빌리티 플랫폼", 82, 66, { listed: false, market: "비상장" })
    ],
    edges: [
      edge("kakao-e1", "kakao-owner", "kakao", 24.0, "지배"),
      edge("kakao-e2", "kakao", "kakao-bank", 27.2, "주요지분"),
      edge("kakao-e3", "kakao", "kakao-pay", 46.0, "자회사"),
      edge("kakao-e4", "kakao", "kakao-games", 41.0, "자회사"),
      edge("kakao-e5", "kakao", "sm-ent", 39.9, "전략지분", "엔터 콘텐츠와 플랫폼 시너지를 보기 위한 전략투자 축입니다."),
      edge("kakao-e6", "kakao", "kakao-mobility", 57.0, "자회사")
    ],
    keyIssues: ["플랫폼 규제", "자회사 할인", "금융 계열 성장성", "엔터 전략투자 회수"],
    investmentRoadmap: [
      {
        id: "kakao-roadmap-platform-finance",
        title: "플랫폼·금융 자회사 재평가",
        theme: "인터넷·금융",
        stage: "회수·재편",
        leadingCompanies: ["카카오", "카카오뱅크", "카카오페이"],
        listedTickers: ["035720", "323410", "377300"],
        rationale: "광고·커머스 회복과 금융 자회사 성장률이 플랫폼 할인율을 낮출 수 있는지 봅니다.",
        watchPoints: ["규제", "MAU", "수수료 수익", "자회사 지분가치"]
      }
    ],
    watchSignals: ["카카오와 금융 자회사 동조화", "플랫폼 규제 완화", "에스엠 지분가치 변동"]
  },
  {
    id: "ecopro",
    name: "에코프로그룹",
    shortName: "에코프로",
    description: "에코프로를 중심으로 양극재, 전구체, 환경 계열이 연결되는 2차전지 소재 성장 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "소재 수주, 고객사 재고, 지분 매각·증자 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("ecopro-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 50, { listed: false }),
      node("ecopro-holdings", "에코프로", "HOLDING", "2차전지 소재 지주 성격 핵심사", 32, 50, { ticker: "086520", market: "KOSDAQ" }),
      node("ecopro-bm", "에코프로비엠", "OPERATING", "하이니켈 양극재", 58, 30, { ticker: "247540", market: "KOSDAQ" }),
      node("ecopro-materials", "에코프로머티", "OPERATING", "전구체", 58, 54, { ticker: "450080", market: "KOSPI" }),
      node("ecopro-hn", "에코프로에이치엔", "OPERATING", "환경·케미칼", 58, 78, { ticker: "383310", market: "KOSDAQ" }),
      node("ecopro-cn", "에코프로씨엔지", "UNLISTED", "배터리 리사이클링", 82, 54, { listed: false, market: "비상장" })
    ],
    edges: [
      edge("ecopro-e1", "ecopro-owner", "ecopro-holdings", 20.0, "지배"),
      edge("ecopro-e2", "ecopro-holdings", "ecopro-bm", 45.6, "자회사"),
      edge("ecopro-e3", "ecopro-holdings", "ecopro-materials", 31.1, "주요지분"),
      edge("ecopro-e4", "ecopro-holdings", "ecopro-hn", 31.4, "주요지분"),
      edge("ecopro-e5", "ecopro-holdings", "ecopro-cn", 47.0, "전략지분")
    ],
    keyIssues: ["양극재 판가", "전구체 내재화", "고객사 재고", "고밸류 선반영"],
    investmentRoadmap: [
      {
        id: "ecopro-roadmap-cathode",
        title: "양극재·전구체 수직계열화",
        theme: "2차전지",
        stage: "성장 투자",
        leadingCompanies: ["에코프로비엠", "에코프로머티", "에코프로"],
        listedTickers: ["247540", "450080", "086520"],
        rationale: "전방 전기차 수요 회복과 소재 판가 안정이 그룹 전체 투자심리의 핵심입니다.",
        watchPoints: ["양극재 수주", "전구체 가동률", "리튬 가격", "고객사 재고"]
      }
    ],
    watchSignals: ["에코프로비엠과 에코프로 동조화", "리튬 가격 반등", "전구체 가동률 개선"]
  },
  {
    id: "naver",
    name: "네이버그룹",
    shortName: "네이버",
    description: "NAVER를 중심으로 검색·커머스, 클라우드, 핀테크, 웹툰·콘텐츠 자회사가 연결되는 플랫폼 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "비상장 자회사 투자유치, 웹툰·클라우드 실적, 전략투자 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("naver-owner", "국민연금·주요주주", "OWNER", "분산 지분형 주요주주 기준점", 10, 50, { listed: false }),
      node("naver-corp", "NAVER", "HOLDING", "검색·커머스·플랫폼 핵심사", 32, 50, { ticker: "035420", market: "KOSPI" }),
      node("naver-cloud", "네이버클라우드", "UNLISTED", "AI·클라우드·데이터센터", 58, 28, { listed: false, market: "비상장" }),
      node("naver-financial", "네이버파이낸셜", "UNLISTED", "페이·금융 플랫폼", 58, 50, { listed: false, market: "비상장" }),
      node("webtoon", "WEBTOON Entertainment", "STRATEGIC", "웹툰·글로벌 콘텐츠", 58, 72, { listed: false, market: "기타" }),
      node("snow", "SNOW", "UNLISTED", "카메라·AI 콘텐츠", 82, 72, { listed: false, market: "비상장" })
    ],
    edges: [
      edge("naver-e1", "naver-owner", "naver-corp", 9.0, "주요지분", "분산 지분 구조라 주요주주 변동과 자사주 정책을 함께 봅니다."),
      edge("naver-e2", "naver-corp", "naver-cloud", 100.0, "자회사"),
      edge("naver-e3", "naver-corp", "naver-financial", 70.0, "자회사"),
      edge("naver-e4", "naver-corp", "webtoon", 63.0, "자회사"),
      edge("naver-e5", "naver-corp", "snow", 89.0, "자회사")
    ],
    keyIssues: ["광고·커머스 성장률", "AI·클라우드 CAPEX", "웹툰 가치 반영", "핀테크 수익화"],
    investmentRoadmap: [
      {
        id: "naver-roadmap-ai-cloud",
        title: "AI·클라우드 인프라",
        theme: "AI 인프라",
        stage: "성장 투자",
        leadingCompanies: ["NAVER", "네이버클라우드"],
        listedTickers: ["035420"],
        rationale: "검색·커머스 데이터와 클라우드 인프라가 AI 서비스 수익화의 핵심 옵션입니다.",
        watchPoints: ["AI 서비스 매출", "클라우드 수주", "CAPEX", "마진"]
      }
    ],
    watchSignals: ["NAVER 본업 성장률", "AI·클라우드 투자 효과", "웹툰 가치 반영"]
  },
  {
    id: "hyosung",
    name: "효성그룹",
    shortName: "효성",
    description: "효성 지주회사와 중공업·첨단소재·화학·섬유 계열 가치가 전력망, 탄소섬유, 산업소재 흐름과 연결되는 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 보고서와 지주회사 지분 변동, 분할·합병·타법인 출자 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("hyosung-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 48, { listed: false }),
      node("hyosung-holdings", "효성", "HOLDING", "지주회사", 32, 48, { ticker: "004800", market: "KOSPI" }),
      node("hyosung-heavy", "효성중공업", "OPERATING", "전력기기·변압기·ESS", 58, 24, { ticker: "298040", market: "KOSPI" }),
      node("hyosung-advanced", "효성첨단소재", "OPERATING", "타이어코드·탄소섬유", 58, 44, { ticker: "298050", market: "KOSPI" }),
      node("hyosung-tnc", "효성티앤씨", "OPERATING", "스판덱스·섬유", 58, 64, { ticker: "298020", market: "KOSPI" }),
      node("hyosung-chemical", "효성화학", "OPERATING", "PP·화학소재", 58, 84, { ticker: "298000", market: "KOSPI" }),
      node("hyosung-itx", "효성ITX", "AFFILIATE", "컨택센터·IT 서비스", 82, 38, { ticker: "094280", market: "KOSPI" }),
      node("galaxia-moneytree", "갤럭시아머니트리", "AFFILIATE", "핀테크·결제", 82, 62, { ticker: "094480", market: "KOSDAQ" })
    ],
    edges: [
      edge("hyosung-e1", "hyosung-owner", "hyosung-holdings", 55.0, "지배", "특수관계인 보유 지분을 단순화한 기준값입니다. 실제 지분은 최신 공시로 확인해야 합니다."),
      edge("hyosung-e2", "hyosung-holdings", "hyosung-heavy", 33.0, "자회사"),
      edge("hyosung-e3", "hyosung-holdings", "hyosung-advanced", 32.0, "자회사"),
      edge("hyosung-e4", "hyosung-holdings", "hyosung-tnc", 30.0, "자회사"),
      edge("hyosung-e5", "hyosung-holdings", "hyosung-chemical", 21.0, "주요지분"),
      edge("hyosung-e6", "hyosung-holdings", "hyosung-itx", 35.0, "주요지분"),
      edge("hyosung-e7", "hyosung-holdings", "galaxia-moneytree", 20.0, "전략지분")
    ],
    keyIssues: ["전력기기 수주 사이클", "탄소섬유·첨단소재 증설", "화학 업황 부담", "지주회사 할인"],
    investmentRoadmap: [
      {
        id: "hyosung-roadmap-grid",
        title: "전력망·변압기 확장 축",
        theme: "전력기기",
        stage: "성장 투자",
        leadingCompanies: ["효성중공업", "효성"],
        listedTickers: ["298040", "004800"],
        rationale: "데이터센터와 송배전 투자 확대는 변압기·전력기기 계열의 실적 연결성을 높입니다.",
        watchPoints: ["북미 수주", "마진", "증설", "원자재 가격"]
      },
      {
        id: "hyosung-roadmap-materials",
        title: "탄소섬유·첨단소재 축",
        theme: "첨단소재",
        stage: "관찰",
        leadingCompanies: ["효성첨단소재", "효성티앤씨"],
        listedTickers: ["298050", "298020"],
        rationale: "탄소섬유와 산업소재는 장기 성장성은 있으나 업황과 가격 사이클 확인이 필요합니다.",
        watchPoints: ["탄소섬유 수요", "중국 공급", "스판덱스 가격", "재고"]
      }
    ],
    watchSignals: ["효성중공업 수주잔고", "효성첨단소재 탄소섬유 가동률", "화학 계열 재무 부담"]
  },
  {
    id: "lx",
    name: "LX그룹",
    shortName: "LX",
    description: "LX홀딩스를 중심으로 상사, 반도체 설계, 건자재 계열이 연결되는 그룹입니다. 반도체·자원·건설 경기 민감도를 함께 봅니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 보고서, 대량보유 보고서, 계열 편입·제외 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("lx-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 48, { listed: false }),
      node("lx-holdings", "LX홀딩스", "HOLDING", "지주회사", 32, 48, { ticker: "383800", market: "KOSPI" }),
      node("lx-international", "LX인터내셔널", "OPERATING", "상사·자원·물류", 58, 28, { ticker: "001120", market: "KOSPI" }),
      node("lx-semicon", "LX세미콘", "OPERATING", "디스플레이·반도체 설계", 58, 50, { ticker: "108320", market: "KOSPI" }),
      node("lx-hausys", "LX하우시스", "OPERATING", "건자재·인테리어", 58, 72, { ticker: "108670", market: "KOSPI" }),
      node("lx-mma", "LX MMA", "UNLISTED", "화학 소재", 82, 72, { listed: false, market: "비상장" })
    ],
    edges: [
      edge("lx-e1", "lx-owner", "lx-holdings", 45.0, "지배", "특수관계인 보유 지분을 단순화한 기준값입니다."),
      edge("lx-e2", "lx-holdings", "lx-international", 24.7, "주요지분"),
      edge("lx-e3", "lx-holdings", "lx-semicon", 33.1, "자회사"),
      edge("lx-e4", "lx-holdings", "lx-hausys", 33.5, "자회사"),
      edge("lx-e5", "lx-international", "lx-mma", 50.0, "전략지분")
    ],
    keyIssues: ["상사 업황", "디스플레이 DDI 수요", "건자재 경기", "지주 할인"],
    investmentRoadmap: [
      {
        id: "lx-roadmap-semicon",
        title: "디스플레이·반도체 설계 축",
        theme: "반도체",
        stage: "관찰",
        leadingCompanies: ["LX세미콘", "LX홀딩스"],
        listedTickers: ["108320", "383800"],
        rationale: "LX세미콘은 디스플레이 패널 업황과 고객사 투자 사이클에 따라 실적 민감도가 큽니다.",
        watchPoints: ["패널 가동률", "OLED 전환", "DDI 가격", "고객사 재고"]
      },
      {
        id: "lx-roadmap-trading",
        title: "상사·자원 가격 민감 축",
        theme: "에너지·원자재",
        stage: "관찰",
        leadingCompanies: ["LX인터내셔널"],
        listedTickers: ["001120"],
        rationale: "자원 가격과 물류·상사 이익 흐름이 그룹 내 현금창출력의 핵심 변수입니다.",
        watchPoints: ["석탄·원자재 가격", "물류 운임", "배당", "신사업 투자"]
      }
    ],
    watchSignals: ["LX세미콘 수요 회복", "LX인터내셔널 원자재 가격 민감도", "LX하우시스 건자재 경기"]
  },
  {
    id: "db",
    name: "DB그룹",
    shortName: "DB",
    description: "DB Inc.와 보험·반도체 계열이 연결된 그룹입니다. 금융 계열 안정성과 DB하이텍의 반도체 사이클을 함께 봅니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 보고서, 대량보유 보고서, DB하이텍 지분 변동·분할 이슈 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("db-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 48, { listed: false }),
      node("db-inc", "DB Inc.", "HOLDING", "IT서비스·지주 성격", 32, 48, { ticker: "012030", market: "KOSPI" }),
      node("db-insurance", "DB손해보험", "FINANCE", "손해보험 핵심 계열", 58, 28, { ticker: "005830", market: "KOSPI" }),
      node("db-hitek", "DB하이텍", "OPERATING", "파운드리·전력반도체", 58, 50, { ticker: "000990", market: "KOSPI" }),
      node("db-financial", "DB금융투자", "FINANCE", "증권 금융 계열", 58, 72, { ticker: "016610", market: "KOSPI" })
    ],
    edges: [
      edge("db-e1", "db-owner", "db-inc", 43.0, "지배", "특수관계인 보유 지분을 단순화한 기준값입니다."),
      edge("db-e2", "db-inc", "db-hitek", 12.0, "주요지분", "지분율은 낮아 보여도 지배구조 이슈가 반복적으로 부각될 수 있는 축입니다."),
      edge("db-e3", "db-inc", "db-insurance", 20.0, "주요지분"),
      edge("db-e4", "db-inc", "db-financial", 15.0, "전략지분")
    ],
    keyIssues: ["DB하이텍 파운드리 업황", "금융 계열 이익 안정성", "지주회사 할인", "지배구조 개편 가능성"],
    investmentRoadmap: [
      {
        id: "db-roadmap-semiconductor",
        title: "파운드리·전력반도체 축",
        theme: "반도체",
        stage: "관찰",
        leadingCompanies: ["DB하이텍", "DB Inc."],
        listedTickers: ["000990", "012030"],
        rationale: "DB하이텍의 가동률과 전력반도체 수요는 그룹 내 성장 옵션으로 추적할 필요가 있습니다.",
        watchPoints: ["가동률", "PMIC·전력반도체 수요", "분할 이슈", "주주환원"]
      }
    ],
    watchSignals: ["DB하이텍 가동률", "DB손해보험 보험손익", "지배구조 개편 공시"]
  },
  {
    id: "shinsegae",
    name: "신세계그룹",
    shortName: "신세계",
    description: "이마트와 신세계를 축으로 유통, 백화점, 푸드, IT·커머스 가치가 연결되는 소비재·유통 그룹입니다.",
    asOf: "2026-05-31",
    dataQuality: "초기 기준 데이터",
    updateCadence: "분기 보고서, 최대주주·특수관계인 지분 변동, 계열 편입·매각 공시 발생 시 재점검",
    updateTriggers,
    sourceRefs: defaultSources,
    nodes: [
      node("ssg-owner", "오너·특수관계인", "OWNER", "지배력 기준점", 10, 48, { listed: false }),
      node("emart", "이마트", "HOLDING", "대형마트·온라인 커머스 축", 34, 36, { ticker: "139480", market: "KOSPI" }),
      node("shinsegae-corp", "신세계", "HOLDING", "백화점·면세·패션 축", 34, 64, { ticker: "004170", market: "KOSPI" }),
      node("shinsegae-ic", "신세계 I&C", "OPERATING", "유통 IT·클라우드", 62, 28, { ticker: "035510", market: "KOSPI" }),
      node("shinsegae-food", "신세계푸드", "OPERATING", "식품·외식", 62, 48, { ticker: "031440", market: "KOSPI" }),
      node("shinsegae-intl", "신세계인터내셔날", "OPERATING", "패션·뷰티", 62, 68, { ticker: "031430", market: "KOSPI" }),
      node("gwangju-shinsegae", "광주신세계", "AFFILIATE", "지역 백화점", 84, 64, { ticker: "037710", market: "KOSPI" })
    ],
    edges: [
      edge("ssg-e1", "ssg-owner", "emart", 28.0, "지배", "특수관계인 보유 지분을 단순화한 기준값입니다."),
      edge("ssg-e2", "ssg-owner", "shinsegae-corp", 28.0, "지배", "백화점 축과 이마트 축은 별도 흐름으로 보는 것이 유리합니다."),
      edge("ssg-e3", "emart", "shinsegae-food", 46.0, "자회사"),
      edge("ssg-e4", "emart", "shinsegae-ic", 35.0, "주요지분"),
      edge("ssg-e5", "shinsegae-corp", "shinsegae-intl", 38.0, "주요지분"),
      edge("ssg-e6", "shinsegae-corp", "gwangju-shinsegae", 10.0, "전략지분")
    ],
    keyIssues: ["소비 경기", "온라인 커머스 손익", "면세·백화점 회복", "자산 매각·재무구조"],
    investmentRoadmap: [
      {
        id: "ssg-roadmap-retail",
        title: "오프라인 유통 회복 축",
        theme: "소비·유통",
        stage: "관찰",
        leadingCompanies: ["이마트", "신세계"],
        listedTickers: ["139480", "004170"],
        rationale: "소비 회복과 비용 구조 개선이 확인될 때 유통 계열의 재평가 가능성이 커집니다.",
        watchPoints: ["기존점 성장률", "온라인 손익", "면세 회복", "자산 매각"]
      },
      {
        id: "ssg-roadmap-food-fashion",
        title: "푸드·패션·뷰티 보조축",
        theme: "소비재",
        stage: "관찰",
        leadingCompanies: ["신세계푸드", "신세계인터내셔날"],
        listedTickers: ["031440", "031430"],
        rationale: "소비재 계열은 본업 회복과 브랜드 포트폴리오 변화가 주가 동력으로 작동합니다.",
        watchPoints: ["마진", "브랜드 리뉴얼", "외식 수요", "재고"]
      }
    ],
    watchSignals: ["이마트 온라인 손익", "신세계 면세·백화점 회복", "소비 지표와 카드 매출"]
  }
];

export const governanceUpdatePolicy = [
  {
    title: "정기 보고서 갱신",
    cadence: "분기·연간",
    description: "사업보고서·분기보고서의 최대주주, 계열회사, 타법인출자 항목을 기준으로 기본 지분율을 갱신합니다."
  },
  {
    title: "대량보유·최대주주 변경",
    cadence: "공시 즉시",
    description: "5%룰, 임원·주요주주, 최대주주 변경 공시가 나오면 정기 보고서 이전이라도 지분 맵을 즉시 보정합니다."
  },
  {
    title: "합병·분할·주식교환",
    cadence: "공시 즉시",
    description: "합병, 분할, 공개매수, 주식교환, 현물출자, 유상증자, CB/BW 전환처럼 지분율이 급변하는 이벤트를 별도로 추적합니다."
  },
  {
    title: "타법인 출자·처분",
    cadence: "공시 즉시",
    description: "전략투자, 자회사 지분 매각·취득, 신규 계열 편입 후보가 발생하면 해당 투자 로드맵과 연결 종목을 함께 갱신합니다."
  },
  {
    title: "계열 편입·제외 점검",
    cadence: "월간·수시",
    description: "공정위 기업집단 자료와 계열회사 편입·제외 공시를 대조해 그룹 목록 자체가 누락되지 않도록 점검합니다."
  },
  {
    title: "시세 연동 재정렬",
    cadence: "새로고침",
    description: "노드 색상과 연결 종목 순위는 현재 지연시세 기준 등락률로 매번 다시 정렬합니다."
  },
  {
    title: "그룹 할인 점검",
    cadence: "월간",
    description: "자회사 시가총액 합산 대비 지주회사 가치 괴리와 동조화 정도를 점검합니다."
  }
];
