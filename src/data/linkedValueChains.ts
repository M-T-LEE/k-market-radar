import type { LinkedValueChain } from "../types/scenario";

// 산업의 1차 수혜가 장비, 검사, 소재, 부품, 인프라로 확산되는 2차 연계 체인입니다.
// 투자 판단용 확정 데이터가 아니라 K-Market Radar 내부 universe와 결합해 흐름을 포착하기 위한 분석 데이터입니다.
export const linkedValueChainsByScenarioId: Record<string, LinkedValueChain[]> = {
  "ai-infra-cycle": [
    {
      id: "ai-memory-test",
      title: "HBM·메모리 증설 → 테스트·검사",
      trigger: "HBM과 고성능 메모리 공급 확대",
      effect: "테스트 소켓, 프로브카드, 검사장비 수요 증가",
      beneficiaryChains: ["테스트 소켓", "프로브카드", "검사장비"],
      stockKeywords: [
        "리노공업",
        "ISC",
        "티에스이",
        "마이크로컨텍솔",
        "고영",
        "넥스틴",
        "반도체 테스트",
        "테스트 소켓",
        "프로브카드",
        "웨이퍼 검사",
        "반도체 검사장비"
      ],
      timing: "coincident",
      sensitivity: "high"
    },
    {
      id: "ai-packaging-equipment",
      title: "AI 칩 패키징 → 후공정 장비",
      trigger: "GPU·HBM 패키징 난도 상승",
      effect: "본딩, 어드밴스드 패키징, 후공정 검사 수요 확대",
      beneficiaryChains: ["본딩 장비", "후공정", "패키징 검사"],
      stockKeywords: ["한미반도체", "HPSP", "리노공업", "파크시스템스", "인텍플러스", "패키징", "본딩"],
      timing: "leading",
      sensitivity: "high"
    },
    {
      id: "ai-server-substrate",
      title: "AI 서버 증설 → 기판·전원부",
      trigger: "AI 서버와 GPU 클러스터 투자 증가",
      effect: "FC-BGA, PCB, MLCC, 전원부 부품 수요 증가",
      beneficiaryChains: ["FC-BGA", "PCB", "MLCC", "전원부"],
      stockKeywords: ["삼성전기", "이수페타시스", "대덕전자", "LG이노텍", "심텍", "기판", "PCB", "MLCC"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "ai-dc-power-cooling",
      title: "데이터센터 확장 → 전력·냉각",
      trigger: "AI 데이터센터 전력 밀도 상승",
      effect: "변압기, 배전, 전선, 냉각 인프라 수요 증가",
      beneficiaryChains: ["변압기", "전선", "배전", "냉각"],
      stockKeywords: ["HD현대일렉트릭", "효성중공업", "LS ELECTRIC", "LS", "대한전선", "가온전선", "케이엔솔", "전력", "냉각"],
      timing: "lagging",
      sensitivity: "high"
    }
  ],
  "ai-software-llm-cycle": [
    {
      id: "llm-cloud-data",
      title: "LLM 서비스 확산 → 클라우드·데이터",
      trigger: "기업용 LLM 도입과 AI 서비스 사용량 증가",
      effect: "클라우드, 데이터 관리, 보안, 업무자동화 수요 증가",
      beneficiaryChains: ["클라우드", "데이터 플랫폼", "업무자동화"],
      stockKeywords: ["NAVER", "솔트룩스", "코난테크놀로지", "마음AI", "폴라리스AI", "와이즈넛", "데이타솔루션", "씨이랩", "모아데이타"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "llm-saas-consulting",
      title: "AI 업무 전환 → SaaS·SI",
      trigger: "기업 내부 업무의 AI 전환 투자",
      effect: "ERP, 그룹웨어, SI, 구축 컨설팅 수요 증가",
      beneficiaryChains: ["ERP", "그룹웨어", "SI"],
      stockKeywords: ["더존비즈온", "삼성에스디에스", "현대오토에버", "포스코DX", "한글과컴퓨터", "가비아", "케이아이엔엑스", "영림원소프트랩"],
      timing: "lagging",
      sensitivity: "medium"
    },
    {
      id: "llm-commerce-monetization",
      title: "AI 기능 상용화 → 커머스·결제 전환",
      trigger: "검색·추천·상담 기능이 쇼핑 전환율 개선으로 연결",
      effect: "판매자 도구, 커머스 플랫폼, 결제 인프라의 실적 확인 필요",
      beneficiaryChains: ["커머스", "결제", "판매자 도구"],
      stockKeywords: ["카페24", "커넥트웨이브", "NHN KCP", "KG이니시스", "NAVER"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ],
  "physical-ai-robotics-cycle": [
    {
      id: "robot-actuator-supply",
      title: "로봇 양산 → 구동부·감속기",
      trigger: "휴머노이드와 협동로봇 양산 준비",
      effect: "액추에이터, 감속기, 서보모터 수요 증가",
      beneficiaryChains: ["액추에이터", "감속기", "서보모터"],
      stockKeywords: ["로보티즈", "에스피지", "하이젠알앤엠", "뉴로메카", "에스비비테크", "해성티피씨", "감속기", "액추에이터", "서보모터"],
      timing: "leading",
      sensitivity: "high"
    },
    {
      id: "robot-vision-factory",
      title: "공장 자동화 → 비전·검사",
      trigger: "로봇 적용 공정 확대",
      effect: "머신비전, 카메라, 검사장비, 스마트팩토리 수요 증가",
      beneficiaryChains: ["머신비전", "검사장비", "스마트팩토리"],
      stockKeywords: ["고영", "뷰웍스", "라온피플", "코윈테크", "트윔", "머신비전", "비전검사", "검사장비", "스마트팩토리"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "robot-platform-strategy",
      title: "피지컬 AI 확산 → 로봇 플랫폼 전략 노출",
      trigger: "휴머노이드와 로봇 플랫폼 투자가 그룹 자동화 옵션으로 확장",
      effect: "직접 로봇 기업과 보스턴다이내믹스 전략 노출 기업을 분리해 확인",
      beneficiaryChains: ["휴머노이드", "로봇 플랫폼", "전략 노출"],
      stockKeywords: ["레인보우로보틱스", "두산로보틱스", "로보티즈", "현대차", "현대모비스", "보스턴다이내믹스", "피지컬AI"],
      timing: "leading",
      sensitivity: "medium"
    }
  ],
  "robot-automation-cycle": [
    {
      id: "automation-vision-inspection",
      title: "자동화 투자 → 비전·검사",
      trigger: "제조 자동화와 공정 무인화 투자",
      effect: "머신비전, 검사장비, 제어시스템 수요 증가",
      beneficiaryChains: ["머신비전", "검사장비", "제어시스템"],
      stockKeywords: ["고영", "뷰웍스", "라온피플", "코윈테크", "트윔", "로보스타", "스마트팩토리", "비전검사", "검사장비"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "automation-motion-control",
      title: "로봇 도입 → 모션·구동부",
      trigger: "로봇과 자동화 장비 도입 증가",
      effect: "감속기, 서보모터, 제어기 수요 증가",
      beneficiaryChains: ["감속기", "서보모터", "제어기"],
      stockKeywords: ["에스피지", "로보티즈", "하이젠알앤엠", "아진엑스텍", "감속기", "서보"],
      timing: "leading",
      sensitivity: "high"
    }
  ],
  "on-device-ai-edge-cycle": [
    {
      id: "edge-ai-chip-sensor",
      title: "온디바이스 AI → 저전력 칩·센서",
      trigger: "AI PC와 AI폰 확산",
      effect: "NPU, 이미지센서, 카메라모듈, 패키징 수요 증가",
      beneficiaryChains: ["NPU", "이미지센서", "카메라모듈"],
      stockKeywords: ["텔레칩스", "칩스앤미디어", "LG이노텍", "자화전자", "제주반도체", "NPU", "센서", "카메라"],
      timing: "leading",
      sensitivity: "high"
    },
    {
      id: "edge-memory-packaging",
      title: "AI 기기 확산 → 모바일 메모리·패키징",
      trigger: "기기 내 AI 연산과 저장공간 증가",
      effect: "저전력 메모리, 패키징, 기판 수요 증가",
      beneficiaryChains: ["저전력 메모리", "패키징", "기판"],
      stockKeywords: ["삼성전자", "SK하이닉스", "한미반도체", "삼성전기", "심텍", "제주반도체"],
      timing: "coincident",
      sensitivity: "medium"
    }
  ],
  "ai-security-data-cycle": [
    {
      id: "ai-security-governance",
      title: "AI 도입 → 보안·데이터 거버넌스",
      trigger: "기업 AI 도입과 데이터 사용 확대",
      effect: "접근제어, 개인정보보호, 보안관제 수요 증가",
      beneficiaryChains: ["보안", "개인정보", "보안관제"],
      stockKeywords: ["안랩", "라온시큐어", "지니언스", "파수", "샌즈랩", "보안", "제로트러스트"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ],
  "semiconductor-supply-chain-cycle": [
    {
      id: "memory-rebound-equipment",
      title: "메모리 공급 회복 → 전공정 장비",
      trigger: "DRAM·NAND 가동률 회복과 증설 재개",
      effect: "증착, 식각, 세정, 열처리 장비 수요 증가",
      beneficiaryChains: ["증착", "식각", "세정", "열처리"],
      stockKeywords: ["원익IPS", "주성엔지니어링", "유진테크", "테스", "피에스케이", "전공정", "장비"],
      timing: "leading",
      sensitivity: "high"
    },
    {
      id: "memory-rebound-materials",
      title: "공정 미세화 → 소재·부품",
      trigger: "미세공정 난도 상승과 소재 사용량 증가",
      effect: "프리커서, 식각액, 쿼츠, 실리콘카바이드 부품 수요 증가",
      beneficiaryChains: ["프리커서", "식각액", "쿼츠", "부품"],
      stockKeywords: ["솔브레인", "동진쎄미켐", "티씨케이", "월덱스", "하나머티리얼즈", "소재", "쿼츠"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "memory-rebound-test",
      title: "출하 증가 → 테스트·프로브",
      trigger: "메모리와 비메모리 출하량 증가",
      effect: "테스트 소켓, 프로브카드, 검사 서비스 수요 증가",
      beneficiaryChains: ["테스트 소켓", "프로브카드", "반도체 검사"],
      stockKeywords: [
        "리노공업",
        "ISC",
        "티에스이",
        "마이크로컨텍솔",
        "엑시콘",
        "반도체 테스트",
        "테스트 소켓",
        "프로브카드"
      ],
      timing: "lagging",
      sensitivity: "high"
    }
  ],
  "auto-sdv-mobility-cycle": [
    {
      id: "sdv-chip-sensor",
      title: "SDV 전환 → 차량용 반도체·센서",
      trigger: "차량 소프트웨어와 ADAS 기능 확대",
      effect: "MCU, 카메라, 레이더, 통신모듈 수요 증가",
      beneficiaryChains: ["차량용 반도체", "카메라", "센서"],
      stockKeywords: ["텔레칩스", "칩스앤미디어", "LG이노텍", "현대모비스", "HL만도", "차량용 반도체", "센서"],
      timing: "coincident",
      sensitivity: "high"
    },
    {
      id: "sdv-software-security",
      title: "커넥티드카 → 소프트웨어·보안",
      trigger: "OTA와 차량 데이터 서비스 확대",
      effect: "차량 OS, 지도, 보안, 인포테인먼트 수요 증가",
      beneficiaryChains: ["차량 SW", "보안", "인포테인먼트"],
      stockKeywords: ["현대오토에버", "모트렉스", "오비고", "라온시큐어", "보안", "OTA"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ],
  "shipbuilding-supercycle": [
    {
      id: "lng-ship-equipment",
      title: "LNG선 수주 → 엔진·기자재",
      trigger: "고부가 LNG선과 친환경 선박 수주 증가",
      effect: "선박엔진, 보냉재, 밸브, 기자재 수요 증가",
      beneficiaryChains: ["선박엔진", "보냉재", "밸브"],
      stockKeywords: ["HD현대마린엔진", "동성화인텍", "한국카본", "성광벤드", "태광", "선박엔진", "보냉재"],
      timing: "lagging",
      sensitivity: "high"
    },
    {
      id: "ship-steel-material",
      title: "건조량 증가 → 후판·소재",
      trigger: "조선사 건조 슬롯 확대",
      effect: "후판, 특수강, 도료, 용접재 수요 증가",
      beneficiaryChains: ["후판", "특수강", "도료"],
      stockKeywords: ["POSCO홀딩스", "현대제철", "KCC", "후판", "철강", "도료"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ],
  "defense-export-cycle": [
    {
      id: "defense-electronics-ammo",
      title: "방산 수출 → 탄약·전자·정비",
      trigger: "유도무기와 지상무기 수출 계약 증가",
      effect: "탄약, 레이더, 전자전, MRO 부품 수요 증가",
      beneficiaryChains: ["탄약", "방산전자", "MRO"],
      stockKeywords: ["풍산", "한화시스템", "LIG넥스원", "한화에어로스페이스", "현대로템", "방산", "전자전"],
      timing: "coincident",
      sensitivity: "high"
    }
  ],
  "space-economy-cycle": [
    {
      id: "space-satellite-components",
      title: "위성 발사 증가 → 탑재체·지상국",
      trigger: "저궤도 위성과 관측 위성 발사 증가",
      effect: "탑재체, 안테나, 관제, 지상국 장비 수요 증가",
      beneficiaryChains: ["탑재체", "안테나", "지상국"],
      stockKeywords: ["쎄트렉아이", "컨텍", "AP위성", "인텔리안테크", "루미르", "위성", "안테나", "지상국"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "space-defense-link",
      title: "우주 인프라 → 국방 통신·정찰",
      trigger: "우주 자산의 군사·통신 활용 확대",
      effect: "감시정찰, 보안통신, 우주 상황인식 수요 증가",
      beneficiaryChains: ["정찰", "보안통신", "우주상황인식"],
      stockKeywords: ["한화시스템", "LIG넥스원", "한국항공우주", "쎄트렉아이", "정찰", "통신"],
      timing: "lagging",
      sensitivity: "high"
    }
  ],
  "bio-platform-cycle": [
    {
      id: "bio-cdmo-supply",
      title: "CDMO 수주 → 원부자재·콜드체인",
      trigger: "바이오의약품 위탁생산과 임상 생산 증가",
      effect: "배지, 원부자재, 품질검사, 콜드체인 수요 증가",
      beneficiaryChains: ["배지", "품질검사", "콜드체인"],
      stockKeywords: ["삼성바이오로직스", "에스티팜", "바이넥스", "일신바이오", "콜드체인", "CDMO"],
      timing: "lagging",
      sensitivity: "medium"
    },
    {
      id: "bio-device-consumable",
      title: "의료기기 수출 → 소모품·진단",
      trigger: "미용·진단·수술기기 수출 확대",
      effect: "소모품 반복 매출, 진단키트, 부품 수요 증가",
      beneficiaryChains: ["소모품", "진단", "의료부품"],
      stockKeywords: ["클래시스", "파마리서치", "휴젤", "바텍", "오스템임플란트", "의료기기", "진단"],
      timing: "coincident",
      sensitivity: "medium"
    }
  ],
  "battery-mobility-cycle": [
    {
      id: "battery-cell-equipment",
      title: "셀 증설 재개 → 장비·검사",
      trigger: "배터리 셀·ESS 투자 재개",
      effect: "전극, 조립, 활성화, 검사 장비 수요 증가",
      beneficiaryChains: ["전극장비", "조립장비", "검사장비"],
      stockKeywords: [
        "피엔티",
        "윤성에프앤씨",
        "하나기술",
        "엔시스",
        "엠플러스",
        "배터리 장비",
        "배터리 검사",
        "전극 검사",
        "활성화 검사"
      ],
      timing: "leading",
      sensitivity: "high"
    },
    {
      id: "battery-ess-power",
      title: "ESS 확산 → PCS·전력기기",
      trigger: "데이터센터와 전력망의 저장장치 수요 확대",
      effect: "전력변환장치, 변압기, 배전기기 수요 증가",
      beneficiaryChains: ["PCS", "전력변환", "변압기"],
      stockKeywords: ["LS ELECTRIC", "효성중공업", "HD현대일렉트릭", "전력", "ESS"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ],
  "energy-grid-cycle": [
    {
      id: "grid-transformer-cable",
      title: "전력망 투자 → 변압기·전선",
      trigger: "전력망 노후화와 데이터센터 전력 수요 확대",
      effect: "변압기, 차단기, 전선, 전력변환기 수요 증가",
      beneficiaryChains: ["변압기", "차단기", "전선"],
      stockKeywords: ["HD현대일렉트릭", "효성중공업", "LS ELECTRIC", "LS", "대한전선", "가온전선", "변압기", "전선"],
      timing: "coincident",
      sensitivity: "high"
    },
    {
      id: "grid-nuclear-material",
      title: "원전·SMR → 기자재·정비",
      trigger: "원전 재가동과 신규 원전·SMR 투자",
      effect: "원전 기자재, 밸브, 정비, 계측 장비 수요 증가",
      beneficiaryChains: ["원전 기자재", "밸브", "정비"],
      stockKeywords: ["두산에너빌리티", "비에이치아이", "우진", "한전기술", "성광벤드", "원전", "SMR"],
      timing: "lagging",
      sensitivity: "high"
    }
  ],
  "construction-infra-cycle": [
    {
      id: "infra-material-machinery",
      title: "인프라 투자 → 건자재·기계",
      trigger: "토목·플랜트·데이터센터 공사 발주",
      effect: "시멘트, 철근, 건설기계, 렌탈 수요 증가",
      beneficiaryChains: ["건자재", "철근", "건설기계"],
      stockKeywords: ["쌍용C&E", "아세아시멘트", "현대건설기계", "HD현대인프라코어", "진성티이씨", "건설기계", "시멘트"],
      timing: "coincident",
      sensitivity: "medium"
    },
    {
      id: "infra-power-network",
      title: "데이터센터 공사 → 전력·통신 인프라",
      trigger: "대형 데이터센터와 산업단지 투자",
      effect: "송배전, 전선, 네트워크 구축 수요 증가",
      beneficiaryChains: ["송배전", "전선", "네트워크"],
      stockKeywords: ["LS ELECTRIC", "대한전선", "가온전선", "HD현대일렉트릭", "네트워크", "전력"],
      timing: "lagging",
      sensitivity: "high"
    }
  ],
  "finance-shareholder-cycle": [
    {
      id: "finance-it-security",
      title: "주주환원·금융 디지털 → IT·보안",
      trigger: "금융권 비용 효율화와 디지털 전환",
      effect: "금융 SI, 보안, 데이터 분석 수요 증가",
      beneficiaryChains: ["금융 SI", "보안", "데이터"],
      stockKeywords: ["삼성에스디에스", "현대오토에버", "안랩", "더존비즈온", "금융", "보안"],
      timing: "lagging",
      sensitivity: "low"
    }
  ],
  "internet-platform-ai-cycle": [
    {
      id: "platform-cloud-payment",
      title: "플랫폼 수익화 → 클라우드·결제·물류",
      trigger: "광고와 커머스 회복, AI 기능 상용화",
      effect: "클라우드, 결제, 물류, 콘텐츠 제작 수요 증가",
      beneficiaryChains: ["클라우드", "결제", "물류"],
      stockKeywords: ["NAVER", "카카오", "NHN", "KG이니시스", "CJ대한통운", "클라우드", "결제", "물류"],
      timing: "coincident",
      sensitivity: "medium"
    }
  ],
  "consumer-kculture-cycle": [
    {
      id: "kbeauty-odm-container",
      title: "K뷰티 수출 → ODM·용기·유통",
      trigger: "인디 브랜드와 글로벌 채널 확산",
      effect: "ODM, 화장품 용기, 역직구 유통 수요 증가",
      beneficiaryChains: ["ODM", "용기", "유통"],
      stockKeywords: ["한국콜마", "코스맥스", "실리콘투", "연우", "브이티", "화장품", "K뷰티"],
      timing: "coincident",
      sensitivity: "high"
    },
    {
      id: "kfood-export-logistics",
      title: "K푸드 수출 → 가공식품·물류",
      trigger: "라면·소스·냉동식품 수출 확대",
      effect: "식품 제조, 포장재, 물류 수요 증가",
      beneficiaryChains: ["가공식품", "포장재", "물류"],
      stockKeywords: ["삼양식품", "농심", "CJ제일제당", "대한항공", "동원F&B", "K푸드", "라면"],
      timing: "coincident",
      sensitivity: "medium"
    }
  ],
  "energy-commodity-cycle": [
    {
      id: "commodity-shipping-chem",
      title: "원자재 가격 변동 → 해운·화학·소재",
      trigger: "유가, LNG, 금속 가격 변동성 확대",
      effect: "운임, 정제마진, 화학 스프레드, 비철금속 마진 변화",
      beneficiaryChains: ["해운", "정유", "화학", "비철"],
      stockKeywords: ["팬오션", "HMM", "S-Oil", "SK이노베이션", "롯데케미칼", "고려아연", "해운", "정유", "화학"],
      timing: "coincident",
      sensitivity: "high"
    },
    {
      id: "green-transition-material",
      title: "친환경 전환 → 전력망·ESS·금속",
      trigger: "탄소 비용과 전력망 투자 증가",
      effect: "전선, 변압기, ESS, 구리·알루미늄 수요 증가",
      beneficiaryChains: ["전선", "변압기", "ESS", "비철"],
      stockKeywords: ["LS", "대한전선", "가온전선", "LS ELECTRIC", "고려아연", "ESS", "구리"],
      timing: "lagging",
      sensitivity: "medium"
    }
  ]
};
