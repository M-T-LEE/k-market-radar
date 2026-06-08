import type { ValueChain } from "../types/scenario";
import { valueChainAdditions, valueChainOverrides } from "./valueChainExtensions";

// 산업 내 핵심 기업성과 실적 연결성 시각화를 위한 기준 데이터입니다.
const currentTrendSourceRefs = [
  { label: "SK hynix HBM", url: "https://news.skhynix.com/" },
  { label: "TSMC Advanced Packaging", url: "https://www.tsmc.com/english/dedicatedFoundry/technology/logic/advanced-packaging" },
  { label: "Vertiv AI Data Center", url: "https://www.vertiv.com/en-us/solutions/ai/" },
  { label: "Rocket Lab Space Systems", url: "https://www.rocketlabusa.com/space-systems/" },
  { label: "Planet Labs Earth Data", url: "https://www.planet.com/" },
  { label: "LG Energy Solution ESS", url: "https://www.lgensol.com/" },
  { label: "Samsung Biologics CDMO", url: "https://samsungbiologics.com/" }
];

const baseValueChains: ValueChain[] = [
  {
    id: "hbm",
    scenarioId: "ai-infra-cycle",
    name: "HBM",
    coreTechnology: "HBM3E·HBM4, TSV, 베이스 다이, 고대역폭 메모리",
    representativeCompanies: ["SK하이닉스", "삼성전자", "Micron"],
    centralityScore: 95,
    earningsLinkLevel: "높음",
    comment: "AI 가속기 성능의 핵심. 수요 강도 최상위.",
    selectedCompany: "SK하이닉스",
    reason: [
      "엔비디아 HBM3E 공급 레퍼런스로 시장 지배력 확보",
      "ASP 프리미엄과 믹스 개선이 실적에 직접 연결",
      "HBM4 전환에서도 선행 투자와 고객 검증 경험 보유"
    ],
    risks: ["고객사 집중도", "삼성전자·마이크론 추격", "메모리 가격 변동성"]
  },
  {
    id: "substrate",
    scenarioId: "ai-infra-cycle",
    name: "반도체 기판",
    coreTechnology: "FC-BGA, ABF 기판, 고다층 MLB, AI 서버용 고속 기판",
    representativeCompanies: ["삼성전기", "Ibiden", "Unimicron", "Shinko Electric", "이수페타시스", "대덕전자"],
    centralityScore: 88,
    earningsLinkLevel: "높음",
    comment: "고성능 AI 서버용 기판 수요 증가.",
    selectedCompany: "삼성전기",
    reason: [
      "고부가 FC-BGA 생산능력과 품질 관리 역량",
      "AI 서버와 네트워크 장비용 기판 수요 동시 노출",
      "전장 MLCC와 기판 사업의 포트폴리오 균형"
    ],
    risks: ["고객사 투자 속도", "기판 증설 경쟁", "원재료 가격"]
  },
  {
    id: "packaging",
    scenarioId: "ai-infra-cycle",
    name: "패키징",
    coreTechnology: "2.5D/3D 패키징, CoWoS, SoIC, 하이브리드 본딩, TC 본더",
    representativeCompanies: ["TSMC", "ASE Technology", "Amkor", "한미반도체", "리노공업"],
    centralityScore: 87,
    earningsLinkLevel: "높음",
    comment: "첨단 패키징 수율과 생산능력 확대의 핵심 영역.",
    selectedCompany: "한미반도체",
    reason: [
      "HBM TC 본딩 장비의 핵심 공급망",
      "패키징 CAPA 확대가 장비 수주로 연결",
      "고마진 장비 믹스가 실적 레버리지로 작동"
    ],
    risks: ["수주 인식 지연", "고객사 CAPA 조정", "주가 선반영 부담"]
  },
  {
    id: "ai-networking-optics",
    scenarioId: "ai-infra-cycle",
    name: "AI 네트워크·광통신",
    coreTechnology: "800G/1.6T 스위치, DSP, 광트랜시버, CPO, 고다층 네트워크 PCB",
    representativeCompanies: ["Broadcom", "Arista Networks", "Coherent", "Lumentum", "이수페타시스", "오이솔루션"],
    centralityScore: 86,
    earningsLinkLevel: "높음",
    comment: "GPU 클러스터가 커질수록 병목이 연산에서 네트워크와 광모듈로 확산되는 영역.",
    selectedCompany: "Arista Networks",
    reason: [
      "AI 데이터센터 내 이더넷 스위칭과 네트워크 운영 수요에 직접 노출",
      "광트랜시버·고속 PCB·ASIC 공급망까지 수요가 파급",
      "GPU 서버 증설이 클러스터 네트워크 투자로 이어지는 구조"
    ],
    risks: ["CSP 투자 속도", "고객사 집중도", "광모듈 가격 경쟁"]
  },
  {
    id: "power",
    scenarioId: "ai-infra-cycle",
    name: "전력기기",
    coreTechnology: "초고압 변압기, 차단기, UPS, 전력 변환기, 배전 자동화",
    representativeCompanies: ["HD현대일렉트릭", "효성중공업", "LS ELECTRIC", "Eaton", "Schneider Electric"],
    centralityScore: 86,
    earningsLinkLevel: "높음",
    comment: "데이터센터 전력 인프라 확장의 직접 수혜.",
    selectedCompany: "HD현대일렉트릭",
    reason: [
      "북미 전력망 교체와 데이터센터 투자 동시 수혜",
      "변압기 공급 부족으로 가격 협상력 유지",
      "수주잔고와 마진 개선이 실적 가시성을 높임"
    ],
    risks: ["원자재 가격", "북미 정책 변화", "고점 수주 이후 마진 정상화"]
  },
  {
    id: "cooling",
    scenarioId: "ai-infra-cycle",
    name: "냉각",
    coreTechnology: "액침냉각, Direct-to-Chip, CDU, 열관리, 전력·냉각 통합 모듈",
    representativeCompanies: ["Vertiv", "Schneider Electric", "Eaton", "Trane Technologies", "케이엔솔"],
    centralityScore: 82,
    earningsLinkLevel: "중간",
    comment: "서버 전력 밀도 상승에 따른 구조적 수요.",
    selectedCompany: "Vertiv",
    reason: [
      "데이터센터 열관리와 전력 인프라를 동시에 공급",
      "AI 서버 랙 전력 밀도 상승이 고효율 냉각 수요로 연결",
      "글로벌 CSP 고객 기반과 서비스 네트워크 보유"
    ],
    risks: ["밸류에이션 부담", "CAPEX 사이클 둔화", "제품 표준 변화"]
  },
  {
    id: "ai-server-rack-infra",
    scenarioId: "ai-infra-cycle",
    name: "AI 서버·랙 인프라",
    coreTechnology: "AI 서버, GPU 랙, 전력분배장치, 서버 ODM, 고밀도 랙 통합",
    representativeCompanies: ["Super Micro Computer", "Dell Technologies", "Quanta Computer", "Foxconn", "Vertiv"],
    centralityScore: 84,
    earningsLinkLevel: "높음",
    comment: "GPU 수요가 실제 데이터센터 구축으로 전환되는 구간에서 서버·랙 통합 기업이 병목 역할을 한다.",
    selectedCompany: "Super Micro Computer",
    reason: [
      "AI 서버와 랙 단위 인프라 수요에 직접 노출",
      "전력·냉각·네트워크를 묶은 고밀도 서버 구성이 중요해짐",
      "CSP와 엔터프라이즈 AI 투자 흐름을 빠르게 반영"
    ],
    risks: ["마진 변동성", "재고와 납기 관리", "고객사 발주 조정"]
  },
  {
    id: "robot-actuator",
    scenarioId: "ai-infra-cycle",
    name: "로봇 액츄에이터",
    coreTechnology: "액츄에이터, 정밀 감속기, 서보모터, 로봇 관절 모듈",
    representativeCompanies: ["Harmonic Drive", "Nabtesco", "에스피지", "로보티즈", "하이젠알앤엠"],
    centralityScore: 75,
    earningsLinkLevel: "중간",
    comment: "로봇 상용화의 핵심 부품 후보.",
    selectedCompany: "에스피지",
    reason: [
      "정밀 감속기와 모터 기술 기반의 부품 노출",
      "휴머노이드 확산 시 핵심 부품 수요 증가 가능",
      "기존 산업용 모터 매출로 기본 체력 보유"
    ],
    risks: ["상용화 시점 불확실성", "중국 부품 경쟁", "실적 연결 지연"]
  },
  {
    id: "defense-missile",
    scenarioId: "defense-export-cycle",
    name: "유도무기",
    coreTechnology: "대공·대함 미사일, 탐색기, 추진체, 레이더·전자전",
    representativeCompanies: ["LIG넥스원", "한화에어로스페이스", "한화시스템", "현대로템", "RTX"],
    centralityScore: 88,
    earningsLinkLevel: "높음",
    comment: "방산 수출계약의 실적 연결성이 높은 핵심 축.",
    selectedCompany: "LIG넥스원",
    reason: [
      "유도무기와 방공 체계 레퍼런스 보유",
      "수출 수주가 장기 매출 인식으로 연결",
      "전자전·레이더 영역으로 확장 가능"
    ],
    risks: ["수출 승인 지연", "납기와 원가 관리", "국방 예산 변동"]
  },
  {
    id: "defense-aerospace",
    scenarioId: "defense-export-cycle",
    name: "항공엔진·우주",
    coreTechnology: "항공엔진, 방산 MRO, 위성체, 항공전자, 우주부품",
    representativeCompanies: ["한화에어로스페이스", "한국항공우주", "쎄트렉아이", "GE Aerospace", "Safran"],
    centralityScore: 84,
    earningsLinkLevel: "중간",
    comment: "방산과 우주항공이 결합되는 장기 확산 영역.",
    selectedCompany: "한화에어로스페이스",
    reason: [
      "항공엔진과 방산 포트폴리오 동시 보유",
      "수주잔고 확대가 실적 안정성으로 연결",
      "우주·위성 투자 확산에 노출"
    ],
    risks: ["대형 프로젝트 일정", "원가 상승", "환율 변동"]
  },
  {
    id: "space-launch",
    scenarioId: "space-economy-cycle",
    name: "발사체·추진체",
    coreTechnology: "재사용 로켓, 액체엔진, 고체추진체, 발사 서비스, 발사체 밸브·터보펌프",
    representativeCompanies: ["SpaceX", "Rocket Lab", "한화에어로스페이스", "한국항공우주", "Firefly Aerospace"],
    centralityScore: 90,
    earningsLinkLevel: "중간",
    comment: "발사 단가 하락과 발사 빈도 증가가 우주경제의 병목을 여는 핵심 인프라.",
    selectedCompany: "한화에어로스페이스",
    reason: [
      "발사체 엔진과 추진체, 방산 추진기관 기술의 인접성이 높음",
      "국가 우주개발과 민간 발사 서비스 확대에 동시에 노출",
      "위성 제조·국방 우주 수요와 밸류체인 연동성이 큼"
    ],
    risks: ["정부 프로젝트 일정 지연", "재사용 로켓 경쟁 심화", "개발비와 품질 인증 부담"]
  },
  {
    id: "space-satellite-manufacturing",
    scenarioId: "space-economy-cycle",
    name: "위성 제조·탑재체",
    coreTechnology: "소형위성, SAR·광학 탑재체, 우주용 전장품, 열제어, 우주용 반도체",
    representativeCompanies: ["쎄트렉아이", "AP위성", "컨텍", "Planet Labs", "MDA Space", "Redwire"],
    centralityScore: 86,
    earningsLinkLevel: "중간",
    comment: "위성 수량 증가의 직접 수혜 영역. 제조 역량과 탑재체 레퍼런스가 중요.",
    selectedCompany: "쎄트렉아이",
    reason: [
      "소형위성 시스템과 지상체 분야의 국내 레퍼런스 보유",
      "관측·국방·통신 위성 확산 시 반복 수주 가능성",
      "탑재체 성능과 납기 관리가 실적 연결의 핵심"
    ],
    risks: ["프로젝트성 매출 변동", "해외 선도사와의 기술 격차", "부품 조달과 인증 리스크"]
  },
  {
    id: "space-ground-station",
    scenarioId: "space-economy-cycle",
    name: "지상국·안테나",
    coreTechnology: "TT&C, 위성 관제, 위상배열 안테나, 게이트웨이, 해상·항공 단말",
    representativeCompanies: ["인텔리안테크", "컨텍", "Iridium", "AST SpaceMobile", "SES"],
    centralityScore: 84,
    earningsLinkLevel: "중간",
    comment: "위성이 많아질수록 관제, 데이터 수신, 이동체 연결 인프라 수요가 커지는 영역.",
    selectedCompany: "인텔리안테크",
    reason: [
      "해상·항공 위성통신 안테나 레퍼런스 보유",
      "저궤도 위성망 확장 시 단말과 게이트웨이 수요가 동행",
      "서비스 사업자와 장비 공급망의 연결성이 높음"
    ],
    risks: ["LEO 사업자 투자 속도", "안테나 가격 경쟁", "고객사 인증 일정"]
  },
  {
    id: "space-observation-data",
    scenarioId: "space-economy-cycle",
    name: "관측 데이터·AI 분석",
    coreTechnology: "위성 영상, SAR 데이터, 지리정보, AI 분석 서비스, 방재·보험·농업 데이터",
    representativeCompanies: ["Planet Labs", "BlackSky", "Maxar Intelligence", "쎄트렉아이", "루미르", "Palantir"],
    centralityScore: 78,
    earningsLinkLevel: "중간",
    comment: "우주산업이 하드웨어에서 데이터 서비스로 확장되는 중장기 수익화 축.",
    selectedCompany: "Planet Labs",
    reason: [
      "반복 관측 데이터와 구독형 분석 서비스 모델에 노출",
      "농업, 국방, 기후, 보험, 물류 등 활용처가 넓음",
      "AI 분석 고도화 시 원천 데이터 가치가 재평가될 수 있음"
    ],
    risks: ["데이터 수익화 지연", "정부 고객 의존도", "고정비 부담과 경쟁 심화"]
  },
  {
    id: "space-defense",
    scenarioId: "space-economy-cycle",
    name: "국방 우주·정찰",
    coreTechnology: "정찰위성, 위성항법, 전자전, 미사일 경보, 보안 통신",
    representativeCompanies: ["LIG넥스원", "한화시스템", "Northrop Grumman", "Lockheed Martin", "RTX"],
    centralityScore: 88,
    earningsLinkLevel: "높음",
    comment: "우주 인프라가 국방 감시정찰과 통신 체계로 연결되는 고중요도 영역.",
    selectedCompany: "LIG넥스원",
    reason: [
      "유도무기, 레이더, 통신 체계와 우주 정찰 수요의 연결성이 높음",
      "국방 예산과 장기 프로젝트 기반의 실적 가시성",
      "위성·지상체·전자전으로 확장 가능한 포트폴리오"
    ],
    risks: ["국방 예산 편성", "보안 인증과 납기", "수출 승인 리스크"]
  },
  {
    id: "space-lunar-logistics",
    scenarioId: "space-economy-cycle",
    name: "달 탐사·상업 착륙",
    coreTechnology: "달 착륙선, 탐사 로버, 심우주 통신, 과학 탑재체",
    representativeCompanies: ["Intuitive Machines", "Astrobotic", "한국항공우주", "한화에어로스페이스"],
    centralityScore: 70,
    earningsLinkLevel: "낮음",
    comment: "성장성은 크지만 아직 실적 연결성이 낮아 기술 이벤트와 자금 조달을 함께 봐야 하는 초기 영역.",
    selectedCompany: "Intuitive Machines",
    reason: [
      "상업 달 착륙 서비스의 선도 레퍼런스 확보 여부가 중요",
      "NASA와 민간 우주탐사 프로젝트의 예산 흐름에 노출",
      "탑재체, 로버, 통신 장비로 파생 밸류체인이 생길 수 있음"
    ],
    risks: ["미션 실패 리스크", "자금 조달 희석", "상업화 시점 불확실성"]
  },
  {
    id: "bio-cdmo",
    scenarioId: "bio-platform-cycle",
    name: "CDMO",
    coreTechnology: "항체의약품 위탁생산, ADC 생산, 대규모 배양, 품질 인증",
    representativeCompanies: ["삼성바이오로직스", "Lonza", "Thermo Fisher", "WuXi Biologics", "Fujifilm Diosynth"],
    centralityScore: 90,
    earningsLinkLevel: "높음",
    comment: "바이오 의약품 생산 CAPA와 가동률이 실적을 좌우.",
    selectedCompany: "삼성바이오로직스",
    reason: [
      "대규모 생산능력과 글로벌 고객 기반",
      "장기계약이 매출 가시성을 높임",
      "품질 인증과 트랙레코드가 진입장벽"
    ],
    risks: ["가동률 둔화", "고객사 임상 실패", "CAPA 경쟁"]
  },
  {
    id: "bio-biosimilar",
    scenarioId: "bio-platform-cycle",
    name: "바이오시밀러",
    coreTechnology: "항체 바이오시밀러, 자가면역·항암 포트폴리오, 글로벌 판매망, 약가 전략",
    representativeCompanies: ["셀트리온", "삼성바이오에피스", "Amgen", "Sandoz", "Biocon Biologics"],
    centralityScore: 84,
    earningsLinkLevel: "높음",
    comment: "특허 만료와 제품 포트폴리오 확장이 핵심.",
    selectedCompany: "셀트리온",
    reason: [
      "제품 라인업과 글로벌 판매망 보유",
      "신규 품목 출시가 매출 성장에 직접 연결",
      "원가와 약가 전략이 마진을 결정"
    ],
    risks: ["가격 경쟁", "규제 승인 지연", "재고 조정"]
  },
  {
    id: "bio-adc-platform",
    scenarioId: "bio-platform-cycle",
    name: "ADC·항체 플랫폼",
    coreTechnology: "항체-약물접합체, 링커·페이로드, 이중항체, 기술이전",
    representativeCompanies: ["알테오젠", "리가켐바이오", "오름테라퓨틱", "Daiichi Sankyo", "AstraZeneca"],
    centralityScore: 82,
    earningsLinkLevel: "중간",
    comment: "ADC와 항체 플랫폼은 기술이전·임상 이벤트가 시장 반응을 크게 만드는 신약 플랫폼 영역.",
    selectedCompany: "리가켐바이오",
    reason: [
      "ADC 링커·페이로드 플랫폼 노출로 글로벌 파트너십 이벤트가 중요",
      "플랫폼 기술이전은 단기 현금 유입과 장기 로열티 옵션을 동시에 만든다",
      "임상 데이터 공개가 밸류에이션의 핵심 검증 포인트"
    ],
    risks: ["임상 실패", "기술이전 계약 지연", "자금 조달 리스크"]
  },
  {
    id: "bio-obesity-metabolic",
    scenarioId: "bio-platform-cycle",
    name: "비만·대사질환",
    coreTechnology: "GLP-1, GIP/GLP-1, 경구형 비만치료제, CMO·펩타이드 생산",
    representativeCompanies: ["Eli Lilly", "Novo Nordisk", "한미약품", "동아에스티", "삼천당제약"],
    centralityScore: 79,
    earningsLinkLevel: "중간",
    comment: "비만·대사질환은 글로벌 수요가 강하지만 생산능력, 약가, 임상 데이터 확인이 필요.",
    selectedCompany: "Eli Lilly",
    reason: [
      "GLP-1 계열 수요가 의약품 생산능력과 공급망 투자로 확산",
      "국내 기업은 파이프라인·제형·위탁생산 노출 여부를 구분해야 함",
      "임상 단계와 상업화 기업의 실적 연결성을 분리해 평가"
    ],
    risks: ["약가 인하", "생산 CAPA 병목", "임상 단계 기업의 희석 리스크"]
  },
  {
    id: "ship-lng",
    scenarioId: "shipbuilding-supercycle",
    name: "LNG선·친환경 선박",
    coreTechnology: "LNG 운반선, 암모니아·메탄올 추진, FLNG, 고부가 선종",
    representativeCompanies: ["HD한국조선해양", "한화오션", "삼성중공업", "GTT"],
    centralityScore: 87,
    earningsLinkLevel: "높음",
    comment: "선가와 수주잔고가 마진 개선의 선행 지표.",
    selectedCompany: "HD한국조선해양",
    reason: [
      "고부가 선종 수주 경쟁력",
      "수주잔고가 향후 매출 가시성을 높임",
      "친환경 선박 전환 수요에 노출"
    ],
    risks: ["후판 가격", "인력 부족", "인도 지연"]
  },
  {
    id: "ship-engine",
    scenarioId: "shipbuilding-supercycle",
    name: "선박엔진·기자재",
    coreTechnology: "선박엔진, 이중연료 추진시스템, 밸브·펌프 기자재, 보냉재",
    representativeCompanies: ["HD현대마린엔진", "한화엔진", "동성화인텍", "한국카본"],
    centralityScore: 80,
    earningsLinkLevel: "중간",
    comment: "조선사 건조량 증가의 후행 수혜 밸류체인.",
    selectedCompany: "한화엔진",
    reason: [
      "선박 발주 증가가 엔진 수요로 연결",
      "친환경 연료 전환에 따른 제품 믹스 개선",
      "기자재 공급망 병목 시 가격 협상력 상승"
    ],
    risks: ["원가 상승", "조선 발주 둔화", "납기 리스크"]
  },
  {
    id: "ship-lng-containment",
    scenarioId: "shipbuilding-supercycle",
    name: "LNG 보냉·화물창",
    coreTechnology: "멤브레인 화물창, 보냉재, LNG 저장·운송 기자재",
    representativeCompanies: ["GTT", "동성화인텍", "한국카본", "HD현대마린솔루션"],
    centralityScore: 79,
    earningsLinkLevel: "중간",
    comment: "LNG선 발주가 이어질 때 화물창·보냉재·서비스 기업으로 후행 수요가 확산된다.",
    selectedCompany: "동성화인텍",
    reason: [
      "LNG선 건조량 증가가 보냉재와 화물창 기자재 수요로 연결",
      "친환경 연료 전환에서 LNG 저장·운송 인프라가 병목이 될 수 있음",
      "조선사 인도 스케줄과 기자재 납품 타이밍을 함께 봐야 함"
    ],
    risks: ["LNG선 발주 둔화", "조선사 납기 지연", "원재료 가격"]
  },
  {
    id: "grid-transformer",
    scenarioId: "energy-grid-cycle",
    name: "변압기·전력기기",
    coreTechnology: "초고압 변압기, 차단기, 전력 변환기",
    representativeCompanies: ["HD현대일렉트릭", "효성중공업", "LS ELECTRIC", "Eaton", "Schneider Electric"],
    centralityScore: 89,
    earningsLinkLevel: "높음",
    comment: "전력망 교체와 데이터센터 전력 수요의 직접 수혜.",
    selectedCompany: "HD현대일렉트릭",
    reason: [
      "북미 전력망 투자와 데이터센터 수요에 노출",
      "수주잔고와 ASP가 실적 가시성을 높임",
      "공급 부족 구간에서 가격 협상력 보유"
    ],
    risks: ["구리 가격", "납기 지연", "고점 수주 이후 마진 정상화"]
  },
  {
    id: "grid-cable-hvdc",
    scenarioId: "energy-grid-cycle",
    name: "전선·HVDC",
    coreTechnology: "초고압 케이블, 해저케이블, HVDC, 전력망 연결",
    representativeCompanies: ["LS전선", "대한전선", "Prysmian", "Nexans", "가온전선"],
    centralityScore: 84,
    earningsLinkLevel: "높음",
    comment: "재생에너지·데이터센터·전력망 교체가 송전 케이블과 해저케이블 수요를 만든다.",
    selectedCompany: "대한전선",
    reason: [
      "전력망 확장과 초고압 케이블 수요에 직접 노출",
      "해저케이블·HVDC는 발주 단가와 진입장벽이 높은 영역",
      "수주잔고와 생산능력 증설이 실적 가시성의 핵심"
    ],
    risks: ["구리 가격", "프로젝트 지연", "증설 투자 부담"]
  },
  {
    id: "nuclear-smr",
    scenarioId: "energy-grid-cycle",
    name: "원전·SMR",
    coreTechnology: "원전 주기기, 터빈, SMR 모듈",
    representativeCompanies: ["두산에너빌리티", "한전기술", "비에이치아이"],
    centralityScore: 78,
    earningsLinkLevel: "중간",
    comment: "정책과 발주 일정 확인이 필요한 장기 밸류체인.",
    selectedCompany: "두산에너빌리티",
    reason: [
      "원전 주기기와 터빈 기술 노출",
      "SMR과 해외 원전 발주 기대",
      "전력 부족 이슈와 정책 모멘텀"
    ],
    risks: ["정책 지연", "수주 인식까지 긴 시간", "재무 안정성"]
  },
  {
    id: "battery-cell-material",
    scenarioId: "battery-mobility-cycle",
    name: "배터리 셀·소재",
    coreTechnology: "배터리 셀, LFP·NCM, 양극재, 음극재, 전해액",
    representativeCompanies: ["LG에너지솔루션", "삼성SDI", "CATL", "BYD", "Panasonic", "에코프로비엠", "포스코퓨처엠"],
    centralityScore: 82,
    earningsLinkLevel: "중간",
    comment: "판가와 가동률 회복이 확인되어야 실적 연결성이 높아짐.",
    selectedCompany: "LG에너지솔루션",
    reason: [
      "글로벌 완성차 고객 기반",
      "ESS와 전기차 수요 동시 노출",
      "소재 가격 안정 시 마진 회복 가능"
    ],
    risks: ["리튬 가격", "재고 조정", "전기차 수요 둔화"]
  },
  {
    id: "battery-equipment",
    scenarioId: "battery-mobility-cycle",
    name: "2차전지 장비·ESS",
    coreTechnology: "전극공정 장비, 조립공정 장비, ESS 랙·컨테이너, 배터리 팩",
    representativeCompanies: ["피엔티", "윤성에프앤씨", "서진시스템", "LG에너지솔루션", "Fluence"],
    centralityScore: 74,
    earningsLinkLevel: "중간",
    comment: "증설 재개 여부와 ESS 수요가 핵심.",
    selectedCompany: "피엔티",
    reason: [
      "배터리 증설 재개 시 장비 수주 회복 가능",
      "ESS 확대가 신규 수요 축으로 작동",
      "수주잔고와 고객사 CAPEX가 선행 지표"
    ],
    risks: ["고객사 투자 지연", "수주 공백", "마진 압박"]
  },
  {
    id: "battery-ess-power",
    scenarioId: "battery-mobility-cycle",
    name: "ESS·전력저장",
    coreTechnology: "계통형 ESS, LFP ESS, PCS, BMS, 배터리 랙·컨테이너",
    representativeCompanies: ["LG에너지솔루션", "삼성SDI", "Fluence", "Tesla", "LS ELECTRIC", "서진시스템"],
    centralityScore: 81,
    earningsLinkLevel: "중간",
    comment: "전력망 안정화와 데이터센터 전력 수요가 ESS를 2차전지 회복의 보완 축으로 만든다.",
    selectedCompany: "LG에너지솔루션",
    reason: [
      "EV 둔화 구간에서도 전력저장 수요가 배터리 가동률을 보완",
      "LFP ESS와 시스템 통합 능력이 수익성 차이를 만든다",
      "전력망 투자와 재생에너지 연계 수요가 중장기 성장 축"
    ],
    risks: ["화재 안전 규제", "가격 경쟁", "프로젝트 매출 인식 지연"]
  },
  {
    id: "robot-actuator-core",
    scenarioId: "robot-automation-cycle",
    name: "액츄에이터·감속기",
    coreTechnology: "정밀 감속기, 서보모터, 액츄에이터 모듈",
    representativeCompanies: ["에스피지", "로보티즈", "하이젠알앤엠"],
    centralityScore: 78,
    earningsLinkLevel: "중간",
    comment: "로봇 원가와 구동 성능을 좌우하는 핵심 부품.",
    selectedCompany: "에스피지",
    reason: ["감속기와 모터 기술 노출", "산업용 자동화 기반 매출 보유", "휴머노이드 확산 시 옵션 가치"],
    risks: ["상용화 지연", "중국 부품 가격 경쟁", "고객사 채택 불확실성"]
  },
  {
    id: "construction-power-infra",
    scenarioId: "construction-infra-cycle",
    name: "전력·데이터센터 인프라 시공",
    coreTechnology: "전력 공사, 플랜트, 데이터센터 설계·시공",
    representativeCompanies: ["현대건설", "삼성물산", "LS ELECTRIC"],
    centralityScore: 76,
    earningsLinkLevel: "중간",
    comment: "일반 주택보다 전력·데이터센터 공사의 수주 질을 우선 확인.",
    selectedCompany: "현대건설",
    reason: ["대형 인프라 수행 경험", "해외 플랜트와 전력 공사 노출", "정책·CAPEX 사이클 수혜 가능"],
    risks: ["PF와 미분양", "원가 상승", "수주 마진 훼손"]
  },
  {
    id: "finance-bank-capital",
    scenarioId: "finance-shareholder-cycle",
    name: "은행·자본환원",
    coreTechnology: "NIM, 대손비용, CET1, 배당·자사주",
    representativeCompanies: ["KB금융", "신한지주", "하나금융지주"],
    centralityScore: 82,
    earningsLinkLevel: "높음",
    comment: "밸류업과 주주환원 리레이팅의 중심 축.",
    selectedCompany: "KB금융",
    reason: ["높은 자본비율과 환원 여력", "은행·비은행 포트폴리오", "저 PBR 리레이팅 민감도"],
    risks: ["대손비용 증가", "금리 하락에 따른 NIM 압박", "정책 기대 선반영"]
  },
  {
    id: "platform-search-cloud",
    scenarioId: "internet-platform-ai-cycle",
    name: "검색·커머스·클라우드 AI",
    coreTechnology: "AI 검색, 광고 최적화, 판매자 도구, 클라우드 인프라",
    representativeCompanies: ["NAVER", "카카오", "카페24", "NHN KCP"],
    centralityScore: 80,
    earningsLinkLevel: "중간",
    comment: "AI 기능이 광고 효율, 쇼핑 전환율, 클라우드·결제 매출로 전환되는지 확인.",
    selectedCompany: "NAVER",
    reason: ["검색·광고 기반 트래픽 보유", "커머스와 콘텐츠 생태계", "AI 서비스 수익화 옵션"],
    risks: ["AI 투자비 증가", "광고 경기 둔화", "플랫폼 규제와 수수료 압박"]
  },
  {
    id: "energy-refining-spread",
    scenarioId: "energy-commodity-cycle",
    name: "정유·가스 스프레드",
    coreTechnology: "정제마진, LNG 밸류체인, 유가·환율 민감도",
    representativeCompanies: ["S-Oil", "SK이노베이션", "Exxon Mobil"],
    centralityScore: 74,
    earningsLinkLevel: "중간",
    comment: "가격과 재고 사이클이 실적을 빠르게 흔드는 영역.",
    selectedCompany: "S-Oil",
    reason: ["정제마진 민감도", "배당과 업황 회복 노출", "유가·환율 사이클 반영"],
    risks: ["유가 급락", "정제마진 둔화", "재고평가 손실"]
  }
];

const seededValueChains: ValueChain[] = baseValueChains.map((chain) => ({
  dataUpdatedAt: "2026-05-31",
  reviewCadence: chain.reviewCadence ?? "주간",
  updateTriggers: chain.updateTriggers ?? [
    "대표 기업의 대형 수주·공급계약",
    "분기 실적 또는 가이던스 변화",
    "정책·규제·보조금 변화",
    "관련 종목군의 5거래일 이상 시장 반응 변화"
  ],
  sourceRefs: chain.sourceRefs ?? currentTrendSourceRefs,
  ...chain
}));

const valueChainOverrideMap = new Map(
  valueChainOverrides
    .filter((chain): chain is Partial<ValueChain> & Pick<ValueChain, "id"> => Boolean(chain.id))
    .map((chain) => [chain.id, chain])
);

export const valueChains: ValueChain[] = [...seededValueChains, ...valueChainAdditions].map((chain) => {
  const override = valueChainOverrideMap.get(chain.id) ?? {};

  return {
    dataUpdatedAt: "2026-06-02",
    reviewCadence: chain.reviewCadence ?? "주간",
    updateTriggers: chain.updateTriggers ?? [
      "대표 기업의 대형 수주·공급계약",
      "분기 실적 또는 가이던스 변화",
      "정책·규제·보조금 변화",
      "관련 종목군의 5거래일 이상 시장 반응 변화"
    ],
    sourceRefs: chain.sourceRefs ?? currentTrendSourceRefs,
    ...chain,
    ...override
  };
});
