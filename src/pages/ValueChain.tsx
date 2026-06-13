import { AlertTriangle, Cpu, Download, RefreshCw, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import {
  ThemeEarningsCalendarPanel,
  ValueChainDisclosureImpactPanel,
  ValueChainHistoryPanel
} from "../components/DecisionSupportPanels";
import { ScoreBar } from "../components/ScoreBar";
import { StockExternalLink } from "../components/StockExternalLink";
import { ValueChainTable, type ValueChainTableRow } from "../components/ValueChainTable";
import { useMarketData } from "../context/MarketDataContext";
import { scenarios } from "../data/scenarios";
import { industryUpdatePolicies } from "../data/updatePolicy";
import { valueChains } from "../data/valueChains";
import { downloadCsv } from "../lib/download";
import { cn, formatCurrency, formatMarketCap, formatNumber, formatPercent, getMarketMoveTextClass } from "../lib/formatters";
import type { Stock } from "../types/stock";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function normalize(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeQueryTerm(value: string) {
  return normalize(value).replace(/[·ㆍ.,/()\-]/g, "");
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function isDomesticStock(stock: Stock) {
  return stock.market === "KOSPI" || stock.market === "KOSDAQ";
}

function getCurrentTemperature(score: number): ValueChainTableRow["currentTemperature"] {
  if (score >= 78) return "주도";
  if (score >= 62) return "관심 회복";
  if (score >= 45) return "중립";
  if (score >= 30) return "소외";
  return "약세";
}

function getTemperatureClass(value: ValueChainTableRow["currentTemperature"]) {
  if (value === "주도") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "관심 회복") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "중립") return "border-slate-200 bg-slate-100 text-slate-600";
  if (value === "소외") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function getLeadershipTagClass(value: ValueChainTableRow["leadershipTag"]) {
  if (value === "주도") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "동행") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "후행 관찰") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "과열 주의") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function getLeadershipTag({
  structuralCentralityScore,
  marketReactionScore,
  currentTemperature,
  earningsLinkLevel
}: {
  structuralCentralityScore: number;
  marketReactionScore: number;
  currentTemperature: ValueChainTableRow["currentTemperature"];
  earningsLinkLevel: ValueChainTableRow["earningsLinkLevel"];
}): ValueChainTableRow["leadershipTag"] {
  const weakEarningsLink = earningsLinkLevel === "중간" || earningsLinkLevel === "낮음";

  if (marketReactionScore >= 75 && weakEarningsLink) return "과열 주의";
  if (marketReactionScore >= 80 && currentTemperature === "주도") return "주도";
  if (structuralCentralityScore >= 75 && marketReactionScore < 60) return "후행 관찰";
  if (marketReactionScore < 40) return "소외";
  if (marketReactionScore >= 60) return "동행";
  return "후행 관찰";
}

function calculateStructuralCentrality(chain: (typeof valueChains)[number]) {
  const text = `${chain.name} ${chain.coreTechnology} ${chain.comment}`;
  const earningsAdjustment =
    chain.earningsLinkLevel === "매우 높음" ? 11 : chain.earningsLinkLevel === "높음" ? 3 : chain.earningsLinkLevel === "중간" ? -12 : -22;
  const bottleneckBoost = /HBM|패키징|CDMO|전력기기|배터리 셀|유도무기|반도체 기판/.test(text) ? 8 : 0;
  const earlyStagePenalty = /로봇|우주|발사|위성|지상국|관측|건자재|의료기기|콘텐츠|커머스/.test(text) ? 12 : 0;
  const dependencyPenalty = /고객사|프로젝트|인증|일정|CAPA|후행|경쟁/.test(`${chain.risks.join(" ")} ${chain.comment}`) ? 7 : 0;
  const representativeDepth = Math.min(8, chain.representativeCompanies.length * 1.5);
  const levelCap = chain.earningsLinkLevel === "중간" ? 72 : chain.earningsLinkLevel === "낮음" ? 56 : 94;
  const score =
    28 +
    chain.centralityScore * 0.46 +
    earningsAdjustment +
    bottleneckBoost +
    representativeDepth -
    earlyStagePenalty -
    dependencyPenalty;

  return Math.round(clamp(score, 24, levelCap));
}

function getRelatedStocks(chain: (typeof valueChains)[number], stocks: Stock[]) {
  const chainText = normalize(
    [
      chain.name,
      chain.coreTechnology,
      chain.comment,
      chain.representativeCompanies.join(" "),
      scenarios.find((scenario) => scenario.id === chain.scenarioId)?.name ?? ""
    ].join(" ")
  );

  return stocks.filter((stock) => {
    const stockName = normalize(stock.name);
    const stockTheme = normalize(stock.theme);
    const stockSector = normalize(stock.sector);
    const companyMatch = chain.representativeCompanies.some((company) => {
      const normalizedCompany = normalize(company);
      return stockName.includes(normalizedCompany) || normalizedCompany.includes(stockName);
    });

    return companyMatch || chainText.includes(stockTheme) || stockSector.includes(normalize(chain.name));
  });
}

const companyAliases: Record<string, string[]> = {
  마이크론: ["Micron", "Micron Technology", "MU"],
  Micron: ["Micron", "Micron Technology", "MU"],
  TSMC: ["TSMC", "Taiwan Semiconductor", "TSM"],
  "ASE Technology": ["ASE Technology", "ASX"],
  Amkor: ["Amkor", "AMKR"],
  Broadcom: ["Broadcom", "AVGO"],
  "Arista Networks": ["Arista", "ANET"],
  Coherent: ["Coherent", "COHR"],
  Lumentum: ["Lumentum", "LITE"],
  Vertiv: ["Vertiv", "VRT"],
  "Schneider Electric": ["Schneider", "SU.PA"],
  Eaton: ["Eaton", "ETN"],
  "Trane Technologies": ["Trane", "TT"],
  "Super Micro Computer": ["Super Micro", "SMCI"],
  "Dell Technologies": ["Dell", "DELL"],
  "Quanta Computer": ["Quanta"],
  Foxconn: ["Foxconn", "Hon Hai"],
  "Harmonic Drive": ["Harmonic Drive"],
  Nabtesco: ["Nabtesco"],
  RTX: ["RTX"],
  "GE Aerospace": ["GE Aerospace", "GE"],
  Safran: ["Safran"],
  "Alphabet Class A": ["Alphabet", "GOOGL", "GOOG"],
  "Exxon Mobil": ["Exxon", "XOM"],
  "Thermo Fisher": ["Thermo Fisher", "TMO"],
  "WuXi Biologics": ["WuXi"],
  "Fujifilm Diosynth": ["Fujifilm"],
  "Planet Labs": ["Planet", "PL"],
  BlackSky: ["BlackSky", "BKSY"],
  "Maxar Intelligence": ["Maxar"],
  "MDA Space": ["MDA"],
  Redwire: ["Redwire", "RDW"],
  "Rocket Lab": ["Rocket Lab", "RKLB"],
  SpaceX: ["SpaceX"],
  "Firefly Aerospace": ["Firefly"],
  Iridium: ["Iridium", "IRDM"],
  "AST SpaceMobile": ["AST SpaceMobile", "ASTS"],
  SES: ["SES"],
  "Northrop Grumman": ["Northrop", "NOC"],
  "Lockheed Martin": ["Lockheed", "LMT"],
  "Intuitive Machines": ["Intuitive Machines", "LUNR"],
  Astrobotic: ["Astrobotic"],
  Lonza: ["Lonza"],
  Amgen: ["Amgen", "AMGN"],
  Sandoz: ["Sandoz"],
  "Biocon Biologics": ["Biocon"],
  "Daiichi Sankyo": ["Daiichi", "4568"],
  AstraZeneca: ["AstraZeneca", "AZN"],
  "Eli Lilly": ["Eli Lilly", "LLY"],
  "Novo Nordisk": ["Novo", "NVO"],
  CATL: ["CATL"],
  BYD: ["BYD"],
  Panasonic: ["Panasonic"],
  Fluence: ["Fluence", "FLNC"],
  Tesla: ["Tesla", "TSLA"],
  Prysmian: ["Prysmian"],
  Nexans: ["Nexans"],
  GTT: ["GTT"]
};

const companySpecialties: Record<string, string> = {
  SK하이닉스: "HBM 공급 레퍼런스와 서버 DRAM 믹스로 HBM 가격 프리미엄을 가장 직접적으로 실적에 연결하는 메모리 선도 기업입니다.",
  삼성전자: "메모리·파운드리·패키징을 동시에 보유해 HBM 회복뿐 아니라 AI 반도체 공급망 전반의 턴어라운드 여부를 봐야 하는 종합 반도체 기업입니다.",
  Micron: "미국 메모리 공급사로 HBM3E·HBM4 공급 확대와 서버 DRAM 가격 사이클을 글로벌 관점에서 확인하는 비교 기업입니다.",
  삼성전기: "FC-BGA와 MLCC를 함께 보유해 AI 서버 기판과 전장 부품 사이클을 동시에 확인할 수 있는 부품 기업입니다.",
  이수페타시스: "고다층 PCB와 네트워크·서버향 기판 수요에 민감해 AI 서버 투자 속도가 실적 모멘텀에 빠르게 반영되는 기업입니다.",
  대덕전자: "반도체 패키지 기판과 MLB 노출이 있어 고부가 기판 믹스 개선 여부가 핵심입니다.",
  Ibiden: "ABF 기판과 고성능 패키지 기판에서 글로벌 레퍼런스를 보유해 AI 서버 기판 병목을 확인하는 기업입니다.",
  Unimicron: "대만 패키지 기판·PCB 공급사로 AI 서버와 고성능 반도체 기판 수요의 글로벌 비교 기업입니다.",
  "Shinko Electric": "반도체 패키지 기판과 후공정 부품 노출이 있는 일본 기업으로 기판 공급 경쟁을 확인합니다.",
  TSMC: "CoWoS와 SoIC 기반 첨단 패키징 CAPA가 AI 가속기 공급 병목의 기준점이 되는 파운드리 기업입니다.",
  "ASE Technology": "글로벌 OSAT 기업으로 첨단 패키징 물량과 고객사 후공정 외주 확대를 확인하는 대표 기업입니다.",
  한미반도체: "HBM TC 본더와 첨단 패키징 장비 수주가 핵심인 장비 레버리지 기업입니다.",
  리노공업: "테스트 소켓과 핀 기반의 고마진 구조를 보유해 AI 칩 테스트 수요와 제품 믹스를 함께 봐야 합니다.",
  Amkor: "글로벌 OSAT 기업으로 첨단 패키징 물량과 고객사 CAPA 확대가 실적 변수입니다.",
  HD현대일렉트릭: "북미 변압기와 전력망 교체 수요에 가장 직접적으로 연결되는 전력기기 수출 기업입니다.",
  효성중공업: "초고압 변압기와 전력 인프라 수주잔고가 핵심이며 북미·중동 수주 질을 봐야 합니다.",
  "LS ELECTRIC": "전력 자동화, 배전, 스마트그리드 장비 노출로 데이터센터 전력 투자 확산의 중간재 역할을 합니다.",
  Broadcom: "AI 클러스터용 네트워킹 ASIC, 스위치 실리콘, 커스텀 반도체 수요를 통해 GPU 이후의 네트워크 병목을 확인하는 기업입니다.",
  "Arista Networks": "AI 데이터센터 이더넷 네트워크 장비와 클러스터 운영 수요에 직접 노출되는 네트워크 장비 기업입니다.",
  Coherent: "AI 데이터센터용 고속 광트랜시버와 광부품 수요를 확인하는 광통신 밸류체인 기업입니다.",
  Lumentum: "광부품과 레이저 기술 기반으로 AI 네트워크와 데이터센터 광모듈 수요를 보조 확인하는 기업입니다.",
  오이솔루션: "광트랜시버와 통신 장비 노출로 AI 데이터센터·통신망 투자 회복 여부를 확인하는 국내 광통신 기업입니다.",
  Vertiv: "데이터센터 전력·냉각 인프라를 함께 공급해 AI 서버 랙 전력 밀도 상승을 가장 직접적으로 반영하는 글로벌 기업입니다.",
  "Schneider Electric": "전력관리, UPS, 데이터센터 자동화, 액체냉각 솔루션을 함께 보유한 데이터센터 인프라 기업입니다.",
  Eaton: "전력관리와 배전 장비, 데이터센터 전력 인프라 수요를 함께 확인할 수 있는 글로벌 전력기기 기업입니다.",
  "Trane Technologies": "상업용 냉각과 열관리 솔루션을 통해 데이터센터 고효율 냉각 수요를 확인하는 기업입니다.",
  "Super Micro Computer": "AI 서버와 랙 단위 시스템 통합 수요를 빠르게 반영하지만 마진·재고 변동성도 함께 봐야 하는 기업입니다.",
  "Dell Technologies": "엔터프라이즈 AI 서버와 스토리지 수요를 통해 GPU 투자 확산을 확인하는 글로벌 서버 기업입니다.",
  "Quanta Computer": "글로벌 서버 ODM으로 AI 서버 출하와 CSP 발주 흐름을 보조 확인하는 기업입니다.",
  Foxconn: "AI 서버 제조와 전자 제조 서비스 노출로 글로벌 CSP 투자 확산을 확인하는 기업입니다.",
  케이엔솔: "국내 냉각·클린룸 장비 노출이 있어 고객사 투자와 제품 표준 변화에 민감합니다.",
  "Harmonic Drive": "정밀 감속기 원천 기술과 로봇 관절 부품 레퍼런스가 강한 글로벌 로봇 부품 기업입니다.",
  Nabtesco: "산업용 로봇 감속기와 정밀 제어 부품에서 장기 레퍼런스를 보유한 일본 부품 기업입니다.",
  로보티즈: "액추에이터와 로봇 플랫폼 기술을 보유해 휴머노이드 상용화 기대가 옵션 가치로 붙는 기업입니다.",
  에스피지: "감속기와 모터 기반 매출이 있어 로봇 부품 국산화와 산업 자동화 수요를 동시에 확인합니다.",
  하이젠알앤엠: "서보모터와 구동 부품 노출로 로봇 생산 확대 시 부품 채택 여부가 핵심입니다.",
  LIG넥스원: "유도무기·레이더·방공 체계 수주가 실적과 직접 연결되는 방산 핵심 기업입니다.",
  한화시스템: "방산전자, 레이더, 위성통신, 우주 서비스 노출을 함께 보유한 방산·우주 전자 기업입니다.",
  RTX: "미사일, 방공, 항공전자, 엔진 밸류체인을 함께 보유한 글로벌 방산·항공우주 기준 기업입니다.",
  "GE Aerospace": "항공엔진과 MRO 수요를 통해 항공·방산 엔진 사이클을 확인하는 글로벌 엔진 기업입니다.",
  Safran: "항공엔진과 항공장비 노출이 큰 유럽 항공우주 기업으로 민항·방산 엔진 수요를 함께 봅니다.",
  한화에어로스페이스: "방산, 항공엔진, 우주 발사체를 동시에 보유해 수출 수주와 우주 투자 확산을 함께 봐야 합니다.",
  현대로템: "지상무기와 철도 사업을 함께 보유해 방산 수출 확대와 국내외 프로젝트 수주를 구분해 봐야 합니다.",
  한국항공우주: "항공기 플랫폼과 우주 프로젝트 노출로 국방 항공 수주와 우주 개발 일정이 중요합니다.",
  쎄트렉아이: "소형위성 시스템과 관측 탑재체 레퍼런스가 핵심인 위성 제조·데이터 기업입니다.",
  AP위성: "위성 통신 장비와 우주용 부품 노출로 프로젝트 수주와 납기 관리가 중요합니다.",
  컨텍: "지상국 네트워크와 위성 데이터 수신 인프라에 노출되어 위성 수 증가와 함께 수요가 커질 수 있습니다.",
  "Planet Labs": "위성 관측 데이터와 구독형 분석 서비스 모델을 통해 우주 데이터를 서비스 매출로 전환하는 기업입니다.",
  BlackSky: "실시간 지구관측과 분석 서비스를 통해 국방·정보기관 데이터 수요를 확인하는 기업입니다.",
  "Maxar Intelligence": "고해상도 위성 영상과 지리정보 서비스를 제공해 관측 데이터의 프리미엄 수요를 보는 기업입니다.",
  "MDA Space": "위성 시스템, 로봇, 지상 인프라 노출을 통해 우주 제조·서비스 밸류체인을 확인하는 기업입니다.",
  Redwire: "우주 인프라, 전력·구조체, 미션 장비를 공급하는 우주 하드웨어 밸류체인 기업입니다.",
  인텔리안테크: "위성통신 안테나와 해상·항공 단말 노출로 LEO 사업자 투자 속도가 핵심입니다.",
  "Rocket Lab": "소형 발사체와 위성 제조를 함께 보유해 상업 발사 빈도와 수주잔고를 봐야 합니다.",
  "Firefly Aerospace": "중소형 발사체와 달 수송 서비스 레퍼런스를 확인하는 민간 우주 발사 기업입니다.",
  SES: "위성통신 네트워크와 지상 게이트웨이 수요를 통해 통신형 우주 인프라를 확인하는 기업입니다.",
  SpaceX: "재사용 로켓과 위성 인터넷 생태계의 기준점 역할을 하는 비상장 글로벌 선도 기업입니다.",
  삼성바이오로직스: "대규모 항체의약품 CDMO CAPA와 장기계약, ADC 생산 역량이 실적 가시성을 만드는 대표 기업입니다.",
  "WuXi Biologics": "글로벌 바이오 CDMO 경쟁사로 항체·ADC 위탁개발 생산 흐름을 비교하는 기업입니다.",
  "Fujifilm Diosynth": "바이오의약품 CDMO 증설과 글로벌 고객 기반을 통해 위탁생산 경쟁 강도를 확인하는 기업입니다.",
  셀트리온: "바이오시밀러 제품 포트폴리오와 글로벌 판매망 확장이 핵심인 상업화 기업입니다.",
  Sandoz: "글로벌 제네릭·바이오시밀러 판매망을 가진 기업으로 약가 경쟁과 판매 전략을 비교하는 기준 기업입니다.",
  "Biocon Biologics": "바이오시밀러 포트폴리오와 신흥시장 판매망 노출로 가격 경쟁 강도를 확인하는 기업입니다.",
  알테오젠: "SC 제형 변경 플랫폼과 기술이전 계약 구조가 핵심인 바이오 플랫폼 기업입니다.",
  리가켐바이오: "ADC 링커·페이로드 플랫폼과 글로벌 기술이전 이벤트가 투자 논리를 좌우하는 신약 플랫폼 기업입니다.",
  오름테라퓨틱: "표적 단백질 분해와 항체 기반 플랫폼을 통해 초기 신약 플랫폼 이벤트를 확인하는 기업입니다.",
  "Daiichi Sankyo": "ADC 상업화 레퍼런스를 보유한 글로벌 항암제 기업으로 ADC 시장의 임상·매출 기준점입니다.",
  AstraZeneca: "항암제와 ADC 파트너십 노출이 큰 글로벌 제약사로 신약 상업화 속도를 확인하는 기업입니다.",
  "Eli Lilly": "GLP-1 계열 비만·대사질환 상업화와 생산능력 확대의 글로벌 기준 기업입니다.",
  "Novo Nordisk": "비만·당뇨 치료제 시장의 대표 기업으로 공급능력과 약가 정책을 함께 확인해야 합니다.",
  한미약품: "비만·대사 파이프라인과 글로벌 파트너십 이벤트가 핵심인 국내 신약 기업입니다.",
  동아에스티: "대사질환·바이오시밀러 파이프라인과 기술이전 이벤트를 확인하는 국내 제약 기업입니다.",
  삼천당제약: "바이오시밀러와 제형 개발 이슈에 민감한 기업으로 계약·승인 이벤트를 보조 확인합니다.",
  HD한국조선해양: "고부가 선박 수주와 그룹 조선 포트폴리오를 통해 조선 업황을 대표하는 기업입니다.",
  한화오션: "LNG선과 특수선 수주 회복, 생산 안정화가 핵심인 조선 턴어라운드 기업입니다.",
  삼성중공업: "해양플랜트와 LNG선 노출이 커서 고부가 수주와 인도 일정이 중요합니다.",
  GTT: "LNG 운반선 멤브레인 화물창 기술을 보유해 LNG선 발주와 직접 연결되는 프랑스 기자재 기업입니다.",
  동성화인텍: "LNG 보냉재와 기자재 수요에 노출되어 LNG선 건조량 증가의 후행 수혜를 확인하는 기업입니다.",
  한국카본: "LNG선 보냉재와 복합소재 노출이 있어 조선 수주잔고의 기자재 파급을 확인하는 기업입니다.",
  HD현대마린솔루션: "선박 애프터마켓, 개조, 친환경 솔루션 수요를 통해 조선 후행 서비스를 확인하는 기업입니다.",
  HD현대마린엔진: "선박엔진과 친환경 추진 시스템 수요에 노출된 조선 기자재 핵심 기업입니다.",
  한화엔진: "이중연료 엔진과 선박엔진 수요를 통해 조선사 건조량 증가의 후행 실적 연결성을 확인합니다.",
  CATL: "글로벌 배터리 셀 선도 기업으로 LFP·ESS 가격 경쟁과 생산능력의 기준점입니다.",
  BYD: "전기차와 배터리 내재화를 동시에 가진 기업으로 배터리 가격 경쟁과 완성차 수요를 같이 봅니다.",
  Panasonic: "원통형 배터리와 글로벌 완성차 고객 기반을 통해 배터리 믹스 변화를 확인하는 기업입니다.",
  LG에너지솔루션: "글로벌 배터리 셀 CAPA, ESS 사업, 고객사 전기차 판매 흐름에 직접 연결되는 2차전지 대표 기업입니다.",
  삼성SDI: "프리미엄 배터리와 원형전지, ESS 노출을 함께 보유해 수익성 방어와 신규 수주가 핵심입니다.",
  에코프로비엠: "양극재 판가와 출하량 변화가 실적에 빠르게 반영되는 소재 기업입니다.",
  포스코퓨처엠: "양극재·음극재 밸류체인 노출과 그룹 원재료 조달 역량이 핵심입니다.",
  Fluence: "계통형 ESS 통합 솔루션 기업으로 전력망 투자와 ESS 프로젝트 수요를 확인하는 기업입니다.",
  Tesla: "전기차뿐 아니라 Megapack 기반 ESS 수요의 글로벌 기준 기업입니다.",
  대한전선: "초고압·해저케이블 수주와 생산능력 확장을 통해 전력망 투자 수혜를 확인하는 전선 기업입니다.",
  LS전선: "초고압 케이블과 해저케이블 경쟁력을 보유한 국내 전선 밸류체인 핵심 기업입니다.",
  가온전선: "전력 케이블과 배전망 수요에 노출되어 전력망 투자 확산의 보조 지표로 볼 수 있는 전선 기업입니다.",
  Prysmian: "글로벌 전선·해저케이블 기업으로 송전망 투자 사이클의 기준점입니다.",
  Nexans: "유럽 전선·전력망 인프라 기업으로 해저케이블과 전력망 투자 수요를 확인하는 기업입니다.",
  NAVER: "검색·광고·커머스 기반 트래픽과 AI 서비스 수익화 가능성을 함께 봐야 하는 플랫폼 기업입니다.",
  카카오: "메신저 기반 트래픽과 콘텐츠·결제 생태계를 보유하지만 비용 통제와 성장 회복 확인이 필요합니다.",
  KB금융: "자본비율과 주주환원 여력이 높은 금융 대표주로 밸류업 정책 민감도가 큽니다.",
  신한지주: "은행·카드·증권 포트폴리오를 보유해 NIM과 대손비용 흐름을 함께 봐야 합니다.",
  하나금융지주: "환율과 은행 이익 민감도가 높아 배당·자사주 정책과 건전성 관리가 핵심입니다.",
  "S-Oil": "정제마진과 유가·환율 사이클에 민감한 정유 대표 기업입니다.",
  SK이노베이션: "정유와 배터리 사업이 함께 있어 정제마진 회복과 배터리 손익 개선을 분리해서 봐야 합니다."
};

function findCompanyStock(company: string, stocks: Stock[]) {
  const candidates = [company, ...(companyAliases[company] ?? [])].map(normalize);

  return stocks.find((stock) => {
    const stockName = normalize(stock.name);
    const stockTicker = normalize(stock.ticker);
    return candidates.some((candidate) => stockName.includes(candidate) || candidate.includes(stockName) || stockTicker === candidate);
  });
}

function getDomesticRepresentatives(chain: (typeof valueChains)[number], relatedStocks: Stock[], stocks: Stock[]) {
  const directDomesticCompanies = chain.representativeCompanies.filter((company) => Boolean(findCompanyStock(company, stocks)));
  const relatedDomesticCompanies = relatedStocks.map((stock) => stock.name);
  const companies = Array.from(new Set([...directDomesticCompanies, ...relatedDomesticCompanies])).slice(0, 6);

  return companies.length ? companies : ["국내 매칭 대기"];
}

function formatStockPrice(stock: Stock) {
  return stock.market.startsWith("US") ? `$${formatNumber(stock.currentPrice, 2)}` : formatCurrency(stock.currentPrice);
}

function formatStockMarketCap(stock: Stock) {
  return stock.market.startsWith("US") ? `$${formatNumber(stock.marketCap / 10, 1)}B` : formatMarketCap(stock.marketCap);
}

function matchesValueChainQuery(chain: ValueChainTableRow, query: string, scenarioName = "") {
  if (!query.trim()) return true;

  const queryText = normalizeQueryTerm(query);
  const terms = query
    .split(/[\s,·ㆍ./()\-]+/g)
    .map(normalizeQueryTerm)
    .filter((term) => term.length >= 2);
  const haystack = normalizeQueryTerm(
    [
      chain.id,
      chain.name,
      chain.coreTechnology,
      chain.comment,
      chain.selectedCompany,
      chain.representativeCompanies.join(" "),
      scenarioName
    ].join(" ")
  );

  return haystack.includes(queryText) || terms.some((term) => haystack.includes(term));
}

function getCompanyProfile(company: string, chain: ValueChainTableRow, stock?: Stock) {
  const specialty = companySpecialties[company] ?? `${company}는 ${chain.name} 밸류체인에서 ${chain.coreTechnology} 노출을 확인하기 위한 대표 관찰 기업입니다.`;
  const dailyMove = stock ? stock.dailyChangeRate ?? stock.priceChange3M : chain.averageDailyChange;
  const momentumLabel = dailyMove >= 3 ? "단기 시장 반응이 강한 구간" : dailyMove >= 0 ? "시장 반응이 유지되는 구간" : "단기 수급 확인이 필요한 구간";
  const roleLabel = stock
    ? stock.earningsLinkScore >= 78
      ? "실적 직접 연결"
      : stock.companyCentralityScore >= 78
        ? "핵심 포지션"
        : stock.finalScore >= 65
          ? "관찰 후보"
          : "보수적 관찰"
    : "외부 참고";
  const metrics = stock
    ? [
        { label: "현재가", value: formatStockPrice(stock), tone: "text-radar-ink" },
        { label: "등락률", value: formatPercent(dailyMove), tone: getMarketMoveTextClass(dailyMove) },
        { label: "시가총액", value: formatStockMarketCap(stock), tone: "text-radar-ink" },
        { label: "실적 연결", value: `${Math.round(stock.earningsLinkScore)}점`, tone: stock.earningsLinkScore >= 70 ? "text-emerald-600" : "text-amber-600" },
        { label: "중심성", value: `${Math.round(stock.companyCentralityScore)}점`, tone: stock.companyCentralityScore >= 70 ? "text-blue-600" : "text-amber-600" },
        { label: "선반영위험", value: `${Math.round(stock.preReflectionRiskScore)}점`, tone: stock.preReflectionRiskScore >= 65 ? "text-red-600" : stock.preReflectionRiskScore >= 45 ? "text-amber-600" : "text-emerald-600" }
      ]
    : [
        { label: "현재가", value: "미연동", tone: "text-slate-500" },
        { label: "등락률", value: formatPercent(dailyMove), tone: getMarketMoveTextClass(dailyMove) },
        { label: "데이터", value: "외부 확인", tone: "text-amber-600" }
      ];
  const reasons = [
    specialty,
    stock
      ? `${stock.market} · ${stock.theme} 유니버스에서 확인되며, 현재 ${momentumLabel}입니다.`
      : "현재 stock universe에서 직접 매칭되지 않아 가격·실적 지표는 외부 링크와 업종 흐름으로 보조 확인해야 합니다.",
    stock
      ? `실적 연결 ${Math.round(stock.earningsLinkScore)}점, 기업 중심성 ${Math.round(stock.companyCentralityScore)}점으로 ${chain.name} 투자 논리와의 직접성을 점검합니다.`
      : `${chain.name}의 산업 병목도와 대표 기업군 내 포지션을 우선 확인하고, 실제 매출 노출도는 별도 확인이 필요합니다.`
  ];
  const risks = [
    ...(stock && stock.preReflectionRiskScore >= 65 ? [`선반영위험 ${Math.round(stock.preReflectionRiskScore)}점으로 주가 기대 반영 여부 확인 필요`] : []),
    ...(stock && (stock.dailyChangeRate ?? stock.priceChange3M) < -3 ? ["단기 가격 흐름이 약해 수급 반전 확인 필요"] : []),
    ...(stock && stock.quarterlyOperatingProfitGrowth < 0 ? ["분기 영업이익 모멘텀 둔화 여부 확인 필요"] : []),
    ...chain.risks
  ].filter((item, index, array) => array.indexOf(item) === index).slice(0, 5);
  const marketSummary = stock
    ? `${company}는 ${chain.name} 안에서 ${roleLabel}로 분류됩니다. 현재 등락률은 ${formatPercent(dailyMove)}이고, 실적 연결 ${Math.round(stock.earningsLinkScore)}점·중심성 ${Math.round(stock.companyCentralityScore)}점·선반영위험 ${Math.round(stock.preReflectionRiskScore)}점입니다. 같은 밸류체인이라도 기업별 가격 반응과 실적 연결도가 다르므로, 이 수치가 선택 기업 해석의 기준입니다.`
    : `${company}는 ${chain.name}의 대표 기업군에 포함되지만 현재 universe에서 직접 가격 데이터가 매칭되지 않았습니다. 패널의 밸류체인 점수는 산업 단위 해석이며, 기업별 판단은 외부 링크와 공시·실적 데이터를 추가 확인해야 합니다.`;

  return { metrics, roleLabel, marketSummary, reasons, risks, specialty };
}

function buildValueChainRow(chain: (typeof valueChains)[number], stocks: Stock[]): ValueChainTableRow {
  const relatedStocks = getRelatedStocks(chain, stocks);
  const representativeCompanies = getDomesticRepresentatives(chain, relatedStocks, stocks);
  const selectedCompany = representativeCompanies.includes(chain.selectedCompany)
    ? chain.selectedCompany
    : representativeCompanies[0] ?? "국내 매칭 대기";
  const marketDailyChanges = stocks.map((stock) => stock.dailyChangeRate ?? stock.priceChange3M);
  const marketTrendChanges = stocks.map((stock) => stock.priceChange3M);
  const marketAverageAbsoluteDailyChange = average(marketDailyChanges.map((change) => Math.abs(change)));
  const marketAverageAbsoluteTrend = average(marketTrendChanges.map((change) => Math.abs(change)));
  const dailyChanges = relatedStocks.map((stock) => stock.dailyChangeRate ?? stock.priceChange3M);
  const trendChanges = relatedStocks.map((stock) => stock.priceChange3M);
  const averageDailyChange = average(dailyChanges);
  const averageTrend = average(trendChanges);
  const averageAbsoluteDailyChange = average(dailyChanges.map((change) => Math.abs(change)));
  const averageAbsoluteTrend = average(trendChanges.map((change) => Math.abs(change)));
  const relativeDailyActivity = Math.max(0, averageAbsoluteDailyChange - marketAverageAbsoluteDailyChange);
  const relativeTrendActivity = Math.max(0, averageAbsoluteTrend - marketAverageAbsoluteTrend);
  const breadth = relatedStocks.length
    ? (relatedStocks.filter((stock) => (stock.dailyChangeRate ?? stock.priceChange3M) > 0).length / relatedStocks.length) * 100
    : 35;
  const leader = relatedStocks
    .slice()
    .sort((a, b) => (b.dailyChangeRate ?? b.priceChange3M) - (a.dailyChangeRate ?? a.priceChange3M))[0];
  const breadthConviction = Math.abs(breadth - 50);
  const leaderMove = leader ? leader.dailyChangeRate ?? leader.priceChange3M : 0;
  const leaderActivity = Math.abs(leaderMove);
  const structuralCentralityScore = calculateStructuralCentrality(chain);
  const marketConfirmationScore = Math.round(
    clamp(
      30 +
        averageAbsoluteDailyChange * 4.4 +
        averageAbsoluteTrend * 0.34 +
        relativeDailyActivity * 2.6 +
        relativeTrendActivity * 0.18 +
        breadthConviction * 0.22 +
        leaderActivity * 0.45 +
        Math.min(8, relatedStocks.length * 0.9) +
        (structuralCentralityScore >= 76 ? 3 : structuralCentralityScore < 48 ? -4 : 0),
      8,
      98
    )
  );
  const positiveConfirmation =
    Math.max(averageDailyChange, 0) * 3.8 +
    Math.max(averageTrend, 0) * 0.35 +
    Math.max(breadth - 50, 0) * 0.38 +
    Math.max(leaderMove, 0) * 0.8;
  const negativePressure =
    Math.max(-averageDailyChange, 0) * 2.4 +
    Math.max(-averageTrend, 0) * 0.12 +
    Math.max(50 - breadth, 0) * 0.25 +
    Math.max(-leaderMove, 0) * 0.55;
  const structuralLiquidityFit =
    48 +
    marketConfirmationScore * 0.16 +
    Math.max(structuralCentralityScore - 68, 0) * 0.12 -
    Math.max(56 - structuralCentralityScore, 0) * 0.18;
  const marketReactionScore = Math.round(
    clamp(
      structuralLiquidityFit +
        positiveConfirmation -
        negativePressure,
      10,
      98
    )
  );
  const currentTemperature = getCurrentTemperature(marketReactionScore);
  const leadershipTag = getLeadershipTag({
    structuralCentralityScore,
    marketReactionScore,
    currentTemperature,
    earningsLinkLevel: chain.earningsLinkLevel
  });

  return {
    ...chain,
    representativeCompanies,
    selectedCompany,
    structuralCentralityScore,
    marketConfirmationScore,
    marketReactionScore,
    currentTemperature,
    leadershipTag,
    averageDailyChange,
    relatedCount: relatedStocks.length,
    leaderName: leader?.name
  };
}

export default function ValueChain() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<ValueChainTableRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const { stocks } = useMarketData();
  const scenarioParam = searchParams.get("scenario");
  const chainParam = searchParams.get("chain");
  const companyParam = searchParams.get("company");
  const queryFilter = searchParams.get("query") ?? "";
  const scenarioFilter = scenarioParam && scenarios.some((scenario) => scenario.id === scenarioParam) ? scenarioParam : "전체";
  const domesticStocks = useMemo(() => stocks.filter(isDomesticStock), [stocks]);
  const analyzedValueChains = useMemo(
    () => valueChains.map((chain) => buildValueChainRow(chain, domesticStocks)),
    [domesticStocks]
  );
  const selectedView = selected;
  const selectedStock = selectedCompany ? findCompanyStock(selectedCompany, domesticStocks) : undefined;
  const companyProfile = selectedView && selectedCompany ? getCompanyProfile(selectedCompany, selectedView, selectedStock) : undefined;
  const filteredValueChains = useMemo(
    () =>
      analyzedValueChains.filter((chain) => {
        const scenarioName = scenarios.find((scenario) => scenario.id === chain.scenarioId)?.name ?? "";
        return (
          (scenarioFilter === "전체" || chain.scenarioId === scenarioFilter) &&
          matchesValueChainQuery(chain, queryFilter, scenarioName)
        );
      }),
    [analyzedValueChains, queryFilter, scenarioFilter]
  );
  const selectedScenario = selectedView ? scenarios.find((scenario) => scenario.id === selectedView.scenarioId) : undefined;

  const selectChain = (chain: ValueChainTableRow) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("scenario", chain.scenarioId);
    nextParams.set("chain", chain.id);
    nextParams.delete("query");
    setSearchParams(nextParams);
  };

  const clearUrlFilters = () => {
    setSearchParams({});
    setSelected(null);
    setSelectedCompany("");
    setIsDetailOpen(false);
  };

  useEffect(() => {
    const target = chainParam
      ? analyzedValueChains.find((chain) => chain.id === chainParam)
      : null;

    if (!target) {
      if (selected && !filteredValueChains.some((chain) => chain.id === selected.id)) {
        setSelected(null);
        setSelectedCompany("");
        setIsDetailOpen(false);
      }
      return;
    }

    setSelected(target);
    setSelectedCompany(
      companyParam && target.representativeCompanies.includes(companyParam)
        ? companyParam
        : target.selectedCompany
    );
    setIsDetailOpen(true);
  }, [analyzedValueChains, chainParam, companyParam, filteredValueChains, selected]);

  useEffect(() => {
    if (!isDetailOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDetailOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDetailOpen]);

  const exportValueChains = () => {
    downloadCsv(
      "market-cycle-radar-value-chains.csv",
      analyzedValueChains.map((chain) => ({
        밸류체인: chain.name,
        핵심기술: chain.coreTechnology,
        대표기업: chain.representativeCompanies.join(" / "),
        최종점검: chain.dataUpdatedAt ?? "",
        점검주기: chain.reviewCadence ?? "",
        산업병목도: chain.structuralCentralityScore,
        시장유동성: chain.marketConfirmationScore,
        시장반응: chain.marketReactionScore,
        현재온도: chain.currentTemperature,
        상태태그: chain.leadershipTag,
        관련종목수: chain.relatedCount,
        실적연결성: chain.earningsLinkLevel,
        갱신트리거: chain.updateTriggers?.join(" / ") ?? "",
        코멘트: chain.comment
      }))
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-600">
            주요 산업의 밸류체인을 산업 병목도, 시장 유동성, 시장 반응으로 나누어 분석합니다. 대표기업은 2026-05-31 기준 공개자료와 현재 universe 흐름을 반영해 재점검했습니다.
          </p>
          <p className="mt-1 text-xs font-black text-blue-600">
            밸류체인 목록의 행을 클릭하면 오른쪽에서 상세 분석 패널이 열립니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={scenarioFilter}
            onChange={(event) => {
              const nextFilter = event.target.value;
              const nextParams = new URLSearchParams(searchParams);
              if (nextFilter === "전체") {
                nextParams.delete("scenario");
              } else {
                nextParams.set("scenario", nextFilter);
              }
              nextParams.delete("chain");
              nextParams.delete("query");
              nextParams.delete("company");
              setSearchParams(nextParams);
              setSelected(null);
              setSelectedCompany("");
              setIsDetailOpen(false);
            }}
            className="h-10 rounded-lg border border-radar-line bg-white px-3 text-sm font-black outline-none focus:border-blue-500"
          >
            <option value="전체">전체 산업</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
          <button
            onClick={exportValueChains}
            className="flex items-center gap-2 rounded-lg border border-radar-line bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm"
          >
            <Download size={16} />
            내보내기
          </button>
        </div>
      </div>

      {(scenarioFilter !== "전체" || queryFilter) ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 shadow-card">
          <div>
            <p className="text-sm font-black text-blue-800">
              대시보드 연결 필터 적용 중
            </p>
            <p className="mt-1 text-xs font-bold text-blue-700">
              {scenarioFilter !== "전체" ? scenarios.find((scenario) => scenario.id === scenarioFilter)?.name : "전체 산업"}
              {queryFilter ? ` · ${queryFilter}` : ""} 기준으로 관련 밸류체인만 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            onClick={clearUrlFilters}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
          >
            필터 해제
          </button>
        </section>
      ) : null}

      <section className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-white p-2.5 text-blue-600">
              <RefreshCw size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-radar-ink">업황·대표기업 갱신 정책</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                가격·수급은 새로고침 시 지연시세로 재계산하고, 대표기업·밸류체인은 주 1회 정기 점검과 대형 수주·실적·정책 이벤트 발생 시 갱신 큐에 올립니다.
              </p>
            </div>
          </div>
          <div className="grid min-w-[420px] grid-cols-4 gap-2 text-xs font-black text-slate-600 max-lg:min-w-0 max-lg:grid-cols-2">
            {industryUpdatePolicies.map((policy) => (
              <div key={policy.id} className="rounded-lg bg-white px-3 py-2">
                {policy.label}
                <span className="mt-1 block text-blue-600">{policy.cadence}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-blue-50 p-2 text-blue-600">
            <Star size={18} />
          </span>
          <div>
            <h3 className="font-black text-blue-700">전체 산업 분석 인사이트</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              밸류체인은 구조적으로 중요한 구간과 현재 시장이 실제로 가격·수급으로 확인해주는 구간을 분리해서 봐야 합니다.
              산업 병목도가 높아도 시장 유동성과 시장 반응이 낮으면 후행 관찰 영역으로 두고, 시장 반응이 강하지만 실적 연결성이 낮으면 과열 주의로 분리합니다.
              이 화면은 매주 대표기업·수급·가격 반응을 재점검해 주도, 동행, 후행 관찰, 소외, 과열 주의 상태를 갱신하는 구조입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 items-start gap-4 max-xl:grid-cols-1">
        {filteredValueChains
          .slice()
          .sort((a, b) => b.marketConfirmationScore - a.marketConfirmationScore)
          .slice(0, 3)
          .map((chain) => (
            <article
              key={chain.id}
              className="rounded-lg border border-radar-line bg-white p-4 text-left shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">밸류체인 주도성</p>
                  <h3 className="mt-1 text-lg font-black">{chain.name}</h3>
                </div>
                <span className={cn("rounded-full border px-2 py-1 text-[11px] font-black", getTemperatureClass(chain.currentTemperature))}>
                  {chain.currentTemperature}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-[80px_1fr_34px] items-center gap-2 text-xs font-bold text-slate-500">
                <span>시장 유동성</span>
                <ScoreBar value={chain.marketConfirmationScore} showValue={false} />
                <span className="text-right font-black text-radar-ink">{chain.marketConfirmationScore}</span>
              </div>
              <div className="mt-2 grid grid-cols-[80px_1fr_34px] items-center gap-2 text-xs font-bold text-slate-500">
                <span>시장 반응</span>
                <ScoreBar value={chain.marketReactionScore} showValue={false} />
                <span className="text-right font-black text-radar-ink">{chain.marketReactionScore}</span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">
                평균 {chain.averageDailyChange >= 0 ? "+" : ""}{chain.averageDailyChange.toFixed(1)}% · 관련 {chain.relatedCount}개 · 대표 {chain.leaderName ?? chain.selectedCompany}
              </p>
            </article>
          ))}
      </section>

      <div className="space-y-5">
        <section className="min-w-0 rounded-lg border border-radar-line bg-white p-5 shadow-card">
          <ValueChainTable rows={filteredValueChains} selectedId={selected?.id} onSelect={selectChain} />
          <div className="mt-5 space-y-1 text-xs font-bold text-slate-500">
            <p>* 산업 병목도: 해당 밸류체인이 산업 성장에서 얼마나 대체하기 어려운 핵심 구간인지 봅니다.</p>
            <p>* 시장 유동성: 관련 종목 수, 당일 등락률, 단기 추세, 상승 종목 비율, 대표 종목 움직임을 반영합니다.</p>
            <p>* 시장 반응: 산업 병목도가 실제 가격·수급 반응으로 확인되는 정도를 봅니다.</p>
          </div>
        </section>

        {isDetailOpen && selectedView ? (
          <>
            <button
              type="button"
              aria-label="상세 패널 닫기"
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
            />
            <aside className="fixed right-0 top-0 z-50 h-screen w-[min(540px,calc(100vw-24px))] overflow-y-auto border-l border-radar-line bg-white p-6 shadow-2xl dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-blue-600">{selectedView.name}</p>
              <h2 className="mt-1 text-2xl font-black leading-tight">{selectedCompany}</h2>
              <p className="mt-2 text-sm font-bold leading-5 text-slate-500">{selectedScenario?.name}</p>
              {selectedStock ? (
                <div className="mt-3">
                  <StockExternalLink stock={selectedStock} />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex rounded-md border px-2.5 py-1 text-xs font-black", getTemperatureClass(selectedView.currentTemperature))}>
                {selectedView.currentTemperature}
              </span>
              <span className={cn("inline-flex rounded-md border px-2.5 py-1 text-xs font-black", getLeadershipTagClass(selectedView.leadershipTag))}>
                {selectedView.leadershipTag}
              </span>
              {companyProfile ? (
                <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                  {companyProfile.roleLabel}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-radar-line p-2 text-slate-500 hover:bg-slate-50"
                aria-label="상세 패널 닫기"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 items-start gap-3 max-2xl:grid-cols-2">
            <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">산업 병목도</p>
              <p className="mt-2 text-2xl font-black text-blue-600">{selectedView.structuralCentralityScore}<span className="text-sm text-slate-500"> /100</span></p>
            </div>
            <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">시장 유동성</p>
              <p className="mt-2 text-2xl font-black text-teal-600">{selectedView.marketConfirmationScore}<span className="text-sm text-slate-500"> /100</span></p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                평균 {selectedView.averageDailyChange >= 0 ? "+" : ""}{selectedView.averageDailyChange.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-radar-line bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">시장 반응</p>
              <p className="mt-2 text-2xl font-black text-amber-600">{selectedView.marketReactionScore}<span className="text-sm text-slate-500"> /100</span></p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black text-slate-500">대표 기업 선택</p>
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
              className="h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-black outline-none focus:border-blue-500"
            >
              {selectedView.representativeCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
            {!selectedStock ? (
              <p className="mt-2 text-xs font-bold text-amber-600">
                현재 universe에서 직접 매칭되지 않는 기업입니다. 관련 ETF·해외종목은 스크리너 테마 필터에서 함께 확인하세요.
              </p>
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border border-radar-line bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-500">
              <div>
                <p>최종 점검일</p>
                <p className="mt-1 text-sm font-black text-radar-ink">{selectedView.dataUpdatedAt ?? "미기록"}</p>
              </div>
              <div>
                <p>점검 주기</p>
              <p className="mt-1 text-sm font-black text-radar-ink">{selectedView.reviewCadence ?? "주간"}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-black text-slate-500">다음 갱신 트리거</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedView.updateTriggers ?? []).slice(0, 4).map((trigger) => (
                  <span key={trigger} className="rounded-full border border-radar-line bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {companyProfile ? (
            <div className="mt-5 rounded-lg border border-radar-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">선택 기업 분석</p>
                  <h3 className="mt-1 text-lg font-black">{selectedCompany}</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{companyProfile.specialty}</p>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {companyProfile.roleLabel}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 items-start gap-3 sm:grid-cols-3">
                {companyProfile.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-radar-line bg-slate-50 p-3">
                    <p className="text-[11px] font-black text-slate-500">{metric.label}</p>
                    <p className={cn("mt-1 text-lg font-black", metric.tone)}>{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <ValueChainHistoryPanel chainName={selectedView.name} />
          <ValueChainDisclosureImpactPanel chainName={selectedView.name} />
          <ThemeEarningsCalendarPanel theme={selectedView.name} />

          <div className="mt-6">
            <div className="flex items-center gap-2 text-sm font-black">
              <Cpu size={17} className="text-blue-600" />
              핵심 기술
            </div>
            <p className="mt-3 rounded-lg bg-blue-50 p-5 text-sm font-bold leading-7 text-blue-900">
              {selectedView.coreTechnology}
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-radar-line bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-500">현재 시장 해석</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              {companyProfile?.marketSummary}
              {" "}
              밸류체인 전체로는 관련 종목 {selectedView.relatedCount}개 기준 {selectedView.currentTemperature} 구간이며,
              시장 반응은 {selectedView.marketReactionScore}점입니다.
              {selectedView.leaderName ? ` 현재 대표 움직임은 ${selectedView.leaderName} 중심으로 확인됩니다.` : " 직접 매칭 종목이 적어 보수적으로 해석합니다."}
            </p>
          </div>

          <div className="mt-6 border-t border-radar-line pt-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <Star size={17} className="text-blue-600" />
              중심 기업으로 보는 이유
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              {(companyProfile?.reasons ?? selectedView.reason).map((item) => (
                <li key={item} className="flex gap-2">
                  <ShieldCheck size={16} className="mt-1 shrink-0 text-teal-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-radar-line pt-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle size={17} className="text-red-600" />
              주요 리스크
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              {(companyProfile?.risks ?? selectedView.risks).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-lg border border-radar-line bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-500">산업 병목도</p>
            <ScoreBar value={selectedView.structuralCentralityScore} className="mt-3" />
            <p className="mt-4 text-xs font-bold text-slate-500">시장 유동성</p>
            <ScoreBar value={selectedView.marketConfirmationScore} className="mt-3" />
            <p className="mt-4 text-xs font-bold text-slate-500">시장 반응</p>
            <ScoreBar value={selectedView.marketReactionScore} className="mt-3" />
          </div>
            </aside>
          </>
        ) : null}
      </div>

      <section className="hidden rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-50 p-2 text-blue-600">
            <Star size={18} />
          </span>
          <div>
            <h3 className="font-black text-blue-700">분석 인사이트</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              현재 AI 산업의 핵심 가치는 HBM → 패키징 → AI 칩으로 이어지는 고성능 컴퓨팅 밸류체인에 집중되어 있습니다.
              우주경제, 방산, 바이오, 조선, 전력망, 2차전지는 수주잔고·CAPA·정책·가격 사이클을 함께 보며 실적 연결성을 계속 재평가합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
