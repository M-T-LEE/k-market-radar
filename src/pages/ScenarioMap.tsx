import {
  ArrowRight,
  BatteryCharging,
  Bot,
  Box,
  Cpu,
  Fan,
  GitBranch,
  Layers3,
  LockKeyhole,
  Network,
  Rocket,
  Server,
  SquareStack
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HorizontalScroller } from "../components/HorizontalScroller";
import { IndustryReportPanel } from "../components/InvestmentIntelligencePanels";
import { StockExternalLink } from "../components/StockExternalLink";
import { useMarketData } from "../context/MarketDataContext";
import { scenarios } from "../data/scenarios";
import { getScreenerUrl } from "../lib/externalLinks";
import { cn, formatPercent, getMarketMoveBadgeClass, getMarketMoveTextClass } from "../lib/formatters";
import { getScenarioStocks as getMatchedScenarioStocks } from "../lib/scenarioMatching";
import type { LinkedValueChain, Scenario, ScenarioNode as ScenarioMapNode } from "../types/scenario";
import type { Stock } from "../types/stock";

type FlowStatus = "강세" | "강세전환" | "관찰" | "약세" | "약세전환";

type TodayFlowItem = ReturnType<typeof summarizeNode> & {
  id: string;
  scenario: Scenario;
  node: ScenarioMapNode;
  kind: "핵심산업" | "세부산업";
};

type ScenarioNodeSummary = ReturnType<typeof summarizeNode>;

type ScenarioNodeOverview = {
  scenario: Scenario;
  node: ScenarioMapNode;
  summary: ScenarioNodeSummary;
  strongStocks: Stock[];
};

type ScenarioOverview = {
  scenario: Scenario;
  nodeOverviews: ScenarioNodeOverview[];
  topNodes: ScenarioNodeOverview[];
  strongStocks: Stock[];
  relatedCount: number;
  averageChange: number;
  breadth: number;
  status: FlowStatus;
  entryNode: ScenarioMapNode;
};

type NodeStockRule = {
  domesticNames?: string[];
  preferredNames?: string[];
  include?: string[];
  requiredKeywords?: string[];
  excludeNames?: string[];
  globalReferences?: string[];
};

const icons: Record<string, ReactNode> = {
  hbm: <Cpu size={22} />,
  substrate: <SquareStack size={22} />,
  packaging: <Box size={22} />,
  datacenter: <Server size={22} />,
  power: <BatteryCharging size={22} />,
  cooling: <Fan size={22} />,
  robot: <Bot size={22} />,
  aerospace: <Rocket size={22} />,
  security: <LockKeyhole size={22} />,
  "space-root": <Rocket size={28} />,
  launch: <Rocket size={22} />,
  "satellite-manufacturing": <SquareStack size={22} />,
  "space-components": <Box size={22} />,
  "ground-station": <Server size={22} />,
  "leo-communication": <Server size={22} />,
  "earth-observation": <Cpu size={22} />,
  "defense-space": <LockKeyhole size={22} />,
  "lunar-logistics": <Rocket size={22} />
};

function normalizeText(value: string) {
  return value.replace(/[\s/·,().-]/g, "").toLowerCase();
}

const canonicalNodeLabels: Record<string, string> = {
  [normalizeText("액츄에이터")]: "액추에이터",
  [normalizeText("액추에이터")]: "액추에이터",
  [normalizeText("로봇 액츄에이터")]: "로봇 액추에이터",
  [normalizeText("로봇 액추에이터")]: "로봇 액추에이터",
  [normalizeText("액츄에이터·감속기")]: "액추에이터·감속기",
  [normalizeText("액추에이터·감속기")]: "액추에이터·감속기"
};

function getCanonicalNodeLabel(label: string) {
  return canonicalNodeLabels[normalizeText(label)] ?? label;
}

function isEtf(stock: Stock) {
  return stock.assetType === "ETF";
}

function isDomesticMarket(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

function isCommonStock(stock: Stock) {
  return !isEtf(stock);
}

function stockRank(stock: Stock) {
  if (isEtf(stock)) return isDomesticMarket(stock) ? 3 : 4;
  if (isDomesticMarket(stock)) return 0;
  if (stock.market.startsWith("US")) return 1;
  return 2;
}

function getStockMove(stock: Stock) {
  return stock.dailyChangeRate ?? stock.priceChange3M ?? 0;
}

function getBreadth(stocks: Stock[]) {
  return stocks.length ? (stocks.filter((stock) => getStockMove(stock) > 0).length / stocks.length) * 100 : 0;
}

function prioritizeDomesticStocks(stocks: Stock[]) {
  return [
    ...stocks.filter(isDomesticMarket),
    ...stocks.filter((stock) => !isDomesticMarket(stock))
  ];
}

function matchesNormalizedValue(haystack: string, values: string[] = []) {
  return values.some((value) => {
    const normalized = normalizeText(value);
    if (normalized.length < 2) return false;
    if (haystack === normalized) return true;
    return normalized.length >= 4 && (haystack.includes(normalized) || (haystack.length >= 4 && normalized.includes(haystack)));
  });
}

function getNodeGlobalReferences(node: ScenarioMapNode) {
  return nodeStockRules[node.id]?.globalReferences ?? [];
}

const nodeStockRules: Record<string, NodeStockRule> = {
  "llm-model": {
    domesticNames: ["NAVER", "솔트룩스", "코난테크놀로지", "마음AI", "폴라리스AI"],
    include: ["LLM", "초거대", "생성AI", "AI 검색", "AI검색", "검색엔진", "추론", "한국어 데이터", "언어모델"],
    excludeNames: ["카카오", "더존비즈온", "가비아", "카페24", "커넥트웨이브", "NHN KCP", "KG이니시스"],
    globalReferences: ["Microsoft", "Alphabet", "Meta Platforms", "OpenAI(비상장)", "Anthropic(비상장)"]
  },
  "ai-agent": {
    domesticNames: ["더존비즈온", "한글과컴퓨터", "이스트소프트", "마음AI", "셀바스AI", "폴라리스오피스", "브리지텍"],
    include: ["AI 에이전트", "에이전트", "업무자동화", "문서AI", "콜센터", "상담", "그룹웨어", "ERP", "운영 자동화"],
    excludeNames: ["NAVER", "카카오", "카페24", "커넥트웨이브"],
    globalReferences: ["Microsoft", "Salesforce", "ServiceNow", "Adobe", "Palantir"]
  },
  "ai-saas": {
    domesticNames: ["더존비즈온", "삼성에스디에스", "포스코DX", "현대오토에버", "가비아", "케이아이엔엑스", "영림원소프트랩"],
    include: ["SaaS", "ERP", "협업툴", "기업용 AI", "구독", "클라우드", "그룹웨어", "SI", "DX", "운영 자동화"],
    excludeNames: ["NAVER", "카카오", "카페24", "커넥트웨이브"],
    globalReferences: ["Salesforce", "ServiceNow", "Oracle", "Microsoft", "SAP"]
  },
  "data-platform": {
    domesticNames: ["솔트룩스", "코난테크놀로지", "와이즈넛", "데이타솔루션", "모아데이타", "씨이랩", "쿠콘"],
    include: ["데이터 플랫폼", "RAG", "벡터DB", "데이터 거버넌스", "관측성", "검색증강", "데이터 레이크"],
    excludeNames: ["NAVER", "카카오", "카페24", "커넥트웨이브"],
    globalReferences: ["Snowflake", "Datadog", "MongoDB", "Palantir", "Elastic"]
  },
  "ai-commerce": {
    domesticNames: ["카페24", "커넥트웨이브", "NHN KCP", "KG이니시스", "NAVER", "카카오"],
    include: ["AI 광고", "커머스", "추천", "쇼핑 검색", "광고 최적화", "개인화", "결제", "판매자 도구", "D2C", "온라인몰"],
    excludeNames: ["더존비즈온", "한글과컴퓨터", "가비아", "삼성에스디에스"],
    globalReferences: ["Amazon", "Shopify", "Meta Platforms", "Alphabet"]
  },
  humanoid: {
    domesticNames: ["레인보우로보틱스", "두산로보틱스", "현대차", "현대모비스"],
    preferredNames: ["레인보우로보틱스", "두산로보틱스"],
    include: ["휴머노이드", "피지컬AI", "피지컬 AI", "보스턴 다이내믹스", "보스턴다이내믹스", "로봇 플랫폼", "범용 로봇"],
    requiredKeywords: ["휴머노이드", "피지컬AI", "피지컬 AI", "보스턴 다이내믹스", "보스턴다이내믹스", "로봇 플랫폼", "범용 로봇", "레인보우로보틱스", "두산로보틱스", "현대차", "현대모비스"],
    excludeNames: ["로보티즈", "에스피지", "하이젠알앤엠", "에스비비테크", "해성티피씨", "현대로템", "LIG넥스원", "한화에어로스페이스", "한화시스템", "한국항공우주"],
    globalReferences: ["Tesla", "Figure AI(비상장)", "Boston Dynamics(비상장)", "Agility Robotics(비상장)"]
  },
  actuator: {
    domesticNames: ["로보티즈", "에스피지", "하이젠알앤엠", "에스비비테크", "해성티피씨"],
    preferredNames: ["에스피지", "하이젠알앤엠", "에스비비테크", "해성티피씨", "로보티즈"],
    include: ["액추에이터", "액츄에이터", "감속기", "정밀감속기", "서보", "서보모터", "모터", "구동모듈", "구동부", "로봇 관절"],
    requiredKeywords: ["액추에이터", "액츄에이터", "감속기", "정밀감속기", "서보", "서보모터", "구동모듈", "구동부", "로봇 관절", "에스피지", "하이젠알앤엠", "에스비비테크", "해성티피씨", "로보티즈"],
    excludeNames: ["레인보우로보틱스", "두산로보틱스", "현대차", "현대모비스", "현대로템", "한국항공우주", "한화에어로스페이스"],
    globalReferences: ["Harmonic Drive", "Nabtesco"]
  },
  "machine-vision": {
    domesticNames: ["고영", "뷰웍스", "라온피플", "옵트론텍", "코윈테크"],
    include: ["머신비전", "비전 AI", "검사장비", "산업용 카메라", "3D 센서", "공정 인식"],
    excludeNames: ["현대로템", "두산로보틱스", "레인보우로보틱스"],
    globalReferences: ["Cognex", "Keyence"]
  },
  "smart-factory": {
    domesticNames: ["로보스타", "코윈테크", "포스코DX", "현대오토에버", "아진엑스텍"],
    include: ["스마트팩토리", "공장 자동화", "물류 자동화", "협동로봇", "제조 자동화", "제어시스템"],
    excludeNames: ["현대로템", "NAVER", "카카오"],
    globalReferences: ["Rockwell Automation", "ABB", "Siemens"]
  },
  "robot-software": {
    domesticNames: ["현대오토에버", "포스코DX", "유진로봇", "트윔"],
    include: ["로봇 제어", "경로계획", "원격관제", "운영 소프트웨어", "AI 제어", "물류 자동화"],
    excludeNames: ["현대로템", "NAVER", "카카오", "한화에어로스페이스"],
    globalReferences: ["NVIDIA", "PTC", "Rockwell Automation"]
  }
};

const nodeKeywordMap: Record<string, string[]> = {
  "ai-infra-root": ["AI 인프라", "AI infrastructure", "GPU", "HBM", "데이터센터", "전력", "냉각", "네트워크"],
  "ai-accelerator": ["AI 가속기", "GPU", "NPU", "ASIC", "AI 반도체", "AI반도체", "가속기", "서버 보드"],
  networking: ["네트워크", "스위치", "라우터", "광트랜시버", "통신장비", "데이터센터", "IDC"],
  "llm-root": ["LLM", "생성AI", "AI 소프트웨어", "AI 서비스", "검색", "광고", "SaaS", "업무자동화"],
  "llm-model": ["LLM", "생성AI", "초거대", "AI 검색", "검색엔진", "언어모델", "NAVER", "솔트룩스", "코난테크놀로지", "마음AI", "폴라리스AI"],
  "ai-agent": ["AI 에이전트", "에이전트", "업무자동화", "문서AI", "콜센터", "상담", "더존비즈온", "한글과컴퓨터", "이스트소프트", "브리지텍", "셀바스AI"],
  "ai-saas": ["SaaS", "ERP", "협업툴", "기업용 AI", "구독", "클라우드", "그룹웨어", "SI", "DX", "더존비즈온", "삼성에스디에스", "포스코DX", "현대오토에버", "가비아"],
  "data-platform": ["데이터 플랫폼", "RAG", "벡터DB", "데이터 거버넌스", "데이터 레이크", "검색증강", "솔트룩스", "코난테크놀로지", "와이즈넛", "데이타솔루션", "모아데이타", "씨이랩"],
  "ai-commerce": ["AI 광고", "광고", "커머스", "추천", "쇼핑 검색", "결제", "개인화", "카페24", "커넥트웨이브", "NAVER", "카카오", "NHN KCP", "KG이니시스"],
  "physical-ai-root": ["피지컬AI", "피지컬 AI", "휴머노이드", "로봇 플랫폼", "보스턴 다이내믹스", "액추에이터", "머신비전", "협동로봇"],
  humanoid: ["휴머노이드", "피지컬AI", "보스턴 다이내믹스", "범용 로봇", "로봇 플랫폼", "레인보우로보틱스", "두산로보틱스", "현대차", "현대모비스"],
  "machine-vision": ["머신비전", "비전", "카메라", "센서", "고영", "뷰웍스", "라온피플"],
  "smart-factory": ["스마트팩토리", "공장 자동화", "협동로봇", "제조 자동화", "로보스타", "코윈테크", "포스코DX"],
  "robot-software": ["로봇 제어", "경로계획", "관제", "AI 제어", "현대오토에버", "포스코DX", "물류 자동화"],
  "edge-ai-root": ["온디바이스", "엣지AI", "AI PC", "AI폰", "저전력", "NPU", "모바일"],
  "edge-npu": ["NPU", "팹리스", "가온칩스", "텔레칩스", "칩스앤미디어", "AI반도체", "AI 반도체"],
  "ai-pc-mobile": ["AI PC", "AI폰", "온디바이스", "모바일", "삼성전자", "LG이노텍", "제주반도체"],
  "edge-sensor": ["센서", "카메라", "이미지센서", "LG이노텍", "자화전자", "옵트론텍"],
  "edge-automotive": ["차량용 반도체", "SDV", "ADAS", "텔레칩스", "현대모비스", "HL만도"],
  "ai-security-root": ["AI 보안", "보안", "사이버", "데이터 신뢰", "제로트러스트", "XDR"],
  "zero-trust": ["제로트러스트", "인증", "접근제어", "라온시큐어", "지니언스", "파수"],
  "cloud-security": ["클라우드 보안", "EDR", "XDR", "보안관제", "안랩", "윈스", "샌즈랩"],
  "data-governance": ["데이터 거버넌스", "개인정보", "데이터보안", "파수", "쿠콘", "데이터"],
  "ai-observability": ["AI 관측", "관측성", "모니터링", "로그", "데이터", "보안"],
  "semiconductor-root": ["반도체", "소부장", "장비", "소재", "부품", "테스트", "파운드리"],
  "memory-foundry": ["메모리", "파운드리", "DRAM", "NAND", "DB하이텍", "가온칩스", "삼성전자", "SK하이닉스"],
  "semicap-equipment": ["반도체 장비", "증착", "식각", "세정", "원익IPS", "주성엔지니어링", "유진테크", "테스"],
  "semicap-materials": ["반도체 소재", "소재", "포토레지스트", "쿼츠", "솔브레인", "동진쎄미켐", "티씨케이"],
  "test-probe": ["테스트", "소켓", "프로브", "리노공업", "ISC", "티에스이", "월덱스"],
  "auto-root": ["자동차", "SDV", "전장", "자율주행", "소프트웨어", "전동화"],
  sdv: ["SDV", "소프트웨어", "현대오토에버", "자율주행", "OTA", "차량 OS"],
  adas: ["ADAS", "센서", "카메라", "라이다", "현대모비스", "HL만도", "자율주행"],
  powertrain: ["전동화", "모터", "인버터", "전력반도체", "현대모비스", "SNT모티브"],
  hybrid: ["하이브리드", "전동화", "현대차", "기아", "현대모비스", "파워트레인"],
  "consumer-root": ["K뷰티", "K-푸드", "엔터", "콘텐츠", "소비재", "수출", "브랜드"],
  beauty: ["화장품", "K뷰티", "ODM", "한국콜마", "코스맥스", "아모레퍼시픽", "실리콘투"],
  food: ["식품", "라면", "K-푸드", "삼양식품", "농심", "CJ제일제당", "오리온"],
  entertainment: ["엔터", "콘텐츠", "IP", "음악", "하이브", "JYP", "와이지엔터", "에스엠"],
  "game-media": ["게임", "미디어", "콘텐츠", "크래프톤", "넷마블", "카카오게임즈", "스튜디오드래곤"],
  ai: ["AI", "인공지능", "클라우드", "서버", "데이터센터", "NPU", "GPU", "AI 인프라"],
  hbm: ["HBM", "DRAM", "D램", "메모리", "고대역폭", "SK하이닉스", "삼성전자", "마이크론"],
  substrate: ["기판", "PCB", "FC-BGA", "ABF", "MLCC", "삼성전기", "이수페타시스", "대덕전자"],
  packaging: ["패키징", "본딩", "CoWoS", "테스트", "소켓", "반도체 장비", "한미반도체", "리노공업", "HPSP"],
  datacenter: ["데이터센터", "서버", "클라우드", "네트워크", "IDC", "GPU", "NAVER", "카카오"],
  power: ["전력", "전력기기", "변압기", "차단기", "전선", "케이블", "원전", "SMR", "일렉트릭"],
  cooling: ["냉각", "액침", "CDU", "열관리", "공조", "HVAC", "Vertiv", "케이엔솔"],
  robot: ["휴머노이드", "피지컬AI", "액추에이터", "액츄에이터", "감속기", "서보", "협동로봇", "로보티즈", "레인보우로보틱스", "두산로보틱스"],
  aerospace: ["우주", "항공", "위성", "발사체", "방산", "항공우주", "한화에어로스페이스", "LIG넥스원"],
  security: ["보안", "사이버", "인증", "제로트러스트", "CrowdStrike", "팔로알토"],
  missile: ["유도무기", "미사일", "방공", "LIG넥스원", "한화에어로스페이스"],
  ground: ["지상무기", "전차", "장갑차", "자주포", "현대로템", "한화에어로스페이스"],
  "aero-engine": ["항공엔진", "엔진", "항공", "한화에어로스페이스", "한국항공우주"],
  satellite: ["위성", "정찰", "SAR", "쎄트렉아이", "컨텍"],
  electronics: ["방산전자", "레이더", "전자전", "보안", "통신"],
  launch: ["발사체", "로켓", "추진체", "발사 서비스"],
  "satellite-manufacturing": ["위성 제조", "소형위성", "탑재체", "쎄트렉아이", "AP위성"],
  "space-components": ["탑재체", "전자광학", "우주용", "부품"],
  "ground-station": ["지상국", "안테나", "관제", "게이트웨이", "컨텍"],
  "leo-communication": ["위성통신", "저궤도", "LEO", "안테나", "통신"],
  "earth-observation": ["관측", "SAR", "지리정보", "위성 영상", "AI 분석"],
  "defense-space": ["국방 우주", "정찰", "보안 통신", "위성항법"],
  "lunar-logistics": ["달", "탐사", "착륙", "우주 로봇", "항공우주"],
  cdmo: ["CDMO", "위탁생산", "바이오로직스", "삼성바이오로직스", "셀트리온"],
  biosimilar: ["바이오시밀러", "셀트리온", "삼성바이오에피스"],
  adc: ["ADC", "항체", "항암", "리가켐바이오", "알테오젠"],
  obesity: ["비만", "대사", "GLP", "당뇨"],
  device: ["의료기기", "진단", "소모품"],
  lng: ["LNG", "선박", "조선", "운반선", "한국조선해양", "한화오션", "삼성중공업"],
  engine: ["선박엔진", "엔진", "추진시스템", "HD현대마린엔진"],
  equipment: ["기자재", "밸브", "펌프", "조선기자재"],
  offshore: ["해양플랜트", "플랜트", "FPSO"],
  steel: ["후판", "철강", "소재", "POSCO", "현대제철"],
  transformer: ["변압기", "전력기기", "HD현대일렉트릭", "효성중공업"],
  breaker: ["차단기", "배전", "전력기기", "LS ELECTRIC"],
  cable: ["전선", "케이블", "LS", "대한전선"],
  smr: ["원전", "SMR", "두산에너빌리티"],
  cell: ["셀", "배터리", "LG에너지솔루션", "삼성SDI", "SK온"],
  cathode: ["양극재", "전구체", "에코프로", "포스코퓨처엠", "엘앤에프"],
  separator: ["분리막", "소재"],
  batteryEquipment: ["장비", "배터리 장비", "피엔티", "윤성에프앤씨"],
  ess: ["ESS", "에너지저장", "전력저장"],
  recycling: ["재활용", "리사이클", "폐배터리"],
  actuator: ["액추에이터", "액츄에이터", "감속기", "정밀감속기", "서보", "서보모터", "구동모듈", "구동부", "로보티즈", "에스피지", "하이젠알앤엠", "에스비비테크", "해성티피씨"],
  vision: ["머신비전", "비전", "카메라"],
  smartFactory: ["스마트팩토리", "자동화", "공장"],
  control: ["AI 제어", "제어", "소프트웨어"],
  housing: ["주택", "토목", "건설", "현대건설", "DL이앤씨"],
  materials: ["건자재", "시멘트", "철근", "레미콘"],
  machinery: ["건설기계", "굴삭기", "두산밥캣"],
  plant: ["플랜트", "EPC", "건설"],
  bank: ["은행", "금융지주", "KB금융", "신한지주", "하나금융"],
  insurance: ["보험", "손해보험", "생명보험"],
  securities: ["증권", "브로커리지"],
  holding: ["지주", "배당", "자사주"],
  search: ["검색", "광고", "NAVER", "카카오"],
  commerce: ["커머스", "쇼핑", "유통"],
  cloud: ["클라우드", "IDC", "데이터센터"],
  content: ["콘텐츠", "웹툰", "게임", "미디어"],
  subscription: ["구독", "플랫폼"],
  refining: ["정유", "가스", "에너지"],
  chemical: ["화학", "석유화학"],
  metal: ["철강", "비철", "구리", "알루미늄"],
  grid: ["전력망", "송배전", "전선", "변압기"]
};

function getFlowStatus(averageChange: number, breadth: number, count: number): FlowStatus {
  if (!count) return "관찰";
  if (averageChange >= 1.5 && breadth >= 55) return "강세";
  if (averageChange >= 0.35 && breadth >= 45) return "강세전환";
  if (averageChange <= -1.5 && breadth <= 45) return "약세";
  if (averageChange <= -0.35 && breadth <= 50) return "약세전환";
  return "관찰";
}

function getFlowStatusTone(status: FlowStatus) {
  if (status === "강세") return "border-red-200 bg-red-50 text-red-700";
  if (status === "강세전환") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "약세") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "약세전환") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getNodeRelatedStocks(node: ScenarioMapNode, scenario: Scenario, stocks: Stock[]) {
  const isRootNode = node.id === scenario.nodes[0]?.id;
  const rule = !isRootNode ? nodeStockRules[node.id] : undefined;
  const normalizedNodeLabel = normalizeText(node.label);
  const normalizedNodeTheme = normalizeText(node.theme);
  const normalizedEtf = normalizeText("ETF");
  const nodeKeywords = Array.from(new Set([
    node.id,
    node.label,
    node.theme,
    node.description,
    ...(nodeKeywordMap[node.id] ?? [])
  ]));
  const normalizedKeywords = nodeKeywords.map(normalizeText).filter((keyword) => keyword.length >= 2);
  const normalizedRuleKeywords = (rule?.include ?? []).map(normalizeText).filter((keyword) => keyword.length >= 2);
  const normalizedRequiredKeywords = (rule?.requiredKeywords ?? rule?.include ?? [])
    .map(normalizeText)
    .filter((keyword) => keyword.length >= 2);
  const scenarioKeywords = [
    scenario.name,
    scenario.description,
    ...scenario.coreValueChains,
    ...scenario.nodes.map((item) => item.label),
    ...scenario.nodes.map((item) => item.theme)
  ].map(normalizeText);
  const rootKey = normalizeText(`${scenario.name} ${scenario.description}`);
  const scenarioPool = getMatchedScenarioStocks(scenario, stocks);
  const candidateStocks = rule ? stocks.filter(isDomesticMarket) : scenarioPool.length ? scenarioPool : stocks;

  const scored = candidateStocks
    .map((stock) => {
      const stockIsEtf = isEtf(stock);
      const stockName = normalizeText(stock.name);
      const stockSector = normalizeText(stock.sector);
      const stockTheme = normalizeText(stock.theme);
      const haystack = normalizeText(`${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme}`);
      const keywordHits = normalizedKeywords.filter((keyword) => haystack.includes(keyword));
      const ruleKeywordHits = normalizedRuleKeywords.filter((keyword) => haystack.includes(keyword));
      const directRuleHit = rule ? matchesNormalizedValue(stockName, rule.domesticNames) : false;
      const preferredRuleHit = rule ? matchesNormalizedValue(stockName, rule.preferredNames) : false;
      const excludedByRule = rule ? matchesNormalizedValue(stockName, rule.excludeNames) : false;
      const requiredKeywordHit = normalizedRequiredKeywords.some((keyword) => haystack.includes(keyword));
      const reverseThemeHit =
        stockTheme.length >= 2 && normalizedKeywords.some((keyword) => keyword.includes(stockTheme) || stockTheme.includes(keyword));
      const themeHit = stockTheme === normalizedNodeTheme || stockSector.includes(normalizedNodeTheme) || stockName.includes(normalizedNodeTheme);
      const sectorLabelHit = stockSector.includes(normalizedNodeLabel) || stockName.includes(normalizedNodeLabel);
      const broadEtfOnly = stockIsEtf && stockTheme === normalizedEtf && stockSector === normalizedEtf;
      const rootHit = isRootNode && (scenarioKeywords.some((keyword) => haystack.includes(keyword) || keyword.includes(stockTheme)) || haystack.includes(rootKey));
      const strongRuleSignal =
        !rule ||
        preferredRuleHit ||
        directRuleHit ||
        requiredKeywordHit ||
        ruleKeywordHits.length > 0 ||
        ((sectorLabelHit || themeHit) && keywordHits.length > 0);
      const score = rule
        ? (excludedByRule ? -140 : 0) +
          (preferredRuleHit ? 112 : 0) +
          (directRuleHit ? 76 : 0) +
          (requiredKeywordHit ? 34 : 0) +
          ruleKeywordHits.length * (stockIsEtf ? 8 : 18) +
          keywordHits.length * (stockIsEtf ? 3 : 5) +
          (sectorLabelHit ? (stockIsEtf ? 12 : 18) : 0) +
          (themeHit && requiredKeywordHit ? (stockIsEtf ? 6 : 8) : 0) +
          (isDomesticMarket(stock) ? 6 : 0) -
          (stockIsEtf ? 20 : 0) -
          (broadEtfOnly ? 24 : 0)
        : keywordHits.length * (stockIsEtf ? 18 : 24) +
          (sectorLabelHit ? (stockIsEtf ? 34 : 30) : 0) +
          (themeHit ? (isRootNode ? 18 : stockIsEtf ? 34 : 14) : 0) +
          (reverseThemeHit ? (stockIsEtf ? 12 : 6) : 0) +
          (rootHit ? 16 : 0) +
          (isDomesticMarket(stock) ? 4 : 0) -
          (!isRootNode && broadEtfOnly ? 40 : 0);

      return { stock, score, strongRuleSignal };
    })
    .filter((item) => {
      if (rule) {
        if (!item.strongRuleSignal) return false;
        if (item.score < 0) return false;
        if (isEtf(item.stock)) return item.score >= 34;
        return item.score >= 46;
      }
      if (isRootNode) return item.score >= 16;
      if (isEtf(item.stock)) return item.score >= 18;
      return item.score >= 24;
    });

  const fallback = !scored.length && !isRootNode && !rule
    ? candidateStocks
        .filter((stock) => {
          if (isEtf(stock) && normalizeText(stock.theme) === normalizedEtf && normalizeText(stock.sector) === normalizedEtf) {
            return false;
          }
          return normalizeText(stock.theme) === normalizedNodeTheme || normalizeText(stock.sector).includes(normalizedNodeTheme);
        })
        .map((stock) => ({ stock, score: 12 + (isEtf(stock) ? 4 : 0) + (isDomesticMarket(stock) ? 4 : 0) }))
    : scored;

  return Array.from(new Map(fallback.map((item) => [item.stock.id, item])).values()).sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff) return scoreDiff;
    const aStock = a.stock;
    const bStock = b.stock;
    const rankDiff = stockRank(aStock) - stockRank(bStock);
    if (rankDiff) return rankDiff;
    return Math.abs(getStockMove(bStock)) - Math.abs(getStockMove(aStock));
  }).map((item) => item.stock);
}

function summarizeNode(node: ScenarioMapNode, scenario: Scenario, stocks: Stock[]) {
  const related = getNodeRelatedStocks(node, scenario, stocks);
  const commonStocks = related.filter(isCommonStock);
  const etfStocks = related.filter(isEtf);
  const domesticNames = new Set(related.map((stock) => normalizeText(stock.name)));
  const globalReferences = getNodeGlobalReferences(node)
    .filter((reference) => !domesticNames.has(normalizeText(reference)))
    .slice(0, 5);
  const averageChange = related.length
    ? related.reduce((sum, stock) => sum + getStockMove(stock), 0) / related.length
    : 0;
  const breadth = getBreadth(related);
  const leader = commonStocks[0] ?? etfStocks[0] ?? related[0];

  return {
    stocks: related,
    commonStocks,
    etfStocks,
    relatedCount: related.length,
    averageChange,
    breadth,
    status: getFlowStatus(averageChange, breadth, related.length),
    leader,
    globalReferences
  };
}

function getLinkedChainStocks(chain: LinkedValueChain, stocks: Stock[]) {
  const keywords = chain.stockKeywords.map(normalizeText).filter((keyword) => keyword.length >= 2);

  return stocks
    .map((stock) => {
      const stockName = normalizeText(stock.name);
      const haystack = normalizeText(`${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme}`);
      const hits = keywords.filter((keyword) => haystack.includes(keyword) || keyword.includes(stockName));
      const score =
        hits.length * 20 +
        (stock.market === "KOSPI" || stock.market === "KOSDAQ" ? 6 : 0) -
        (isEtf(stock) ? 6 : 0);

      return { stock, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff) return scoreDiff;
      const rankDiff = stockRank(a.stock) - stockRank(b.stock);
      if (rankDiff) return rankDiff;
      return Math.abs(getStockMove(b.stock)) - Math.abs(getStockMove(a.stock));
    })
    .map((item) => item.stock);
}

function summarizeLinkedChain(chain: LinkedValueChain, stocks: Stock[]) {
  const related = Array.from(new Map(getLinkedChainStocks(chain, stocks).map((stock) => [stock.id, stock])).values());
  const commonStocks = related.filter(isCommonStock);
  const etfStocks = related.filter(isEtf);
  const averageChange = related.length
    ? related.reduce((sum, stock) => sum + getStockMove(stock), 0) / related.length
    : 0;

  return {
    related,
    commonStocks,
    etfStocks,
    averageChange,
    leader: commonStocks[0] ?? etfStocks[0] ?? related[0]
  };
}

function getTimingLabel(timing: LinkedValueChain["timing"]) {
  if (timing === "leading") return "선행";
  if (timing === "lagging") return "후행";
  return "동행";
}

function getSensitivityLabel(sensitivity: LinkedValueChain["sensitivity"]) {
  if (sensitivity === "high") return "민감도 높음";
  if (sensitivity === "low") return "민감도 낮음";
  return "민감도 중간";
}

function getSensitivityTone(sensitivity: LinkedValueChain["sensitivity"]) {
  if (sensitivity === "high") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200";
  }
  if (sensitivity === "low") {
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200";
}

function getEdgeLabel(scenario: Scenario, node: ScenarioMapNode) {
  const incoming = scenario.edges.find((edge) => edge.to === node.id);
  if (!incoming) return "핵심 축";
  if (incoming.from === scenario.nodes[0]?.id) return "직접 수혜";
  return "확산 경로";
}

function getOrderedNodes(scenario: Scenario) {
  const root = scenario.nodes[0];
  const directIds = scenario.edges.filter((edge) => edge.from === root.id).map((edge) => edge.to);
  const directNodes = directIds
    .map((id) => scenario.nodes.find((node) => node.id === id))
    .filter((node): node is ScenarioMapNode => Boolean(node));
  const remainingNodes = scenario.nodes.filter((node) => node.id !== root.id && !directIds.includes(node.id));
  return [...directNodes, ...remainingNodes];
}

function buildTodayFlowItems(stocks: Stock[]) {
  return scenarios
    .flatMap((scenario) =>
      scenario.nodes.map((node, index) => ({
        id: `${scenario.id}-${node.id}`,
        scenario,
        node,
        kind: index === 0 ? "핵심산업" as const : "세부산업" as const,
        ...summarizeNode(node, scenario, stocks)
      }))
    )
    .filter((item) => item.relatedCount > 0);
}

type IndexedStock = {
  stock: Stock;
  haystack: string;
  name: string;
  sector: string;
  theme: string;
};

function indexStocks(stocks: Stock[]): IndexedStock[] {
  return stocks.map((stock) => ({
    stock,
    haystack: normalizeText(`${stock.name} ${stock.ticker} ${stock.sector} ${stock.theme}`),
    name: normalizeText(stock.name),
    sector: normalizeText(stock.sector),
    theme: normalizeText(stock.theme)
  }));
}

function summarizeStocksLight(relatedStocks: Stock[]): ScenarioNodeSummary {
  const related = Array.from(new Map(relatedStocks.map((stock) => [stock.id, stock])).values()).sort((a, b) => {
    const rankDiff = stockRank(a) - stockRank(b);
    if (rankDiff) return rankDiff;
    return getStockMove(b) - getStockMove(a);
  });
  const commonStocks = related.filter(isCommonStock);
  const etfStocks = related.filter(isEtf);
  const averageChange = related.length
    ? related.reduce((sum, stock) => sum + getStockMove(stock), 0) / related.length
    : 0;
  const breadth = getBreadth(related);

  return {
    stocks: related,
    commonStocks,
    etfStocks,
    relatedCount: related.length,
    averageChange,
    breadth,
    status: getFlowStatus(averageChange, breadth, related.length),
    leader: commonStocks[0] ?? etfStocks[0] ?? related[0],
    globalReferences: []
  };
}

function getLightNodeStocks(node: ScenarioMapNode, scenario: Scenario, indexedStocks: IndexedStock[]) {
  if (node.id === scenario.nodes[0]?.id) {
    return indexedStocks.map((item) => item.stock);
  }

  const rule = nodeStockRules[node.id];
  const ruleKeywords = (rule?.include ?? []).map(normalizeText).filter((keyword) => keyword.length >= 2);
  const requiredKeywords = (rule?.requiredKeywords ?? rule?.include ?? [])
    .map(normalizeText)
    .filter((keyword) => keyword.length >= 2);
  const keywords = Array.from(new Set([
    node.id,
    node.label,
    node.theme,
    node.description,
    ...(nodeKeywordMap[node.id] ?? []),
    ...(rule?.include ?? [])
  ]))
    .map(normalizeText)
    .filter((keyword) => keyword.length >= 2);
  const normalizedLabel = normalizeText(node.label);
  const normalizedTheme = normalizeText(node.theme);
  const matched = indexedStocks
    .map((item) => {
      const directRuleHit = rule ? matchesNormalizedValue(item.name, rule.domesticNames) : false;
      const preferredRuleHit = rule ? matchesNormalizedValue(item.name, rule.preferredNames) : false;
      const excludedByRule = rule ? matchesNormalizedValue(item.name, rule.excludeNames) : false;
      const keywordHits = keywords.filter((keyword) => item.haystack.includes(keyword));
      const ruleKeywordHits = ruleKeywords.filter((keyword) => item.haystack.includes(keyword));
      const requiredKeywordHit = requiredKeywords.some((keyword) => item.haystack.includes(keyword));
      const labelHit = normalizedLabel.length >= 2 && (item.sector.includes(normalizedLabel) || item.name.includes(normalizedLabel));
      const themeHit = normalizedTheme.length >= 2 && (item.theme === normalizedTheme || item.sector.includes(normalizedTheme));
      const reverseThemeHit = item.theme.length >= 2 && keywords.some((keyword) => keyword.includes(item.theme));
      const ruleSignal = !rule || preferredRuleHit || directRuleHit || requiredKeywordHit || ruleKeywordHits.length > 0 || (labelHit && keywordHits.length > 0);
      const score =
        (preferredRuleHit ? 108 : 0) +
        (directRuleHit ? 72 : 0) +
        (requiredKeywordHit ? 34 : 0) +
        ruleKeywordHits.length * (isEtf(item.stock) ? 6 : 18) +
        keywordHits.length * (isEtf(item.stock) ? 4 : rule ? 6 : 14) +
        (labelHit ? 18 : 0) +
        (themeHit && (!rule || requiredKeywordHit) ? 14 : 0) +
        (!rule && reverseThemeHit ? 8 : 0) +
        (isDomesticMarket(item.stock) ? 4 : 0) -
        (excludedByRule ? 120 : 0) -
        (isEtf(item.stock) ? 8 : 0);

      return { ...item, score, ruleSignal, excludedByRule };
    })
    .filter((item) => {
      if (!rule) return item.score >= 16;
      if (!item.ruleSignal || item.excludedByRule) return false;
      if (isEtf(item.stock)) return item.score >= 34;
      return item.score >= 44;
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff) return scoreDiff;
      const rankDiff = stockRank(a.stock) - stockRank(b.stock);
      if (rankDiff) return rankDiff;
      return getStockMove(b.stock) - getStockMove(a.stock);
    })
    .map((item) => item.stock);

  if (matched.length) return matched;
  if (rule) return [];

  return indexedStocks
    .filter((item) => item.theme === normalizedTheme || item.sector.includes(normalizedTheme))
    .map((item) => item.stock);
}

function getStrongStocksForNode(summary: ScenarioNodeSummary) {
  const candidates = prioritizeDomesticStocks(summary.commonStocks)
    .filter((stock) => isDomesticMarket(stock) && isCommonStock(stock))
    .sort((a, b) => getStockMove(b) - getStockMove(a));
  const positiveStocks = candidates.filter((stock) => getStockMove(stock) > 0);
  const relativeLeaders = candidates.filter((stock) => getStockMove(stock) >= summary.averageChange);
  const pool = positiveStocks.length ? positiveStocks : relativeLeaders.length ? relativeLeaders : candidates;

  return pool.slice(0, 3);
}

function getScenarioStocksLight(scenario: Scenario, indexedStocks: IndexedStock[]) {
  const scenarioKeywords = Array.from(new Set([
    scenario.name,
    scenario.description,
    ...scenario.coreValueChains,
    ...scenario.nodes.flatMap((node) => [node.label, node.theme])
  ]))
    .map(normalizeText)
    .filter((keyword) => keyword.length >= 2);
  const matched = indexedStocks
    .map((item) => {
      const keywordHits = scenarioKeywords.filter((keyword) => item.haystack.includes(keyword));
      const themeHit = item.theme.length >= 2 && scenarioKeywords.some((keyword) => keyword.includes(item.theme));
      const score =
        keywordHits.length * (isEtf(item.stock) ? 8 : 14) +
        (themeHit ? 10 : 0) +
        (isDomesticMarket(item.stock) ? 4 : 0) -
        (isEtf(item.stock) ? 4 : 0);

      return { ...item, score };
    })
    .filter((item) => item.score >= 10)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff) return scoreDiff;
      const rankDiff = stockRank(a.stock) - stockRank(b.stock);
      if (rankDiff) return rankDiff;
      return getStockMove(b.stock) - getStockMove(a.stock);
    });

  return matched.length ? matched : indexedStocks.filter((item) => isDomesticMarket(item.stock));
}

function buildScenarioOverview(scenario: Scenario, indexedStocks: IndexedStock[]): ScenarioOverview {
  const indexedScenarioStocks = getScenarioStocksLight(scenario, indexedStocks);
  const nodeOverviews = scenario.nodes.map((node) => {
    const nodeCandidateStocks = nodeStockRules[node.id] ? indexedStocks : indexedScenarioStocks;
    const summary = summarizeStocksLight(getLightNodeStocks(node, scenario, nodeCandidateStocks));

    return {
      scenario,
      node,
      summary,
      strongStocks: getStrongStocksForNode(summary)
    };
  });
  const relatedStockMap = new Map<string, Stock>();
  const strongStockMap = new Map<string, Stock>();

  nodeOverviews.forEach((overview) => {
    overview.summary.stocks.forEach((stock) => relatedStockMap.set(stock.id, stock));
    overview.strongStocks.forEach((stock) => strongStockMap.set(stock.id, stock));
  });

  const relatedStocks = Array.from(relatedStockMap.values());
  const strongStocks = Array.from(strongStockMap.values()).sort((a, b) => getStockMove(b) - getStockMove(a));
  const averageChange = relatedStocks.length
    ? relatedStocks.reduce((sum, stock) => sum + getStockMove(stock), 0) / relatedStocks.length
    : 0;
  const breadth = getBreadth(relatedStocks);
  const topNodes = nodeOverviews
    .filter((overview) => overview.summary.relatedCount > 0)
    .sort((a, b) => b.summary.averageChange - a.summary.averageChange)
    .slice(0, 4);

  return {
    scenario,
    nodeOverviews,
    topNodes,
    strongStocks,
    relatedCount: relatedStocks.length,
    averageChange,
    breadth,
    status: getFlowStatus(averageChange, breadth, relatedStocks.length),
    entryNode: topNodes[0]?.node ?? scenario.nodes[0]
  };
}

function buildScenarioOverviews(stocks: Stock[]) {
  const indexedStocks = indexStocks(stocks);

  return scenarios
    .map((scenario) => buildScenarioOverview(scenario, indexedStocks))
    .sort((a, b) => {
      const changeDiff = b.averageChange - a.averageChange;
      if (changeDiff) return changeDiff;
      const stockDiff = b.strongStocks.length - a.strongStocks.length;
      if (stockDiff) return stockDiff;
      return b.relatedCount - a.relatedCount;
    });
}

function getScenarioNodeDedupeKey(item: ScenarioNodeOverview) {
  const canonicalLabel = getCanonicalNodeLabel(item.node.label);
  const normalizedLabel = normalizeText(canonicalLabel);

  if (normalizedLabel === normalizeText("액추에이터") || normalizedLabel === normalizeText("액추에이터감속기")) {
    return "robot-actuator";
  }

  return `${normalizedLabel}:${normalizeText(item.node.description)}`;
}

function getScenarioNodePriority(item: ScenarioNodeOverview) {
  const leaderMove = item.summary.leader ? getStockMove(item.summary.leader) : 0;

  return (
    item.strongStocks.length * 1000 +
    item.summary.relatedCount * 10 +
    Math.max(item.summary.averageChange, 0) +
    Math.max(leaderMove, 0)
  );
}

function dedupeScenarioNodeOverviews(items: ScenarioNodeOverview[]) {
  const deduped = new Map<string, ScenarioNodeOverview>();

  items.forEach((item) => {
    const key = getScenarioNodeDedupeKey(item);
    const previous = deduped.get(key);

    if (!previous || getScenarioNodePriority(item) > getScenarioNodePriority(previous)) {
      deduped.set(key, item);
    }
  });

  return Array.from(deduped.values());
}

function ScenarioSpotlightCard({ item }: { item: ScenarioNodeOverview }) {
  const topStocks = item.strongStocks.length ? item.strongStocks : item.summary.commonStocks.slice(0, 5);
  const etfNames = item.summary.etfStocks.slice(0, 3).map((stock) => stock.name);
  const referenceNames = [...etfNames, ...item.summary.globalReferences].slice(0, 4);
  const displayLabel = getCanonicalNodeLabel(item.node.label);

  return (
    <Link
      to={`/scenario?scenario=${item.scenario.id}&node=${item.node.id}`}
      className="group flex min-h-[420px] flex-col rounded-lg border border-radar-line bg-slate-50 p-4 transition hover:border-blue-400 hover:bg-blue-50/70 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black text-blue-600 dark:text-blue-300">{item.scenario.name}</p>
          <h3 className="mt-1 break-keep text-xl font-black leading-7 text-radar-ink">{displayLabel}</h3>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-black", getMarketMoveBadgeClass(item.summary.averageChange))}>
          {formatPercent(item.summary.averageChange)}
        </span>
      </div>
      <p className="mt-3 min-h-[44px] break-keep text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
        {item.node.description}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2 max-sm:grid-cols-2">
        <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
          <p className="text-[10px] font-black text-slate-400">관련</p>
          <p className="mt-1 text-sm font-black text-radar-ink">{item.summary.relatedCount}</p>
        </div>
        <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
          <p className="text-[10px] font-black text-slate-400">일반</p>
          <p className="mt-1 text-sm font-black text-radar-ink">{item.summary.commonStocks.length}</p>
        </div>
        <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
          <p className="text-[10px] font-black text-slate-400">ETF</p>
          <p className="mt-1 text-sm font-black text-radar-ink">{item.summary.etfStocks.length}</p>
        </div>
        <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
          <p className="text-[10px] font-black text-slate-400">상승비중</p>
          <p className="mt-1 text-sm font-black text-radar-ink">{Math.round(item.summary.breadth)}%</p>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-white px-3 py-2 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black text-slate-400">대표 움직임</p>
          <span className={cn("text-xs font-black", getMarketMoveTextClass(item.summary.averageChange))}>
            평균 {formatPercent(item.summary.averageChange)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-black text-radar-ink">
          {item.summary.leader ? item.summary.leader.name : "대표 종목 대기"}
          {item.summary.leader ? (
            <span className={cn("ml-1", getMarketMoveTextClass(getStockMove(item.summary.leader)))}>
              {formatPercent(getStockMove(item.summary.leader))}
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-3 rounded-md bg-white p-3 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-radar-ink">강세 후보 종목</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {topStocks.length}개 표시
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {topStocks.slice(0, 5).map((stock) => (
            <div key={stock.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-radar-ink">{stock.name}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {stock.ticker} · {stock.market}
                </p>
              </div>
              <span className={cn("shrink-0 text-xs font-black", getMarketMoveTextClass(getStockMove(stock)))}>
                {formatPercent(getStockMove(stock))}
              </span>
            </div>
          ))}
          {!topStocks.length ? (
            <div className="rounded bg-slate-50 px-2 py-2 text-xs font-bold text-slate-500 dark:bg-slate-800">
              강세 후보 종목을 관찰 중입니다.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {referenceNames.map((name) => (
          <span key={name} className="rounded-md bg-white px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            {name}
          </span>
        ))}
        {!referenceNames.length ? (
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900">
            참고 ETF·해외축 대기
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-radar-line pt-3 text-xs font-black text-blue-600 dark:border-slate-700 dark:text-blue-300">
        <span>세부 흐름 보기</span>
        <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ScenarioIndexPage({ overviews }: { overviews: ScenarioOverview[] }) {
  const [filterScenarioId, setFilterScenarioId] = useState("all");
  const filteredOverviews = useMemo(() => {
    if (filterScenarioId === "all") return overviews;
    return overviews.filter((overview) => overview.scenario.id === filterScenarioId);
  }, [filterScenarioId, overviews]);
  const selectedOverview = filteredOverviews[0];
  const filterLabel = filterScenarioId === "all" ? "전체 산업" : selectedOverview?.scenario.name ?? "선택 산업";
  const spotlightNodes = useMemo(
    () => {
      const uniqueNodes = dedupeScenarioNodeOverviews(
        filteredOverviews.flatMap((overview) => overview.nodeOverviews.filter((item) => item.summary.relatedCount > 0))
      );

      return uniqueNodes
        .sort((a, b) => {
          const strongDiff = b.strongStocks.length - a.strongStocks.length;
          if (strongDiff) return strongDiff;
          const changeDiff = b.summary.averageChange - a.summary.averageChange;
          if (changeDiff) return changeDiff;
          return b.summary.relatedCount - a.summary.relatedCount;
        })
        .slice(0, filterScenarioId === "all" ? 16 : 18);
    },
    [filterScenarioId, filteredOverviews]
  );
  const strongStockCount = new Set(filteredOverviews.flatMap((overview) => overview.strongStocks.map((stock) => stock.id))).size;
  const totalRelatedCount = filteredOverviews.reduce((sum, overview) => sum + overview.relatedCount, 0);
  const visibleSectorCount = dedupeScenarioNodeOverviews(
    filteredOverviews.flatMap((overview) => overview.nodeOverviews.filter((item) => item.summary.relatedCount > 0))
  ).length;
  const averageScenarioMove = filteredOverviews.length
    ? filteredOverviews.reduce((sum, overview) => sum + overview.averageChange, 0) / filteredOverviews.length
    : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-blue-600 dark:text-blue-300">산업 시나리오 메인</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-radar-ink">
              세부 섹터 강세와 전환 흐름을 먼저 봅니다
            </h2>
            <p className="mt-2 break-keep text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              드롭다운으로 산업을 좁혀 보고, 세부 섹터 카드를 선택하면 해당 산업의 상세 흐름으로 이동합니다. 관련종목은 세부 섹터 안에서 상대적으로 강한 종목만 먼저 보여줍니다.
            </p>
          </div>
          <div className="min-w-[340px] max-w-md flex-1 max-sm:min-w-0">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400" htmlFor="scenario-main-filter">
              산업 시나리오 선택
            </label>
            <select
              id="scenario-main-filter"
              value={filterScenarioId}
              onChange={(event) => setFilterScenarioId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-black text-radar-ink outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">전체 산업 시나리오</option>
              {overviews.map((overview) => (
                <option key={overview.scenario.id} value={overview.scenario.id}>
                  {overview.scenario.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              선택한 범위: <span className="font-black text-radar-ink">{filterLabel}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2 max-2xl:grid-cols-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">산업군</p>
            <p className="mt-1 text-xl font-black text-radar-ink">{filteredOverviews.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">세부 섹터</p>
            <p className="mt-1 text-xl font-black text-radar-ink">{visibleSectorCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">관련 종목</p>
            <p className="mt-1 text-xl font-black text-radar-ink">{totalRelatedCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">강세 후보</p>
            <p className="mt-1 text-xl font-black text-radar-ink">{strongStockCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">평균 흐름</p>
            <p className={cn("mt-1 text-xl font-black", getMarketMoveTextClass(averageScenarioMove))}>
              {formatPercent(averageScenarioMove)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-radar-ink">오늘 눈에 띄는 세부 섹터</h2>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {filterLabel} 안에서 움직임이 큰 세부 섹터를 넓은 카드로 펼쳐 봅니다. 종목 구성, 강세 후보, ETF/해외 참고축까지 한 번에 확인합니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            세부 섹터 {spotlightNodes.length}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 max-2xl:grid-cols-2 max-lg:grid-cols-1">
          {spotlightNodes.map((item) => (
            <ScenarioSpotlightCard key={`${item.scenario.id}-${item.node.id}`} item={item} />
          ))}
        </div>
      </section>

    </div>
  );
}

function TodayFlowStrip({
  items,
  onSelect
}: {
  items: TodayFlowItem[];
  onSelect: (scenarioId: string, nodeId: string) => void;
}) {
  const strongItems = items
    .filter((item) => item.status === "강세" || item.status === "강세전환")
    .sort((a, b) => b.averageChange - a.averageChange)
    .slice(0, 8);
  const weakItems = items
    .filter((item) => item.status === "약세" || item.status === "약세전환")
    .sort((a, b) => a.averageChange - b.averageChange)
    .slice(0, 8);

  const renderRow = (title: string, description: string, rowItems: TodayFlowItem[], emptyText: string) => (
    <div className="rounded-lg border border-radar-line bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-radar-ink">{title}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-500">{description}</p>
        </div>
      </div>
      <HorizontalScroller
        ariaLabel={`${title} 산업 흐름 이동`}
        className="mt-3"
        viewportClassName="pb-1"
        contentClassName="flex gap-2"
        scrollStep={280}
      >
        {rowItems.length ? rowItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.scenario.id, item.node.id)}
            className="w-[230px] shrink-0 rounded-lg border border-radar-line bg-white p-3 text-left transition hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-keep text-sm font-black leading-5 text-radar-ink">{item.node.label}</p>
                <p className="mt-1 break-keep text-[11px] font-bold leading-5 text-slate-500">
                  {item.kind} · {item.scenario.name}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black", getFlowStatusTone(item.status))}>
                {item.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <span>관련 {item.relatedCount}개</span>
              <span className={cn("font-black", getMarketMoveTextClass(item.averageChange))}>
                {formatPercent(item.averageChange)}
              </span>
            </div>
            <p className="mt-1 break-keep text-[11px] font-bold leading-5 text-slate-500">
              대표 {item.leader?.name ?? "없음"}
            </p>
          </button>
        )) : (
          <p className="rounded-lg bg-white p-3 text-sm font-bold text-slate-500">{emptyText}</p>
        )}
      </HorizontalScroller>
    </div>
  );

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-radar-ink">오늘 변화 감지</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            핵심산업과 세부산업을 함께 훑어 강세 흐름과 약세 흐름을 먼저 확인합니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 max-xl:grid-cols-1">
        {renderRow("강세·강세전환", "시장 반응이 살아나는 산업 축", strongItems, "현재 뚜렷한 강세 산업이 없습니다.")}
        {renderRow("약세·약세전환", "가격 반응이 약해진 산업 축", weakItems, "현재 뚜렷한 약세 산업이 없습니다.")}
      </div>
    </section>
  );
}

function ScenarioFlowMap({
  scenario,
  activeNode,
  summaries,
  onSelectNode
}: {
  scenario: Scenario;
  activeNode: ScenarioMapNode;
  summaries: Record<string, ReturnType<typeof summarizeNode>>;
  onSelectNode: (nodeId: string) => void;
}) {
  const root = scenario.nodes[0];
  const orderedNodes = getOrderedNodes(scenario);
  const rootSummary = summaries[root.id];

  return (
    <div className="rounded-lg border border-radar-line bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-600">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">핵심 산업 → 세부 밸류체인</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">일반종목과 ETF 분리</span>
      </div>

      <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-5 max-xl:grid-cols-1">
        <button
          type="button"
          data-node-id={root.id}
          onClick={() => onSelectNode(root.id)}
          className={cn(
            "flex min-h-[260px] flex-col justify-between rounded-xl border p-5 text-left transition hover:border-blue-400 hover:shadow-card",
            activeNode.id === root.id ? "border-blue-500 bg-blue-50" : "border-radar-line bg-slate-50"
          )}
        >
          <div>
            <span className="flex size-14 items-center justify-center rounded-xl bg-blue-600 text-white">
              {icons[root.id] ?? <Network size={28} />}
            </span>
            <p className="mt-5 text-sm font-black text-blue-600">핵심 산업</p>
            <h3 className="mt-1 text-3xl font-black text-radar-ink">{root.label}</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{root.description}</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
            <span className="rounded-lg bg-white px-2 py-3">
              관련
              <strong className="mt-1 block text-lg text-radar-ink">{rootSummary?.relatedCount ?? 0}</strong>
            </span>
            <span className="rounded-lg bg-white px-2 py-3">
              일반
              <strong className="mt-1 block text-lg text-radar-ink">{rootSummary?.commonStocks.length ?? 0}</strong>
            </span>
            <span className="rounded-lg bg-white px-2 py-3">
              ETF
              <strong className="mt-1 block text-lg text-radar-ink">{rootSummary?.etfStocks.length ?? 0}</strong>
            </span>
          </div>
        </button>

        <div className="relative rounded-xl border border-radar-line bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-4 dark:bg-none dark:bg-slate-900">
          <div className="absolute bottom-5 left-[31px] top-5 w-px bg-blue-100 max-xl:hidden" />
          <div className="space-y-3">
            {orderedNodes.map((node, index) => {
              const summary = summaries[node.id];
              const isActive = activeNode.id === node.id;
              const change = summary?.averageChange ?? 0;

              return (
                <div key={node.id} className="relative grid grid-cols-[46px_minmax(0,1fr)] gap-3">
                  <span
                    className={cn(
                      "relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-black",
                      isActive ? "border-blue-500 bg-blue-600 text-white" : "border-blue-100 bg-white text-blue-600"
                    )}
                  >
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    data-node-id={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-lg border bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm",
                      isActive && "border-blue-500 shadow-card"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          {icons[node.id] ?? <Layers3 size={22} />}
                        </span>
                        <div className="min-w-0">
                          <p className="break-keep text-lg font-black leading-6 text-radar-ink">{node.label}</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">{getEdgeLabel(scenario, node)}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{node.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-600">
                        <span className={cn("rounded-full border px-2.5 py-1", getFlowStatusTone(summary?.status ?? "관찰"))}>
                          {summary?.status ?? "관찰"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">관련 {summary?.relatedCount ?? 0}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">일반 {summary?.commonStocks.length ?? 0}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">ETF {summary?.etfStocks.length ?? 0}</span>
                        {summary?.globalReferences.length ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            글로벌 참고 {summary.globalReferences.length}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">대표 {summary?.leader?.name ?? "없음"}</span>
                      </div>
                    </div>
                    <div className="flex min-w-24 flex-col items-end justify-between gap-2">
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", getMarketMoveBadgeClass(change))}>
                        {formatPercent(change)}
                      </span>
                      <ArrowRight size={18} className="text-blue-400" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RelatedExposureStrip({
  activeNode,
  activeNodeSummary,
  coreValueChains,
  commonStocks,
  etfStocks,
  globalReferences
}: {
  activeNode: ScenarioMapNode;
  activeNodeSummary?: ReturnType<typeof summarizeNode>;
  coreValueChains: string[];
  commonStocks: Stock[];
  etfStocks: Stock[];
  globalReferences: string[];
}) {
  const status = activeNodeSummary?.status ?? "관찰";
  const averageChange = activeNodeSummary?.averageChange ?? 0;

  return (
    <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-blue-600 dark:text-blue-300">선택 노드 관련 노출</p>
          <h2 className="mt-1 text-xl font-black text-radar-ink">관련종목 한눈에 보기</h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            왼쪽 요약에서 선택 노드와 핵심 수혜 밸류체인을 확인하고, 오른쪽에서 일반종목과 ETF를 바로 비교합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          일반 {commonStocks.length} · ETF {etfStocks.length}
        </span>
      </div>

      <HorizontalScroller
        className="mt-4"
        viewportClassName="pb-1"
        contentClassName={cn(
          "grid min-w-full gap-3",
          globalReferences.length
            ? "grid-cols-[minmax(300px,0.9fr)_minmax(320px,1fr)_minmax(340px,1fr)_minmax(280px,0.85fr)]"
            : "grid-cols-[minmax(320px,0.9fr)_minmax(360px,1fr)_minmax(380px,1.1fr)]"
        )}
        scrollStep={380}
        ariaLabel="선택 노드 관련 종목 이동"
      >
        <div className="min-w-0 rounded-lg border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-blue-600 dark:text-blue-300">선택 노드</p>
              <h3 className="mt-1 break-keep text-xl font-black leading-6 text-radar-ink">{activeNode.label}</h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", getFlowStatusTone(status))}>
                {status}
              </span>
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", getMarketMoveBadgeClass(averageChange))}>
                평균 {formatPercent(averageChange)}
              </span>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
            {activeNode.description}
          </p>
          <div
            className={cn(
              "mt-4 grid gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400",
              activeNodeSummary?.globalReferences.length ? "grid-cols-4" : "grid-cols-3"
            )}
          >
            <span className="rounded-lg bg-white px-2 py-2 dark:bg-slate-900">
              관련
              <strong className="mt-0.5 block text-base text-radar-ink">{activeNodeSummary?.relatedCount ?? 0}</strong>
            </span>
            <span className="rounded-lg bg-white px-2 py-2 dark:bg-slate-900">
              일반
              <strong className="mt-0.5 block text-base text-radar-ink">{activeNodeSummary?.commonStocks.length ?? 0}</strong>
            </span>
            <span className="rounded-lg bg-white px-2 py-2 dark:bg-slate-900">
              ETF
              <strong className="mt-0.5 block text-base text-radar-ink">{activeNodeSummary?.etfStocks.length ?? 0}</strong>
            </span>
            {activeNodeSummary?.globalReferences.length ? (
              <span className="rounded-lg bg-white px-2 py-2 dark:bg-slate-900">
                참고
                <strong className="mt-0.5 block text-base text-radar-ink">{activeNodeSummary.globalReferences.length}</strong>
              </span>
            ) : null}
          </div>
          <div className="mt-4 border-t border-blue-100 pt-3 dark:border-blue-900/60">
            <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-200">
              <GitBranch size={15} />
              <span>핵심 수혜 밸류체인</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {coreValueChains.map((chain, index) => (
                <div key={chain} className="flex items-center gap-1.5">
                  <span className="rounded-md border border-radar-line bg-white px-2.5 py-1.5 text-[11px] font-black text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-200">
                    {chain}
                  </span>
                  {index < coreValueChains.length - 1 ? (
                    <span className="text-xs font-black text-blue-500">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-radar-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-radar-ink">관련 일반종목 TOP 3</h3>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">국내 일반종목 우선</span>
          </div>
          <div className="mt-3 space-y-2">
            {commonStocks.length ? (
              commonStocks.map((stock, index) => (
                <div
                  key={stock.id}
                  className="grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-radar-line bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className="text-slate-400">{index + 1}</span>
                  <Link
                    to={`/valuation?stock=${stock.id}`}
                    className="min-w-0 break-keep font-black leading-5 text-radar-ink hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {stock.name}
                  </Link>
                  <span className={cn("font-black", getMarketMoveTextClass(getStockMove(stock)))}>
                    {formatPercent(getStockMove(stock))}
                  </span>
                  <StockExternalLink stock={stock} compact />
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-white p-4 text-sm font-bold leading-6 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                직접 매칭된 국내 일반종목이 부족합니다. ETF나 글로벌 참고 기업을 보조 지표로 확인하세요.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-radar-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-radar-ink">관련 ETF/상장상품</h3>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">보조 노출 확인</span>
          </div>
          <div className="mt-3 space-y-2">
            {etfStocks.length ? (
              etfStocks.map((stock) => (
                <div
                  key={stock.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-radar-line bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
                >
                  <Link
                    to={`/valuation?stock=${stock.id}`}
                    className="min-w-0 break-keep font-black leading-5 text-radar-ink hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {stock.name}
                  </Link>
                  <span className={cn("font-black", getMarketMoveTextClass(getStockMove(stock)))}>
                    {formatPercent(getStockMove(stock))}
                  </span>
                  <StockExternalLink stock={stock} compact />
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-white p-4 text-sm font-bold leading-6 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                현재 선택 노드에 연결된 ETF/상장상품이 없습니다.
              </p>
            )}
          </div>
        </div>

        {globalReferences.length ? (
          <div className="min-w-0 rounded-lg border border-radar-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-radar-ink">글로벌 참고 기업</h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">국내 수혜 부족 시 참고</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {globalReferences.map((company) => (
                <span
                  key={company}
                  className="rounded-md border border-radar-line bg-white px-3 py-2 text-xs font-black text-radar-ink dark:border-slate-700 dark:bg-slate-900"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </HorizontalScroller>
    </section>
  );
}

export default function ScenarioMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScenarioId = searchParams.get("scenario");
  const initialScenario = scenarios.find((scenario) => scenario.id === initialScenarioId) ?? scenarios[0];
  const initialNodeId = searchParams.get("node");
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0],
    [scenarioId]
  );
  const [activeNodeId, setActiveNodeId] = useState(
    initialScenario.nodes.find((node) => node.id === initialNodeId)?.id ?? initialScenario.nodes[0].id
  );
  const { stocks } = useMarketData();
  const selectedScenarioId = searchParams.get("scenario");
  const showScenarioIndex = !selectedScenarioId;

  useEffect(() => {
    const nextScenarioId = searchParams.get("scenario");
    const nextScenario = scenarios.find((scenario) => scenario.id === nextScenarioId);
    if (!nextScenario) return;

    const nextNodeId = searchParams.get("node");
    setScenarioId(nextScenario.id);
    setActiveNodeId(nextScenario.nodes.find((node) => node.id === nextNodeId)?.id ?? nextScenario.nodes[0].id);
  }, [searchParams]);

  const activeNode = activeScenario.nodes.find((node) => node.id === activeNodeId) ?? activeScenario.nodes[0];
  const nodeSummaries = useMemo(
    () =>
      Object.fromEntries(
        activeScenario.nodes.map((node) => [node.id, summarizeNode(node, activeScenario, stocks)])
      ) as Record<string, ReturnType<typeof summarizeNode>>,
    [activeScenario, stocks]
  );
  const activeNodeSummary = nodeSummaries[activeNode.id];
  const topCommonStocks = activeNodeSummary ? prioritizeDomesticStocks(activeNodeSummary.commonStocks).slice(0, 3) : [];
  const topEtfs = activeNodeSummary?.etfStocks.slice(0, 3) ?? [];
  const linkedChainSummaries = useMemo(
    () =>
      (activeScenario.linkedValueChains ?? []).map((chain) => ({
        chain,
        summary: summarizeLinkedChain(chain, stocks)
      })),
    [activeScenario, stocks]
  );
  const todayFlowItems = useMemo(() => buildTodayFlowItems(stocks), [stocks]);
  const scenarioOverviews = useMemo(() => buildScenarioOverviews(stocks), [stocks]);

  const selectFlowItem = (nextScenarioId: string, nextNodeId: string) => {
    setScenarioId(nextScenarioId);
    setSearchParams({ scenario: nextScenarioId, node: nextNodeId });
    setActiveNodeId(nextNodeId);
  };

  if (showScenarioIndex) {
    return <ScenarioIndexPage overviews={scenarioOverviews} />;
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-radar-line bg-white p-4 shadow-card">
        <div>
          <p className="text-sm font-black text-radar-ink">산업 시나리오 선택</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            핵심 산업에서 세부 밸류체인으로 이어지는 수요·공급 흐름을 겹치지 않는 맵으로 봅니다.
          </p>
        </div>
        <select
          value={scenarioId}
          onChange={(event) => {
            const next = scenarios.find((scenario) => scenario.id === event.target.value) ?? scenarios[0];
            setScenarioId(next.id);
            setSearchParams({ scenario: next.id, node: next.nodes[0].id });
            setActiveNodeId(next.nodes[0].id);
          }}
          className="h-11 min-w-72 rounded-lg border border-radar-line bg-white px-3 text-sm font-black outline-none focus:border-blue-500"
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </section>

      <TodayFlowStrip items={todayFlowItems} onSelect={selectFlowItem} />

      <IndustryReportPanel scenario={activeScenario} stocks={stocks} />

      <RelatedExposureStrip
        activeNode={activeNode}
        activeNodeSummary={activeNodeSummary}
        coreValueChains={activeScenario.coreValueChains}
        commonStocks={topCommonStocks}
        etfStocks={topEtfs}
        globalReferences={activeNodeSummary?.globalReferences ?? []}
      />

      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)] items-start gap-5 max-2xl:grid-cols-1">
        <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                <Network size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-radar-ink">핵심 산업 흐름 맵</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  노드를 클릭하면 상단 관련종목 영역에서 일반종목과 ETF를 나눠 확인할 수 있습니다.
                </p>
              </div>
            </div>
            <Link
              to={getScreenerUrl({ scenario: activeScenario.id, query: activeNode.label })}
              className="rounded-lg border border-radar-line px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50"
            >
              관련 종목 스크리너
            </Link>
          </div>
          <ScenarioFlowMap
            scenario={activeScenario}
            activeNode={activeNode}
            summaries={nodeSummaries}
            onSelectNode={(nodeId) => {
              setActiveNodeId(nodeId);
              setSearchParams({ scenario: activeScenario.id, node: nodeId });
            }}
          />
        </section>

        <aside className="space-y-5">
          {linkedChainSummaries.length ? (
            <section className="rounded-lg border border-radar-line bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-radar-ink">연계 수혜 밸류체인</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    1차 수요가 장비·검사·소재·부품·인프라로 번지는 보조 흐름입니다.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {linkedChainSummaries.length}개
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {linkedChainSummaries.slice(0, 4).map(({ chain, summary }) => (
                  <div key={chain.id} className="rounded-lg border border-radar-line bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-5 text-radar-ink">{chain.title}</p>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                          {chain.trigger} → {chain.effect}
                        </p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black", getSensitivityTone(chain.sensitivity))}>
                        {getSensitivityLabel(chain.sensitivity)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-blue-700 dark:bg-slate-900 dark:text-blue-200">
                        {getTimingLabel(chain.timing)}
                      </span>
                      {chain.beneficiaryChains.slice(0, 4).map((beneficiary) => (
                        <span key={beneficiary} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {beneficiary}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
                        관련 <strong className="ml-1 text-radar-ink">{summary.related.length}</strong>
                      </div>
                      <div className="rounded-md bg-white px-2 py-2 dark:bg-slate-900">
                        평균{" "}
                        <strong className={cn("ml-1", getMarketMoveTextClass(summary.averageChange))}>
                          {formatPercent(summary.averageChange)}
                        </strong>
                      </div>
                      <div className="min-w-0 rounded-md bg-white px-2 py-2 dark:bg-slate-900">
                        대표 <strong className="ml-1 break-keep text-radar-ink">{summary.leader?.name ?? "없음"}</strong>
                      </div>
                    </div>
                    {summary.commonStocks.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {prioritizeDomesticStocks(summary.commonStocks).slice(0, 3).map((stock) => (
                          <Link
                            key={stock.id}
                            to={`/valuation?stock=${stock.id}`}
                            className="rounded-md border border-radar-line bg-white px-2.5 py-1.5 text-[11px] font-black text-radar-ink hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900"
                          >
                            {stock.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
