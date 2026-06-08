import type { Scenario } from "../types/scenario";
import { linkedValueChainsByScenarioId } from "./linkedValueChains";
import { scenarioAdditions, scenarioOverrides } from "./scenarioExtensions";

// 산업 시나리오 구조를 보여주기 위한 기준 데이터입니다.
const baseScenarios: Scenario[] = [
  {
    id: "ai-infra-cycle",
    name: "AI 데이터센터 확장 사이클",
    description:
      "AI 모델 고도화와 추론 사용량 증가는 고성능 반도체, 서버 인프라, 전력·냉각 설비 수요를 동시에 만든다.",
    nodes: [
      {
        id: "ai",
        label: "AI 발전",
        theme: "AI 인프라",
        description: "모델 고도화, 추론 사용량 증가, 기업용 AI 전환",
        x: 18,
        y: 50
      },
      {
        id: "hbm",
        label: "HBM",
        theme: "반도체",
        description: "AI 가속기 성능을 좌우하는 고대역폭 메모리",
        x: 60,
        y: 12
      },
      {
        id: "substrate",
        label: "반도체 기판",
        theme: "AI 인프라",
        description: "FC-BGA, ABF 기판 수요 증가",
        x: 60,
        y: 23
      },
      {
        id: "packaging",
        label: "패키징",
        theme: "반도체",
        description: "2.5D/3D 패키징과 본딩 장비",
        x: 60,
        y: 34
      },
      {
        id: "datacenter",
        label: "데이터센터",
        theme: "데이터센터",
        description: "GPU 클러스터와 AI 서버 수요 확대",
        x: 60,
        y: 45
      },
      {
        id: "power",
        label: "전력",
        theme: "전력",
        description: "변압기, 차단기, 전력 변환기",
        x: 60,
        y: 56
      },
      {
        id: "cooling",
        label: "냉각",
        theme: "냉각",
        description: "액침냉각, CDU, 열관리 솔루션",
        x: 60,
        y: 67
      },
      {
        id: "robot",
        label: "로봇",
        theme: "로봇",
        description: "AI 에이전트의 물리 세계 확장",
        x: 60,
        y: 78
      },
      {
        id: "aerospace",
        label: "우주항공",
        theme: "우주항공",
        description: "위성, 방산, 자율 시스템으로 확산",
        x: 60,
        y: 89
      },
      {
        id: "security",
        label: "보안",
        theme: "보안",
        description: "AI 기반 위협 탐지와 데이터 보안",
        x: 60,
        y: 100
      }
    ],
    edges: [
      { from: "ai", to: "hbm", strength: "강함" },
      { from: "ai", to: "substrate", strength: "강함" },
      { from: "ai", to: "packaging", strength: "강함" },
      { from: "ai", to: "datacenter", strength: "강함" },
      { from: "datacenter", to: "power", strength: "강함" },
      { from: "datacenter", to: "cooling", strength: "강함" },
      { from: "hbm", to: "packaging", strength: "중간" },
      { from: "packaging", to: "substrate", strength: "중간" },
      { from: "ai", to: "robot", strength: "확산" },
      { from: "ai", to: "aerospace", strength: "확산" },
      { from: "ai", to: "security", strength: "확산" }
    ],
    summary: [
      "AI 모델 고도화와 사용량 증가는 고성능 반도체와 인프라 수요를 동시에 만든다.",
      "HBM 수요 증가는 패키징, 기판, 테스트 장비 수요로 이어진다.",
      "데이터센터 확장은 전력, 냉각, 네트워크 인프라 수요를 만든다.",
      "장기적으로 로봇, 보안 영역으로 확산되며 우주항공은 별도 우주경제 확장 사이클에서 세분화한다."
    ],
    coreValueChains: ["HBM", "패키징", "기판", "데이터센터", "전력", "냉각", "로봇/보안"]
  },
  {
    id: "defense-export-cycle",
    name: "방산 수출·재무장 사이클",
    description:
      "지정학 리스크와 NATO·중동·아시아 재무장 수요가 탄약, 지상무기, 항공엔진, 유도무기 밸류체인을 장기 수주 산업으로 만든다.",
    nodes: [
      { id: "defense-root", label: "재무장 수요", theme: "방산", description: "국방예산 확대와 수출 파이프라인", x: 18, y: 50 },
      { id: "missile", label: "유도무기", theme: "방산", description: "방공, 대함, 지대지 미사일 수요", x: 60, y: 18 },
      { id: "ground", label: "지상무기", theme: "방산", description: "전차, 장갑차, 포병 체계", x: 60, y: 34 },
      { id: "aero-engine", label: "항공엔진", theme: "우주항공", description: "항공기·엔진·정비 수요", x: 60, y: 50 },
      { id: "satellite", label: "위성/정찰", theme: "우주항공", description: "감시정찰, 통신, 우주 인프라", x: 60, y: 66 },
      { id: "electronics", label: "방산전자", theme: "보안", description: "레이더, 전자전, 보안 통신", x: 60, y: 82 }
    ],
    edges: [
      { from: "defense-root", to: "missile", strength: "강함" },
      { from: "defense-root", to: "ground", strength: "강함" },
      { from: "defense-root", to: "aero-engine", strength: "중간" },
      { from: "defense-root", to: "satellite", strength: "확산" },
      { from: "defense-root", to: "electronics", strength: "확산" }
    ],
    summary: [
      "국방예산과 수출계약은 단기 매출보다 수주잔고와 생산능력 확인이 중요하다.",
      "유도무기, 항공엔진, 지상무기는 실적 연결성이 높은 핵심 축이다.",
      "우주·위성·전자전은 장기 확산 영역으로 추적한다.",
      "리스크는 정책 지연, 수출 승인, 원가 상승, 납기 이슈다."
    ],
    coreValueChains: ["유도무기", "지상무기", "항공엔진", "방산전자", "위성/정찰", "정비"]
  },
  {
    id: "space-economy-cycle",
    name: "우주경제 확장 사이클",
    description:
      "재사용 발사체, 저궤도 위성망, 관측 데이터, 국방 우주, 달 탐사·상업 물류가 우주산업을 발사체 중심에서 데이터·서비스 산업으로 확장시킨다.",
    nodes: [
      {
        id: "space-root",
        label: "우주경제 확장",
        theme: "우주항공",
        description: "민간 발사, 위성망, 국방 우주, 달 탐사 수요가 동시에 커지는 구조",
        x: 18,
        y: 50
      },
      {
        id: "launch",
        label: "발사체/재사용 로켓",
        theme: "우주항공",
        description: "발사 비용 하락과 발사 빈도 증가가 위성·탐사 수요를 열어준다.",
        x: 60,
        y: 12
      },
      {
        id: "satellite-manufacturing",
        label: "위성 제조/탑재체",
        theme: "우주항공",
        description: "소형위성, SAR/광학 탑재체, 전장품, 열제어 부품",
        x: 60,
        y: 24
      },
      {
        id: "space-components",
        label: "항공우주 부품/소재",
        theme: "기계/장비",
        description: "복합재, 항공엔진, 구조체, 우주용 전자부품",
        x: 60,
        y: 36
      },
      {
        id: "ground-station",
        label: "지상국/안테나",
        theme: "통신",
        description: "위성 관제, TT&C, 안테나, 게이트웨이 인프라",
        x: 60,
        y: 48
      },
      {
        id: "leo-communication",
        label: "저궤도 위성통신",
        theme: "통신",
        description: "LEO 통신망, 해상·항공·오지 연결, 단말기",
        x: 60,
        y: 60
      },
      {
        id: "earth-observation",
        label: "관측 데이터/AI 분석",
        theme: "AI 인프라",
        description: "위성 영상, 기상·농업·국방 데이터, AI 분석 서비스",
        x: 60,
        y: 72
      },
      {
        id: "defense-space",
        label: "국방 우주/정찰",
        theme: "방산",
        description: "정찰위성, 위성항법, 전자전, 미사일 경보",
        x: 60,
        y: 84
      },
      {
        id: "lunar-logistics",
        label: "달/탐사·로버",
        theme: "우주항공",
        description: "상업 달 착륙선, 탐사 로버, 과학 탑재체, 심우주 물류",
        x: 60,
        y: 96
      }
    ],
    edges: [
      { from: "space-root", to: "launch", strength: "강함" },
      { from: "space-root", to: "satellite-manufacturing", strength: "강함" },
      { from: "space-root", to: "space-components", strength: "중간" },
      { from: "satellite-manufacturing", to: "ground-station", strength: "강함" },
      { from: "ground-station", to: "leo-communication", strength: "강함" },
      { from: "satellite-manufacturing", to: "earth-observation", strength: "중간" },
      { from: "space-root", to: "defense-space", strength: "강함" },
      { from: "launch", to: "lunar-logistics", strength: "확산" }
    ],
    summary: [
      "우주산업은 발사체·위성 제조 같은 upstream과 위성통신·관측 데이터 같은 downstream으로 나누어 봐야 한다.",
      "발사 비용 하락과 위성 수 증가가 지상국, 안테나, 관제, 데이터 분석 수요를 함께 만든다.",
      "국방 우주는 정찰위성, 통신, 전자전, 미사일 경보로 방산 밸류체인과 강하게 연결된다.",
      "달 탐사와 상업 착륙 서비스는 아직 초기지만 로버, 탑재체, 항법, 심우주 통신으로 확산 가능성이 있다."
    ],
    coreValueChains: ["발사체", "위성 제조", "탑재체", "지상국/안테나", "위성통신", "관측 데이터", "국방 우주", "달/탐사"]
  },
  {
    id: "bio-platform-cycle",
    name: "바이오 플랫폼·신약 상업화 사이클",
    description:
      "항체, ADC, 비만·대사질환, 위탁생산, 바이오시밀러가 임상 이벤트와 실적 상업화 사이에서 서로 다른 투자 사이클을 만든다.",
    nodes: [
      { id: "bio-root", label: "의료 수요", theme: "바이오", description: "고령화와 신약 플랫폼 확산", x: 18, y: 50 },
      { id: "biosimilar", label: "바이오시밀러", theme: "바이오", description: "특허 만료와 글로벌 판매망", x: 60, y: 18 },
      { id: "cdmo", label: "CDMO", theme: "바이오", description: "위탁생산 CAPA와 품질 인증", x: 60, y: 34 },
      { id: "adc", label: "ADC/항체", theme: "바이오", description: "기술이전과 임상 진전", x: 60, y: 50 },
      { id: "obesity", label: "비만·대사", theme: "바이오", description: "GLP-1과 만성질환 시장", x: 60, y: 66 },
      { id: "medical-device", label: "의료기기", theme: "의료기기", description: "미용·진단·수술기기 수출", x: 60, y: 82 }
    ],
    edges: [
      { from: "bio-root", to: "biosimilar", strength: "강함" },
      { from: "bio-root", to: "cdmo", strength: "강함" },
      { from: "bio-root", to: "adc", strength: "중간" },
      { from: "bio-root", to: "obesity", strength: "확산" },
      { from: "bio-root", to: "medical-device", strength: "중간" }
    ],
    summary: [
      "상업화 기업은 매출과 마진, 플랫폼 기업은 임상·기술이전 이벤트를 구분한다.",
      "CDMO와 바이오시밀러는 CAPA, 가동률, 가격이 실적 연결 핵심이다.",
      "신약 플랫폼은 임상 성공 확률과 자금 조달 리스크를 함께 본다.",
      "의료기기는 수출 데이터와 소모품 반복 매출을 추적한다."
    ],
    coreValueChains: ["바이오시밀러", "CDMO", "ADC/항체", "비만·대사", "의료기기", "유통"]
  },
  {
    id: "shipbuilding-supercycle",
    name: "조선·해양 수주 슈퍼사이클",
    description:
      "LNG선, 친환경 선박, 해양플랜트, 선박엔진 수요가 조선사와 기자재 기업의 수주잔고·마진 개선 사이클로 연결된다.",
    nodes: [
      { id: "ship-root", label: "선박 교체", theme: "조선", description: "노후선 교체와 환경규제", x: 18, y: 50 },
      { id: "lng", label: "LNG선", theme: "조선", description: "LNG 운반선과 고부가 선종", x: 60, y: 20 },
      { id: "engine", label: "선박엔진", theme: "기계/장비", description: "엔진, 추진, 친환경 연료", x: 60, y: 38 },
      { id: "offshore", label: "해양플랜트", theme: "에너지", description: "해양 생산설비 투자", x: 60, y: 56 },
      { id: "materials", label: "후판/소재", theme: "철강/소재", description: "후판 가격과 원가 민감도", x: 60, y: 74 }
    ],
    edges: [
      { from: "ship-root", to: "lng", strength: "강함" },
      { from: "ship-root", to: "engine", strength: "강함" },
      { from: "ship-root", to: "offshore", strength: "중간" },
      { from: "ship-root", to: "materials", strength: "중간" }
    ],
    summary: [
      "조선은 수주잔고, 선가, 원가 반영 시차를 같이 봐야 한다.",
      "엔진과 기자재는 조선사 건조량 증가의 후행 실적 연결 축이다.",
      "LNG선과 친환경 선박은 고부가 선종 믹스를 만든다.",
      "후판 가격 상승은 마진 훼손 리스크로 관리한다."
    ],
    coreValueChains: ["LNG선", "선박엔진", "기자재", "해양플랜트", "후판/소재"]
  },
  {
    id: "energy-grid-cycle",
    name: "전력망·원전·데이터센터 전력 사이클",
    description:
      "전력망 노후화, 데이터센터 전력 수요, 원전 재가동이 변압기·전력기기·케이블·SMR 밸류체인을 동시에 자극한다.",
    nodes: [
      { id: "grid-root", label: "전력 수요", theme: "전력", description: "전력망 교체와 전력 부족", x: 18, y: 50 },
      { id: "transformer", label: "변압기", theme: "전력", description: "초고압 변압기와 북미 수요", x: 60, y: 20 },
      { id: "cable", label: "전선/케이블", theme: "전력", description: "송전망 확장과 해저케이블", x: 60, y: 38 },
      { id: "nuclear", label: "원전/SMR", theme: "원전", description: "원전 재가동과 SMR 투자", x: 60, y: 56 },
      { id: "cooling-grid", label: "냉각/전력관리", theme: "냉각", description: "데이터센터 전력밀도 상승", x: 60, y: 74 }
    ],
    edges: [
      { from: "grid-root", to: "transformer", strength: "강함" },
      { from: "grid-root", to: "cable", strength: "강함" },
      { from: "grid-root", to: "nuclear", strength: "중간" },
      { from: "grid-root", to: "cooling-grid", strength: "확산" }
    ],
    summary: [
      "전력기기는 수주잔고와 가격 협상력이 실적 연결 핵심이다.",
      "데이터센터 전력 수요는 전력·냉각·전력관리 장비를 동시에 밀어 올린다.",
      "원전은 정책과 발주 일정이 큰 변수가 된다.",
      "구리, 철강 등 원자재 비용과 납기 리스크를 관리한다."
    ],
    coreValueChains: ["변압기", "차단기", "전선/케이블", "원전/SMR", "냉각", "전력관리"]
  },
  {
    id: "battery-mobility-cycle",
    name: "2차전지·전기차 밸류체인 재편",
    description:
      "전기차 성장 둔화 이후 배터리 소재, 셀, 장비, 재활용, 전력저장장치가 가격 하락과 재고 조정 뒤의 회복 사이클을 만든다.",
    nodes: [
      { id: "battery-root", label: "전동화", theme: "2차전지", description: "EV와 ESS 수요", x: 18, y: 50 },
      { id: "cell", label: "배터리 셀", theme: "2차전지", description: "셀 업체의 가동률과 고객사 믹스", x: 60, y: 18 },
      { id: "cathode", label: "양극재/소재", theme: "2차전지", description: "리튬 가격과 판가 연동", x: 60, y: 34 },
      { id: "equipment", label: "장비", theme: "기계/장비", description: "증설 재개 시 수주 회복", x: 60, y: 50 },
      { id: "ess", label: "ESS", theme: "전력", description: "전력망 안정화와 저장장치", x: 60, y: 66 },
      { id: "recycle", label: "재활용", theme: "철강/소재", description: "폐배터리와 금속 회수", x: 60, y: 82 }
    ],
    edges: [
      { from: "battery-root", to: "cell", strength: "강함" },
      { from: "battery-root", to: "cathode", strength: "강함" },
      { from: "battery-root", to: "equipment", strength: "중간" },
      { from: "battery-root", to: "ess", strength: "확산" },
      { from: "battery-root", to: "recycle", strength: "확산" }
    ],
    summary: [
      "2차전지는 판가, 재고, 가동률이 실적 민감도를 크게 만든다.",
      "소재주는 리튬 가격과 고객사 출하가 동시에 확인되어야 한다.",
      "ESS와 전력망 수요는 전기차 둔화의 보완 축이다.",
      "증설 지연과 가격 경쟁은 핵심 리스크다."
    ],
    coreValueChains: ["셀", "양극재", "분리막", "장비", "ESS", "재활용"]
  },
  {
    id: "robot-automation-cycle",
    name: "로봇·자동화 생산성 사이클",
    description:
      "인건비 상승과 제조 자동화, 물류 효율화, AI 비전 기술이 산업용 로봇과 부품 밸류체인 수요를 만든다.",
    nodes: [
      { id: "robot-root", label: "자동화 수요", theme: "로봇", description: "제조·물류·서비스 자동화", x: 18, y: 50 },
      { id: "actuator", label: "액츄에이터", theme: "로봇", description: "감속기, 서보모터, 구동부", x: 60, y: 24 },
      { id: "vision", label: "머신비전", theme: "기계/장비", description: "센서, 카메라, 검사 장비", x: 60, y: 42 },
      { id: "factory", label: "스마트팩토리", theme: "기계/장비", description: "공장 자동화와 제어 시스템", x: 60, y: 60 },
      { id: "software", label: "AI 제어", theme: "AI 인프라", description: "로봇 제어 소프트웨어와 추론", x: 60, y: 78 }
    ],
    edges: [
      { from: "robot-root", to: "actuator", strength: "강함" },
      { from: "robot-root", to: "vision", strength: "중간" },
      { from: "robot-root", to: "factory", strength: "강함" },
      { from: "robot-root", to: "software", strength: "확산" }
    ],
    summary: [
      "자동화 투자는 인건비와 품질 개선 압력이 커질 때 탄력이 붙는다.",
      "액츄에이터와 감속기는 로봇 원가와 성능을 좌우하는 핵심 부품이다.",
      "머신비전과 AI 제어는 로봇 적용 범위를 넓힌다.",
      "상용화 속도와 가격 경쟁은 실적 연결성의 핵심 리스크다."
    ],
    coreValueChains: ["액츄에이터", "감속기", "머신비전", "스마트팩토리", "AI 제어"]
  },
  {
    id: "construction-infra-cycle",
    name: "건설·인프라 투자 회복 사이클",
    description:
      "금리 안정, 노후 인프라 교체, 데이터센터·전력망 투자, 주택 공급 정책이 건설과 기자재 수요를 나눠 만든다.",
    nodes: [
      { id: "construction-root", label: "인프라 투자", theme: "건설", description: "공공·민간 인프라 발주", x: 18, y: 50 },
      { id: "housing", label: "주택/토목", theme: "건설", description: "분양, 토목, 플랜트", x: 60, y: 25 },
      { id: "materials-infra", label: "건자재", theme: "철강/소재", description: "시멘트, 철근, 단열재", x: 60, y: 43 },
      { id: "power-infra", label: "전력 인프라", theme: "전력", description: "송배전과 데이터센터 공사", x: 60, y: 61 },
      { id: "machinery-infra", label: "건설기계", theme: "기계/장비", description: "굴착기, 장비, 렌탈", x: 60, y: 79 }
    ],
    edges: [
      { from: "construction-root", to: "housing", strength: "중간" },
      { from: "construction-root", to: "materials-infra", strength: "중간" },
      { from: "construction-root", to: "power-infra", strength: "강함" },
      { from: "construction-root", to: "machinery-infra", strength: "중간" }
    ],
    summary: [
      "건설은 금리와 미분양, 공공 발주가 업황을 좌우한다.",
      "전력망·데이터센터 공사는 전통 건설보다 실적 가시성이 높을 수 있다.",
      "건자재는 원가와 판매가격 전가력이 중요하다.",
      "PF 리스크와 수주 마진은 계속 점검해야 한다."
    ],
    coreValueChains: ["주택/토목", "건자재", "전력 인프라", "건설기계", "플랜트"]
  },
  {
    id: "finance-shareholder-cycle",
    name: "금융·주주환원 리레이팅 사이클",
    description:
      "금리, 대손비용, 배당·자사주 정책, 밸류업 프로그램이 은행·증권·보험의 밸류에이션 재평가를 만든다.",
    nodes: [
      { id: "finance-root", label: "자본 효율", theme: "금융", description: "ROE와 주주환원 정책", x: 18, y: 50 },
      { id: "bank", label: "은행", theme: "금융", description: "순이자마진과 대손비용", x: 60, y: 26 },
      { id: "insurance", label: "보험", theme: "금융", description: "CSM, 손해율, 금리 민감도", x: 60, y: 44 },
      { id: "securities", label: "증권", theme: "금융", description: "거래대금, IB, 운용손익", x: 60, y: 62 },
      { id: "holdings", label: "지주/복합", theme: "지주/복합", description: "배당, 자사주, 지배구조", x: 60, y: 80 }
    ],
    edges: [
      { from: "finance-root", to: "bank", strength: "강함" },
      { from: "finance-root", to: "insurance", strength: "강함" },
      { from: "finance-root", to: "securities", strength: "중간" },
      { from: "finance-root", to: "holdings", strength: "확산" }
    ],
    summary: [
      "금융주는 실적 성장보다 자본 효율과 환원 정책이 밸류에이션을 움직일 수 있다.",
      "은행은 NIM과 대손비용, 보험은 CSM과 손해율을 본다.",
      "증권은 거래대금과 IB 회복이 모멘텀이다.",
      "정책 기대가 선반영되면 배당 지속성이 핵심 검증 포인트다."
    ],
    coreValueChains: ["은행", "보험", "증권", "지주", "배당/자사주"]
  },
  {
    id: "internet-platform-ai-cycle",
    name: "인터넷·플랫폼 AI 서비스 사이클",
    description:
      "검색, 광고, 커머스, 클라우드, 콘텐츠 플랫폼이 AI 기능을 붙이며 수익화와 비용 효율 사이클을 만든다.",
    nodes: [
      { id: "platform-root", label: "플랫폼 수익화", theme: "인터넷/플랫폼", description: "광고·커머스·구독 수익화", x: 18, y: 50 },
      { id: "search-ad", label: "검색/광고", theme: "인터넷/플랫폼", description: "AI 검색과 광고 효율", x: 60, y: 24 },
      { id: "commerce", label: "커머스", theme: "유통", description: "플랫폼 거래액과 물류", x: 60, y: 42 },
      { id: "cloud", label: "클라우드", theme: "AI 인프라", description: "AI 서버와 엔터프라이즈 수요", x: 60, y: 60 },
      { id: "contents", label: "콘텐츠", theme: "미디어", description: "웹툰, 영상, 게임 IP", x: 60, y: 78 }
    ],
    edges: [
      { from: "platform-root", to: "search-ad", strength: "강함" },
      { from: "platform-root", to: "commerce", strength: "중간" },
      { from: "platform-root", to: "cloud", strength: "확산" },
      { from: "platform-root", to: "contents", strength: "중간" }
    ],
    summary: [
      "플랫폼은 트래픽보다 AI 기능의 실제 매출 전환이 중요하다.",
      "클라우드와 광고 효율은 실적 연결성이 높은 검증 지표다.",
      "커머스와 콘텐츠는 소비 경기와 마진 구조를 같이 본다.",
      "AI 투자비가 매출보다 빠르게 늘면 밸류 부담이 커진다."
    ],
    coreValueChains: ["검색/광고", "커머스", "클라우드", "콘텐츠", "구독"]
  },
  {
    id: "energy-commodity-cycle",
    name: "에너지·원자재 공급망 사이클",
    description:
      "유가, LNG, 전력 수요, 광물 가격, 친환경 전환이 에너지·화학·철강 소재의 가격과 마진 사이클을 만든다.",
    nodes: [
      { id: "energy-root", label: "공급망 가격", theme: "에너지", description: "유가, 가스, 광물 가격", x: 18, y: 50 },
      { id: "oil-gas", label: "정유/가스", theme: "에너지", description: "정제마진과 LNG 수요", x: 60, y: 24 },
      { id: "chem", label: "화학", theme: "화학", description: "스프레드와 수요 회복", x: 60, y: 42 },
      { id: "steel", label: "철강/비철", theme: "철강/소재", description: "중국 수요와 금속 가격", x: 60, y: 60 },
      { id: "green", label: "친환경 전환", theme: "전력", description: "전력망, ESS, 탄소 비용", x: 60, y: 78 }
    ],
    edges: [
      { from: "energy-root", to: "oil-gas", strength: "강함" },
      { from: "energy-root", to: "chem", strength: "중간" },
      { from: "energy-root", to: "steel", strength: "중간" },
      { from: "energy-root", to: "green", strength: "확산" }
    ],
    summary: [
      "에너지와 소재는 가격 사이클과 재고 사이클이 실적을 크게 흔든다.",
      "정유는 정제마진, 화학은 제품 스프레드가 핵심이다.",
      "철강·비철은 중국 수요와 환율, 원재료 가격을 같이 본다.",
      "친환경 전환은 전력망과 ESS 수요로 확산된다."
    ],
    coreValueChains: ["정유/가스", "화학", "철강/비철", "전력망", "ESS"]
  }
];

const scenarioDisplayOrder = [
  "ai-infra-cycle",
  "ai-software-llm-cycle",
  "physical-ai-robotics-cycle",
  "on-device-ai-edge-cycle",
  "ai-security-data-cycle",
  "semiconductor-supply-chain-cycle",
  "defense-export-cycle",
  "space-economy-cycle",
  "bio-platform-cycle",
  "shipbuilding-supercycle",
  "energy-grid-cycle",
  "battery-mobility-cycle",
  "auto-sdv-mobility-cycle",
  "robot-automation-cycle",
  "construction-infra-cycle",
  "finance-shareholder-cycle",
  "internet-platform-ai-cycle",
  "consumer-kculture-cycle",
  "energy-commodity-cycle"
];

const scenarioById = new Map<string, Scenario>();

[...baseScenarios, ...scenarioAdditions, ...scenarioOverrides].forEach((scenario) => {
  scenarioById.set(scenario.id, scenario);
});

const assembledScenarios: Scenario[] = [
  ...scenarioDisplayOrder.flatMap((scenarioId) => {
    const scenario = scenarioById.get(scenarioId);
    if (!scenario) return [];
    scenarioById.delete(scenarioId);
    return [scenario];
  }),
  ...Array.from(scenarioById.values())
];

export const scenarios: Scenario[] = assembledScenarios.map((scenario) => ({
  ...scenario,
  linkedValueChains: linkedValueChainsByScenarioId[scenario.id] ?? []
}));

export const activeScenario = scenarios[0];
