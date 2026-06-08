import type { Scenario } from "../types/scenario";

export const scenarioOverrides: Scenario[] = [
  {
    id: "ai-infra-cycle",
    name: "AI 반도체·데이터센터 인프라 사이클",
    description:
      "AI 추론 수요가 GPU·HBM·패키징·서버·전력·냉각 인프라로 이어지는 하드웨어 중심 공급망 사이클입니다.",
    nodes: [
      {
        id: "ai-infra-root",
        label: "AI 인프라",
        theme: "AI 인프라",
        description: "AI 서버 투자와 데이터센터 증설이 반도체·전력·냉각 수요를 동시에 만듭니다.",
        x: 18,
        y: 50
      },
      {
        id: "hbm",
        label: "HBM",
        theme: "반도체",
        description: "GPU 성능과 공급 병목을 좌우하는 고대역폭 메모리",
        x: 58,
        y: 12
      },
      {
        id: "ai-accelerator",
        label: "AI 가속기",
        theme: "반도체",
        description: "GPU, NPU, ASIC 등 AI 연산 칩과 고성능 서버 보드",
        x: 58,
        y: 24
      },
      {
        id: "packaging",
        label: "첨단 패키징",
        theme: "반도체",
        description: "2.5D/3D 패키징, 본딩, 테스트 수율을 좌우하는 병목 구간",
        x: 58,
        y: 36
      },
      {
        id: "substrate",
        label: "반도체 기판",
        theme: "AI 인프라",
        description: "FC-BGA, ABF, 고다층 PCB 등 AI 서버용 기판",
        x: 58,
        y: 48
      },
      {
        id: "networking",
        label: "네트워크",
        theme: "데이터센터",
        description: "스위치, 광트랜시버, 초고속 네트워크 장비",
        x: 58,
        y: 60
      },
      {
        id: "power",
        label: "전력 인프라",
        theme: "전력",
        description: "변압기, 전선, 차단기, UPS, 전력 변환 장비",
        x: 58,
        y: 72
      },
      {
        id: "cooling",
        label: "냉각",
        theme: "냉각",
        description: "액침냉각, CDU, 공조, 열관리 솔루션",
        x: 58,
        y: 84
      }
    ],
    edges: [
      { from: "ai-infra-root", to: "ai-accelerator", strength: "강함" },
      { from: "ai-accelerator", to: "hbm", strength: "강함" },
      { from: "ai-accelerator", to: "packaging", strength: "강함" },
      { from: "packaging", to: "substrate", strength: "중간" },
      { from: "ai-infra-root", to: "networking", strength: "중간" },
      { from: "ai-infra-root", to: "power", strength: "강함" },
      { from: "ai-infra-root", to: "cooling", strength: "강함" }
    ],
    summary: [
      "AI 인프라 사이클은 메모리만이 아니라 가속기, 패키징, 기판, 네트워크, 전력, 냉각이 함께 움직입니다.",
      "실제 수혜는 고객사 투자와 CAPA, 수율, 납품 레퍼런스가 확인되는 기업에 집중됩니다.",
      "전력·냉각은 반도체보다 후행할 수 있지만 데이터센터 증설이 이어질 때 실적 연결성이 높아집니다.",
      "과열 구간에서는 실적 확인 전 가격만 먼저 움직인 종목을 별도로 걸러봐야 합니다."
    ],
    coreValueChains: ["AI 가속기", "HBM", "첨단 패키징", "반도체 기판", "네트워크", "전력 인프라", "냉각"]
  }
];

export const scenarioAdditions: Scenario[] = [
  {
    id: "ai-software-llm-cycle",
    name: "AI 소프트웨어·LLM 상용화 사이클",
    description:
      "LLM 모델, AI 에이전트, 기업용 SaaS, 데이터 플랫폼, 검색·광고·커머스 AI가 실제 매출 모델로 전환되는 사이클입니다.",
    nodes: [
      {
        id: "llm-root",
        label: "LLM 상용화",
        theme: "인터넷/플랫폼",
        description: "생성AI가 서비스 비용 절감과 신규 매출로 연결되는지 확인합니다.",
        x: 18,
        y: 50
      },
      {
        id: "llm-model",
        label: "모델·추론",
        theme: "인터넷/플랫폼",
        description: "자체 모델, 추론 최적화, AI 검색·추천 엔진",
        x: 58,
        y: 18
      },
      {
        id: "ai-agent",
        label: "AI 에이전트",
        theme: "인터넷/플랫폼",
        description: "업무 자동화, 콜센터, 문서·코딩·운영 에이전트",
        x: 58,
        y: 34
      },
      {
        id: "ai-saas",
        label: "기업용 SaaS",
        theme: "인터넷/플랫폼",
        description: "ERP, 협업, 보안, 고객관리 소프트웨어의 AI 부가가치",
        x: 58,
        y: 50
      },
      {
        id: "data-platform",
        label: "데이터 플랫폼",
        theme: "보안",
        description: "RAG, 벡터DB, 데이터 거버넌스, 관측성",
        x: 58,
        y: 66
      },
      {
        id: "ai-commerce",
        label: "AI 광고·커머스",
        theme: "인터넷/플랫폼",
        description: "검색, 광고, 커머스 전환율 개선과 구독 모델",
        x: 58,
        y: 82
      }
    ],
    edges: [
      { from: "llm-root", to: "llm-model", strength: "강함" },
      { from: "llm-root", to: "ai-agent", strength: "강함" },
      { from: "ai-agent", to: "ai-saas", strength: "중간" },
      { from: "llm-model", to: "data-platform", strength: "중간" },
      { from: "llm-root", to: "ai-commerce", strength: "확산" }
    ],
    summary: [
      "AI 소프트웨어는 모델 성능보다 유료 전환, 고객 유지율, 비용 절감 효과가 핵심입니다.",
      "플랫폼 기업은 검색·광고·커머스 데이터와 결합될 때 실적 연결성이 높아집니다.",
      "전문 AI 소프트웨어 기업은 레퍼런스와 반복 매출 구조가 확인되어야 합니다.",
      "GPU 비용 부담이 큰 기업은 매출 성장과 마진 개선을 함께 봐야 합니다."
    ],
    coreValueChains: ["LLM 모델", "AI 에이전트", "기업용 SaaS", "데이터 플랫폼", "AI 광고·커머스"]
  },
  {
    id: "physical-ai-robotics-cycle",
    name: "피지컬 AI·로봇 생산성 사이클",
    description:
      "AI가 물리 세계로 확장되며 휴머노이드·구동부·비전·스마트팩토리와 현대차그룹의 보스턴다이내믹스 전략 노출을 분리해서 추적하는 사이클입니다.",
    nodes: [
      {
        id: "physical-ai-root",
        label: "피지컬 AI",
        theme: "로봇",
        description: "AI 모델이 로봇·자동화 장비의 인지와 제어로 확장됩니다. 방산·철도 무인화는 별도 사이클로 분리합니다.",
        x: 18,
        y: 50
      },
      {
        id: "humanoid",
        label: "휴머노이드",
        theme: "로봇",
        description: "범용 로봇 플랫폼, 휴머노이드, 보스턴다이내믹스 전략 노출",
        x: 58,
        y: 18
      },
      {
        id: "actuator",
        label: "액추에이터",
        theme: "로봇",
        description: "감속기, 서보모터, 구동모듈",
        x: 58,
        y: 34
      },
      {
        id: "machine-vision",
        label: "머신비전",
        theme: "기계/장비",
        description: "센서, 카메라, 검사 장비, 공정 인식",
        x: 58,
        y: 50
      },
      {
        id: "smart-factory",
        label: "스마트팩토리",
        theme: "기계/장비",
        description: "제조 자동화, 물류 자동화, 협동로봇 적용",
        x: 58,
        y: 66
      },
      {
        id: "robot-software",
        label: "로봇 제어 SW",
        theme: "인터넷/플랫폼",
        description: "로봇 제어, 경로계획, 원격관제, 물류 자동화",
        x: 58,
        y: 82
      }
    ],
    edges: [
      { from: "physical-ai-root", to: "humanoid", strength: "강함" },
      { from: "humanoid", to: "actuator", strength: "강함" },
      { from: "physical-ai-root", to: "machine-vision", strength: "중간" },
      { from: "machine-vision", to: "smart-factory", strength: "중간" },
      { from: "physical-ai-root", to: "robot-software", strength: "확산" }
    ],
    summary: [
      "피지컬 AI는 로봇 완제품, 구동부, 비전, 제어 소프트웨어를 직접 수혜축으로 나눠 봐야 합니다.",
      "현대차·현대모비스는 보스턴다이내믹스와 그룹 내 자동화 적용이라는 전략 노출로 분류합니다.",
      "현대로템처럼 방산·철도 수주가 핵심인 종목은 피지컬 AI가 아니라 방산·지상무기 축에서 확인합니다.",
      "액추에이터와 감속기는 실수요가 확인될 때 이익 레버리지가 커집니다.",
      "휴머노이드 기대감은 선반영 위험이 커서 수주·양산 레퍼런스 확인이 중요합니다."
    ],
    coreValueChains: ["휴머노이드", "액추에이터", "머신비전", "스마트팩토리", "로봇 제어 SW", "전략 노출"]
  },
  {
    id: "on-device-ai-edge-cycle",
    name: "온디바이스·엣지 AI 사이클",
    description:
      "AI가 스마트폰, PC, 자동차, 산업용 장비 안으로 들어오며 저전력 반도체, 센서, 카메라, 소형 메모리 수요가 늘어나는 사이클입니다.",
    nodes: [
      {
        id: "edge-ai-root",
        label: "엣지 AI",
        theme: "반도체",
        description: "클라우드 밖 단말에서 AI 추론을 처리하는 구조입니다.",
        x: 18,
        y: 50
      },
      {
        id: "edge-npu",
        label: "NPU·IP",
        theme: "반도체",
        description: "저전력 추론칩, 팹리스 IP, SoC 설계",
        x: 58,
        y: 20
      },
      {
        id: "ai-pc-mobile",
        label: "AI PC·모바일",
        theme: "반도체",
        description: "AI PC, AI폰, 모바일 AP, 메모리 탑재량 증가",
        x: 58,
        y: 38
      },
      {
        id: "edge-sensor",
        label: "센서·카메라",
        theme: "기계/장비",
        description: "이미지센서, 카메라모듈, 센서퓨전",
        x: 58,
        y: 56
      },
      {
        id: "edge-automotive",
        label: "차량용 엣지",
        theme: "자동차",
        description: "SDV, ADAS, 차량용 반도체와 제어기",
        x: 58,
        y: 74
      }
    ],
    edges: [
      { from: "edge-ai-root", to: "edge-npu", strength: "강함" },
      { from: "edge-npu", to: "ai-pc-mobile", strength: "강함" },
      { from: "edge-ai-root", to: "edge-sensor", strength: "중간" },
      { from: "edge-ai-root", to: "edge-automotive", strength: "확산" }
    ],
    summary: [
      "온디바이스 AI는 서버 투자와 다른 축으로, 단말 교체 사이클과 함께 움직입니다.",
      "저전력 반도체와 카메라·센서 부품은 채택률이 높아질수록 실적 연결성이 커집니다.",
      "AI PC와 모바일은 출하량 회복 여부가 중요합니다.",
      "차량용 엣지는 SDV 전환과 ADAS 탑재율을 함께 확인해야 합니다."
    ],
    coreValueChains: ["NPU·IP", "AI PC·모바일", "센서·카메라", "차량용 엣지"]
  },
  {
    id: "ai-security-data-cycle",
    name: "AI 보안·데이터 신뢰 사이클",
    description:
      "AI 사용 확산으로 사이버보안, 데이터 거버넌스, 인증, 관측성, 개인정보 보호 수요가 커지는 방어형 성장 사이클입니다.",
    nodes: [
      {
        id: "ai-security-root",
        label: "AI 보안",
        theme: "보안",
        description: "AI 활용 확대가 데이터·계정·클라우드 보안 수요를 만듭니다.",
        x: 18,
        y: 50
      },
      {
        id: "zero-trust",
        label: "제로트러스트",
        theme: "보안",
        description: "접근 제어, 인증, 권한 관리",
        x: 58,
        y: 24
      },
      {
        id: "cloud-security",
        label: "클라우드 보안",
        theme: "보안",
        description: "CSPM, EDR, XDR, 보안관제",
        x: 58,
        y: 42
      },
      {
        id: "data-governance",
        label: "데이터 거버넌스",
        theme: "보안",
        description: "개인정보, 데이터 품질, AI 학습 데이터 관리",
        x: 58,
        y: 60
      },
      {
        id: "ai-observability",
        label: "AI 관측성",
        theme: "인터넷/플랫폼",
        description: "모델 성능, 비용, 오류, 보안 이벤트 모니터링",
        x: 58,
        y: 78
      }
    ],
    edges: [
      { from: "ai-security-root", to: "zero-trust", strength: "강함" },
      { from: "ai-security-root", to: "cloud-security", strength: "강함" },
      { from: "ai-security-root", to: "data-governance", strength: "중간" },
      { from: "data-governance", to: "ai-observability", strength: "확산" }
    ],
    summary: [
      "AI 보안은 경기 민감도보다 규제와 사고 대응 수요에 민감합니다.",
      "클라우드와 엔드포인트 보안은 반복 매출과 고객 유지율이 중요합니다.",
      "데이터 거버넌스는 AI 도입이 확산될수록 중장기 수요가 커집니다.",
      "국내 기업은 공공·금융 레퍼런스와 구독형 전환 여부를 함께 봐야 합니다."
    ],
    coreValueChains: ["제로트러스트", "클라우드 보안", "데이터 거버넌스", "AI 관측성"]
  },
  {
    id: "semiconductor-supply-chain-cycle",
    name: "반도체 소부장·장비 사이클",
    description:
      "메모리, 파운드리, 팹리스, 장비, 소재, 부품, 테스트가 증설·미세화·국산화 흐름에 따라 순환하는 반도체 공급망 사이클입니다.",
    nodes: [
      {
        id: "semiconductor-root",
        label: "반도체 공급망",
        theme: "반도체",
        description: "AI뿐 아니라 메모리 업황, 설비투자, 공정 전환을 함께 봅니다.",
        x: 18,
        y: 50
      },
      {
        id: "memory-foundry",
        label: "메모리·파운드리",
        theme: "반도체",
        description: "DRAM, NAND, 파운드리, 첨단공정",
        x: 58,
        y: 18
      },
      {
        id: "semicap-equipment",
        label: "반도체 장비",
        theme: "기계/장비",
        description: "증착, 식각, 세정, 검사, 후공정 장비",
        x: 58,
        y: 36
      },
      {
        id: "semicap-materials",
        label: "소재·부품",
        theme: "반도체",
        description: "가스, 포토레지스트, 쿼츠, 세라믹, 부품",
        x: 58,
        y: 54
      },
      {
        id: "test-probe",
        label: "테스트·소켓",
        theme: "반도체",
        description: "테스트 소켓, 프로브카드, 검사 서비스",
        x: 58,
        y: 72
      }
    ],
    edges: [
      { from: "semiconductor-root", to: "memory-foundry", strength: "강함" },
      { from: "memory-foundry", to: "semicap-equipment", strength: "강함" },
      { from: "memory-foundry", to: "semicap-materials", strength: "중간" },
      { from: "semiconductor-root", to: "test-probe", strength: "중간" }
    ],
    summary: [
      "반도체 소부장은 AI 인프라와 겹치지만, 메모리 가격과 설비투자 사이클도 별도로 봐야 합니다.",
      "장비주는 발주 재개와 고객사 CAPEX가 확인될 때 선행합니다.",
      "소재·부품은 국산화, 미세화, 가동률 회복에 따라 동행합니다.",
      "테스트·소켓은 고성능 칩과 다품종 테스트 증가가 실적 연결 포인트입니다."
    ],
    coreValueChains: ["메모리·파운드리", "반도체 장비", "소재·부품", "테스트·소켓"]
  },
  {
    id: "auto-sdv-mobility-cycle",
    name: "자동차 SDV·전장 전환 사이클",
    description:
      "완성차가 SDV, 전장, 자율주행, 하이브리드, 전기차 플랫폼으로 전환되며 부품 가치가 재편되는 사이클입니다.",
    nodes: [
      {
        id: "auto-root",
        label: "자동차 전환",
        theme: "자동차",
        description: "완성차 판매보다 소프트웨어와 전장 가치 비중이 커지는 구조입니다.",
        x: 18,
        y: 50
      },
      { id: "sdv", label: "SDV", theme: "자동차", description: "차량용 OS, 제어기, OTA", x: 58, y: 22 },
      { id: "adas", label: "ADAS", theme: "자동차", description: "센서, 카메라, 레이더, 자율주행", x: 58, y: 40 },
      { id: "powertrain", label: "전동화", theme: "자동차", description: "모터, 인버터, 전력반도체", x: 58, y: 58 },
      { id: "hybrid", label: "하이브리드", theme: "자동차", description: "내연기관과 전동화의 과도기 수혜", x: 58, y: 76 }
    ],
    edges: [
      { from: "auto-root", to: "sdv", strength: "강함" },
      { from: "sdv", to: "adas", strength: "중간" },
      { from: "auto-root", to: "powertrain", strength: "강함" },
      { from: "auto-root", to: "hybrid", strength: "중간" }
    ],
    summary: [
      "자동차는 판매량뿐 아니라 전장·소프트웨어 탑재율을 함께 봐야 합니다.",
      "SDV 전환은 완성차, 부품사, IT 계열사의 역할을 바꿉니다.",
      "하이브리드와 전동화는 지역별 규제와 수요가 달라 분리해서 확인해야 합니다.",
      "부품사는 고객사 다변화와 ASP 상승 여부가 핵심입니다."
    ],
    coreValueChains: ["SDV", "ADAS", "전동화", "하이브리드"]
  },
  {
    id: "consumer-kculture-cycle",
    name: "K-소비재·콘텐츠 글로벌 확장 사이클",
    description:
      "화장품, 식품, 엔터, 게임, 미디어, 유통 플랫폼이 해외 소비와 브랜드 확장으로 연결되는 내수 탈피형 성장 사이클입니다.",
    nodes: [
      {
        id: "consumer-root",
        label: "K-소비 확장",
        theme: "소비재",
        description: "국내 소비보다 해외 채널과 브랜드 확장성을 봅니다.",
        x: 18,
        y: 50
      },
      { id: "beauty", label: "화장품", theme: "소비재", description: "ODM, 브랜드, 채널 확장", x: 58, y: 20 },
      { id: "food", label: "식품", theme: "식품", description: "라면, 건강식품, 수출 식품", x: 58, y: 38 },
      { id: "entertainment", label: "엔터", theme: "엔터/게임", description: "IP, 공연, 팬덤 플랫폼", x: 58, y: 56 },
      { id: "game-media", label: "게임·미디어", theme: "미디어", description: "콘텐츠 IP와 글로벌 서비스", x: 58, y: 74 }
    ],
    edges: [
      { from: "consumer-root", to: "beauty", strength: "강함" },
      { from: "consumer-root", to: "food", strength: "강함" },
      { from: "consumer-root", to: "entertainment", strength: "중간" },
      { from: "entertainment", to: "game-media", strength: "확산" }
    ],
    summary: [
      "K-소비재는 수출 데이터, 채널 확장, 브랜드 재구매율을 같이 봅니다.",
      "화장품과 식품은 환율과 지역별 규제가 실적에 영향을 줍니다.",
      "엔터·미디어는 IP 수명과 플랫폼 매출 비중이 중요합니다.",
      "실적 확인 없이 테마만 움직인 종목은 단기 변동성이 큽니다."
    ],
    coreValueChains: ["화장품", "식품", "엔터", "게임·미디어", "유통"]
  }
];
