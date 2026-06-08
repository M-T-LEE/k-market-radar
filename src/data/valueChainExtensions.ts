import type { ValueChain } from "../types/scenario";

// 주간 갱신 대상으로 분리한 확장 밸류체인입니다.
// 특정 산업을 AI 예시 하나로 묶지 않고, 시장에서 구분해 보는 세부 수요축별로 나눕니다.
export const valueChainOverrides: Partial<ValueChain>[] = [
  {
    id: "robot-actuator",
    scenarioId: "physical-ai-robotics-cycle"
  }
];

export const valueChainAdditions: ValueChain[] = [
  {
    id: "llm-model-platform",
    scenarioId: "ai-software-llm-cycle",
    name: "LLM 모델·검색",
    coreTechnology: "초거대 언어모델, AI 검색, 광고·커머스 추천, 한국어 데이터",
    representativeCompanies: ["NAVER", "솔트룩스", "코난테크놀로지", "마음AI", "폴라리스AI"],
    centralityScore: 82,
    earningsLinkLevel: "중간",
    comment: "AI 소프트웨어는 모델 성능보다 검색·광고·커머스 매출 전환 여부가 핵심입니다.",
    selectedCompany: "NAVER",
    reason: [
      "검색·광고·커머스 트래픽을 보유해 AI 기능을 기존 매출원에 붙일 수 있음",
      "한국어 데이터와 클라우드 인프라가 서비스 경쟁력의 기반",
      "기업용 AI와 검색 경험 개선이 실적 연결성을 높이는 축"
    ],
    risks: ["GPU 투자비 부담", "글로벌 모델 경쟁", "AI 기능의 유료 전환 지연"]
  },
  {
    id: "ai-agent-workflow",
    scenarioId: "ai-software-llm-cycle",
    name: "AI 에이전트·업무자동화",
    coreTechnology: "업무 자동화, 문서 AI, 고객 상담, 에이전트 오케스트레이션",
    representativeCompanies: ["더존비즈온", "한글과컴퓨터", "이스트소프트", "브리지텍", "셀바스AI"],
    centralityScore: 74,
    earningsLinkLevel: "중간",
    comment: "기업 현장의 업무 단위 생산성 개선으로 이어질 때 반복 매출 전환이 가능합니다.",
    selectedCompany: "더존비즈온",
    reason: [
      "ERP·그룹웨어 고객 기반에 AI 기능을 결합할 수 있음",
      "문서·회계·세무 업무 자동화는 명확한 비용 절감 수요가 있음",
      "구독형 소프트웨어 매출로 연결될 경우 실적 가시성이 개선"
    ],
    risks: ["AI 기능 차별화 부족", "도입 속도 지연", "중소형 AI주의 수급 과열"]
  },
  {
    id: "enterprise-ai-saas",
    scenarioId: "ai-software-llm-cycle",
    name: "기업용 AI SaaS",
    coreTechnology: "AI CRM, ERP, 협업툴, 보안·운영 자동화, 클라우드 구독",
    representativeCompanies: ["더존비즈온", "삼성에스디에스", "포스코DX", "현대오토에버", "가비아"],
    centralityScore: 70,
    earningsLinkLevel: "중간",
    comment: "기업용 AI는 파일럿이 실제 구독 매출로 전환되는지 확인해야 합니다.",
    selectedCompany: "더존비즈온",
    reason: [
      "기존 고객 계정에 AI 모듈을 추가 판매할 수 있는 구조",
      "업무 데이터와 권한 관리가 결합될수록 락인 효과가 커짐",
      "구독 매출 비중 상승 시 밸류에이션 정당화가 쉬워짐"
    ],
    risks: ["도입 예산 축소", "보안·개인정보 규제", "무료 AI 도구와의 경쟁"]
  },
  {
    id: "data-rag-platform",
    scenarioId: "ai-software-llm-cycle",
    name: "데이터·RAG 플랫폼",
    coreTechnology: "벡터DB, 데이터 레이크, 검색증강생성, 데이터 거버넌스",
    representativeCompanies: ["솔트룩스", "코난테크놀로지", "와이즈넛", "데이타솔루션", "모아데이타"],
    centralityScore: 73,
    earningsLinkLevel: "중간",
    comment: "기업 AI의 정확도와 보안은 내부 데이터 연결과 검색 품질에서 갈립니다.",
    selectedCompany: "솔트룩스",
    reason: [
      "기업용 지식검색과 데이터 구축 경험을 AI 수요로 연결 가능",
      "RAG는 모델 자체보다 현장 데이터 품질이 성패를 좌우",
      "공공·금융·대기업 프로젝트 수주가 실적 확인 포인트"
    ],
    risks: ["프로젝트성 매출 변동", "대형 플랫폼과 경쟁", "데이터 품질 문제"]
  },
  {
    id: "ai-search-commerce",
    scenarioId: "ai-software-llm-cycle",
    name: "AI 검색·커머스",
    coreTechnology: "AI 추천, 판매자 도구, 쇼핑 검색, 광고 최적화, 결제 전환",
    representativeCompanies: ["카페24", "커넥트웨이브", "NAVER", "카카오", "NHN KCP", "KG이니시스"],
    centralityScore: 76,
    earningsLinkLevel: "중간",
    comment: "AI가 쇼핑 전환율, 광고 효율, 판매자 운영 자동화로 이어지는지가 핵심입니다.",
    selectedCompany: "카페24",
    reason: [
      "온라인 판매자 기반에 AI 추천·마케팅 자동화 기능을 붙일 수 있음",
      "커머스 플랫폼, 결제, 쇼핑 검색은 서로 다른 수혜축으로 분리해서 봐야 함",
      "광고 효율보다 쇼핑 전환율과 판매자 도구 매출 전환이 실적 확인 포인트"
    ],
    risks: ["광고 경기 둔화", "AI 검색 비용 증가", "규제와 수수료 압박"]
  },
  {
    id: "physical-ai-humanoid",
    scenarioId: "physical-ai-robotics-cycle",
    name: "휴머노이드·피지컬 AI",
    coreTechnology: "휴머노이드 로봇, 로봇 제어 AI, 센서 융합, 임베디드 AI",
    representativeCompanies: ["레인보우로보틱스", "두산로보틱스", "로보티즈", "현대차", "현대모비스"],
    centralityScore: 69,
    earningsLinkLevel: "낮음",
    comment: "직접 로봇 플랫폼 기업과 보스턴다이내믹스 전략 노출 기업을 분리해서 봅니다. 현대로템은 방산·철도 수주 축으로 분리합니다.",
    selectedCompany: "레인보우로보틱스",
    reason: [
      "레인보우로보틱스·두산로보틱스·로보티즈는 휴머노이드·협동로봇·구동부 직접 노출",
      "현대차·현대모비스는 보스턴다이내믹스와 그룹 내 자동화 적용 옵션으로 전략 노출",
      "피지컬 AI 확산 시 플랫폼, 구동부, 그룹 내 적용 레퍼런스를 따로 확인해야 함"
    ],
    risks: ["상용화 지연", "전략 지분 노출과 직접 매출의 괴리", "실적 대비 밸류 부담", "글로벌 경쟁 심화"]
  },
  {
    id: "machine-vision-sensor",
    scenarioId: "physical-ai-robotics-cycle",
    name: "머신비전·센서",
    coreTechnology: "산업용 카메라, 3D 센서, 검사장비, 비전 AI",
    representativeCompanies: ["고영", "뷰웍스", "라온피플", "옵트론텍"],
    centralityScore: 66,
    earningsLinkLevel: "중간",
    comment: "로봇과 자동화가 확산될수록 인식·검사·센서가 후행 수혜로 연결됩니다.",
    selectedCompany: "고영",
    reason: [
      "검사장비와 3D 측정 기술이 스마트팩토리 수요와 연결",
      "비전 AI는 로봇 자동화의 눈 역할을 담당",
      "고객사의 CAPEX 회복이 실적 반등의 선행 조건"
    ],
    risks: ["전방 투자 둔화", "중국 장비 경쟁", "수주 변동성"]
  },
  {
    id: "edge-npu-ip",
    scenarioId: "on-device-ai-edge-cycle",
    name: "온디바이스 NPU·IP",
    coreTechnology: "NPU IP, SoC 설계, AI 반도체 설계 서비스, 저전력 추론",
    representativeCompanies: ["가온칩스", "칩스앤미디어", "텔레칩스", "제주반도체"],
    centralityScore: 72,
    earningsLinkLevel: "중간",
    comment: "AI가 서버에서 단말로 내려올 때 저전력 추론 칩과 IP 수요가 생깁니다.",
    selectedCompany: "가온칩스",
    reason: [
      "시스템반도체 설계 서비스와 IP 생태계에 노출",
      "AI PC·AI폰·전장용 NPU 확산에 따른 설계 수요 기대",
      "양산 전환 여부가 실적 연결성의 핵심"
    ],
    risks: ["양산 지연", "고객사 프로젝트 취소", "선단 공정 비용 부담"]
  },
  {
    id: "ai-pc-mobile-device",
    scenarioId: "on-device-ai-edge-cycle",
    name: "AI PC·모바일 부품",
    coreTechnology: "카메라모듈, 전장·모바일 센서, 저전력 메모리, 열관리",
    representativeCompanies: ["LG이노텍", "삼성전기", "제주반도체", "비에이치"],
    centralityScore: 68,
    earningsLinkLevel: "중간",
    comment: "AI 단말 교체 사이클이 확인될 때 부품 믹스 개선으로 연결됩니다.",
    selectedCompany: "LG이노텍",
    reason: [
      "고부가 카메라와 센서 부품이 AI 단말 경험을 보완",
      "모바일·전장 고객 기반이 넓어 수요 회복에 민감",
      "AI 기능이 고사양 부품 채택률을 높일 수 있음"
    ],
    risks: ["스마트폰 수요 둔화", "고객사 집중도", "가격 인하 압박"]
  },
  {
    id: "ai-security-platform",
    scenarioId: "ai-security-data-cycle",
    name: "AI 보안·제로트러스트",
    coreTechnology: "제로트러스트, EDR/XDR, 클라우드 보안, AI 위협 탐지",
    representativeCompanies: ["안랩", "라온시큐어", "지니언스", "SK쉴더스"],
    centralityScore: 75,
    earningsLinkLevel: "중간",
    comment: "AI 도입이 늘수록 계정·데이터·클라우드 보안 수요가 함께 증가합니다.",
    selectedCompany: "안랩",
    reason: [
      "기업·공공 보안 레퍼런스를 보유",
      "제로트러스트와 클라우드 보안 예산 확대에 노출",
      "AI 위협 탐지와 운영 자동화가 신규 수요 축"
    ],
    risks: ["공공 예산 지연", "글로벌 보안 업체 경쟁", "프로젝트성 매출 변동"]
  },
  {
    id: "data-governance-observability",
    scenarioId: "ai-security-data-cycle",
    name: "데이터 거버넌스·옵저버빌리티",
    coreTechnology: "데이터 품질, 개인정보 보호, AI 로그·모니터링, 규제 대응",
    representativeCompanies: ["더존비즈온", "쿠콘", "아이퀘스트", "데이타솔루션"],
    centralityScore: 67,
    earningsLinkLevel: "중간",
    comment: "기업 AI가 확산될수록 데이터 품질과 책임 있는 AI 관리가 비용 항목이 됩니다.",
    selectedCompany: "쿠콘",
    reason: [
      "금융·공공 데이터 연결 수요와 규제 대응에 노출",
      "AI 활용 확대는 데이터 정합성과 권한 관리 수요를 키움",
      "반복형 데이터 서비스 매출 전환 여부가 중요"
    ],
    risks: ["규제 변화", "프로젝트 수익성", "대형 IT서비스와 경쟁"]
  },
  {
    id: "memory-foundry",
    scenarioId: "semiconductor-supply-chain-cycle",
    name: "메모리·파운드리",
    coreTechnology: "DRAM, NAND, 파운드리, 첨단 공정, AI 반도체 생산",
    representativeCompanies: ["삼성전자", "SK하이닉스", "DB하이텍"],
    centralityScore: 83,
    earningsLinkLevel: "높음",
    comment: "반도체 사이클의 핵심 축으로 가격, 가동률, 선단공정 투자를 함께 봐야 합니다.",
    selectedCompany: "삼성전자",
    reason: [
      "메모리와 파운드리 양쪽에 노출된 대형 공급망",
      "AI 서버와 모바일 수요가 동시에 회복될 때 실적 레버리지 발생",
      "HBM 경쟁력 회복 여부가 리레이팅 핵심"
    ],
    risks: ["HBM 경쟁 지연", "파운드리 수익성", "메모리 가격 변동"]
  },
  {
    id: "semicap-equipment",
    scenarioId: "semiconductor-supply-chain-cycle",
    name: "반도체 장비",
    coreTechnology: "전공정 장비, 후공정 장비, 테스트·검사, 고압 어닐링",
    representativeCompanies: ["한미반도체", "HPSP", "주성엔지니어링", "원익IPS", "테스"],
    centralityScore: 77,
    earningsLinkLevel: "중간",
    comment: "고객사 CAPEX와 공정 전환이 장비 수주의 선행 변수입니다.",
    selectedCompany: "HPSP",
    reason: [
      "선단 공정과 장비 국산화 수요에 노출",
      "수주와 인도 타이밍이 실적 변동을 크게 만듦",
      "AI 반도체 증설이 후공정·테스트까지 확산"
    ],
    risks: ["CAPEX 지연", "수주 공백", "고객사 집중도"]
  },
  {
    id: "semicap-materials-parts",
    scenarioId: "semiconductor-supply-chain-cycle",
    name: "소재·부품·특수가스",
    coreTechnology: "포토레지스트, 특수가스, 식각·증착 소재, 쿼츠·세라믹 부품",
    representativeCompanies: ["솔브레인", "동진쎄미켐", "원익머트리얼즈", "티씨케이"],
    centralityScore: 71,
    earningsLinkLevel: "중간",
    comment: "가동률 회복이 소재 사용량 증가로 연결될 때 실적이 움직입니다.",
    selectedCompany: "솔브레인",
    reason: [
      "공정 소재는 웨이퍼 투입량과 직접 연동",
      "국산화와 고객 다변화가 밸류에이션 방어 요인",
      "선단 공정 변화가 신규 소재 수요를 만듦"
    ],
    risks: ["가동률 둔화", "원재료 가격", "고객사 재고 조정"]
  },
  {
    id: "test-socket-probe",
    scenarioId: "semiconductor-supply-chain-cycle",
    name: "테스트 소켓·프로브",
    coreTechnology: "반도체 테스트 소켓, 프로브카드, 검사 핀, 고주파 테스트",
    representativeCompanies: ["리노공업", "ISC", "티에스이", "마이크로컨텍솔"],
    centralityScore: 73,
    earningsLinkLevel: "중간",
    comment: "신제품 출시와 고성능 칩 비중 확대가 테스트 부품 수요를 자극합니다.",
    selectedCompany: "리노공업",
    reason: [
      "고성능 칩 테스트 난도가 높아질수록 소켓 수요가 증가",
      "다품종 소량 대응력과 고객 다변화가 장점",
      "신규 칩 출시 사이클에 실적이 민감"
    ],
    risks: ["고객사 신제품 지연", "가격 경쟁", "재고 조정"]
  },
  {
    id: "sdv-vehicle-software",
    scenarioId: "auto-sdv-mobility-cycle",
    name: "SDV·차량 소프트웨어",
    coreTechnology: "차량 OS, OTA, 자율주행 SW, 인포테인먼트, 클라우드 차량 데이터",
    representativeCompanies: ["현대오토에버", "현대모비스", "HL만도", "팅크웨어"],
    centralityScore: 78,
    earningsLinkLevel: "중간",
    comment: "자동차가 하드웨어 판매에서 소프트웨어 업데이트 모델로 전환되는 축입니다.",
    selectedCompany: "현대오토에버",
    reason: [
      "현대차그룹 SDV 전환의 핵심 IT 계열사",
      "차량 소프트웨어와 클라우드 운영 수요가 동시 확대",
      "그룹 내 표준화가 반복 매출 기반을 만들 수 있음"
    ],
    risks: ["그룹 의존도", "투자비 증가", "상용화 속도"]
  },
  {
    id: "automotive-semiconductor",
    scenarioId: "auto-sdv-mobility-cycle",
    name: "전장 반도체·센서",
    coreTechnology: "차량용 MCU, 전력반도체, 카메라·라이다·레이더, ECU",
    representativeCompanies: ["텔레칩스", "LX세미콘", "LG이노텍", "현대모비스"],
    centralityScore: 72,
    earningsLinkLevel: "중간",
    comment: "전기차·자율주행·SDV 전환은 차량당 반도체와 센서 탑재량을 늘립니다.",
    selectedCompany: "텔레칩스",
    reason: [
      "차량용 AP와 인포테인먼트 반도체 수요에 노출",
      "자율주행 기능 고도화가 센서와 제어 칩 수요를 확대",
      "완성차 생산량보다 전장 탑재율 변화가 중요"
    ],
    risks: ["완성차 출하 둔화", "가격 경쟁", "인증과 양산 지연"]
  },
  {
    id: "hybrid-powertrain-parts",
    scenarioId: "auto-sdv-mobility-cycle",
    name: "하이브리드·전동화 부품",
    coreTechnology: "모터, 인버터, 감속기, 배터리 팩, 열관리",
    representativeCompanies: ["현대모비스", "HL만도", "SNT모티브", "성우하이텍"],
    centralityScore: 76,
    earningsLinkLevel: "높음",
    comment: "EV 둔화 구간에서는 하이브리드와 전동화 부품 믹스가 실적 방어 축이 됩니다.",
    selectedCompany: "현대모비스",
    reason: [
      "완성차 전동화 플랫폼에 핵심 부품을 공급",
      "모듈·AS·전동화 부품의 포트폴리오가 안정적",
      "하이브리드 비중 확대 시 단기 실적 연결성이 높음"
    ],
    risks: ["완성차 판매 둔화", "부품 단가 압박", "전동화 투자 부담"]
  },
  {
    id: "beauty-odm-brand",
    scenarioId: "consumer-kculture-cycle",
    name: "화장품 ODM·브랜드",
    coreTechnology: "ODM, 글로벌 유통, 인디 브랜드, 스킨케어·색조 포트폴리오",
    representativeCompanies: ["한국콜마", "코스맥스", "아모레퍼시픽", "실리콘투"],
    centralityScore: 74,
    earningsLinkLevel: "높음",
    comment: "K-뷰티는 수출 지역 확장과 브랜드 교체 속도가 실적을 좌우합니다.",
    selectedCompany: "실리콘투",
    reason: [
      "해외 K-뷰티 유통망과 인디 브랜드 확산에 직접 노출",
      "ODM 기업은 고객 브랜드 성장과 함께 물량이 증가",
      "수출 데이터와 마진 유지 여부가 핵심"
    ],
    risks: ["채널 재고", "중국 수요 변동", "브랜드 경쟁 심화"]
  },
  {
    id: "k-food-export",
    scenarioId: "consumer-kculture-cycle",
    name: "K-푸드 수출",
    coreTechnology: "라면, 가공식품, 냉동식품, 글로벌 유통, 현지 생산",
    representativeCompanies: ["삼양식품", "농심", "CJ제일제당", "오리온"],
    centralityScore: 73,
    earningsLinkLevel: "높음",
    comment: "수출 물량과 현지 유통망 확장이 실적을 직접 견인하는 소비재 축입니다.",
    selectedCompany: "삼양식품",
    reason: [
      "글로벌 라면 수요와 브랜드 확산이 매출 성장으로 직접 연결",
      "ASP와 원가 안정이 마진을 좌우",
      "지역 다변화가 단일 국가 리스크를 낮춤"
    ],
    risks: ["원재료 가격", "환율 변동", "일회성 유행 둔화"]
  },
  {
    id: "entertainment-ip",
    scenarioId: "consumer-kculture-cycle",
    name: "엔터·콘텐츠 IP",
    coreTechnology: "음악 IP, 팬덤 플랫폼, 게임·웹툰, 글로벌 라이선싱",
    representativeCompanies: ["하이브", "JYP Ent.", "와이지엔터테인먼트", "크래프톤", "NAVER"],
    centralityScore: 68,
    earningsLinkLevel: "중간",
    comment: "IP 확장성과 해외 매출은 크지만 아티스트·작품 이벤트에 따른 변동성이 큽니다.",
    selectedCompany: "하이브",
    reason: [
      "글로벌 팬덤과 플랫폼 매출을 동시에 보유",
      "IP 확장이 공연·MD·콘텐츠 매출로 연결",
      "신인 라인업과 지역 확장성이 성장 변수"
    ],
    risks: ["아티스트 활동 공백", "콘텐츠 흥행 변동", "팬덤 이슈"]
  }
];
