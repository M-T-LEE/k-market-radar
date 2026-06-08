# K-Market Radar

국내증시 산업순환·밸류체인 분석 플랫폼

산업 시나리오, 핵심 밸류체인, 중심 기업성, 실적 연결성, 밸류에이션 정당화, 선반영 리스크, 보유종목 이슈를 한 흐름으로 평가하는 프리미엄 핀테크 SaaS 스타일 웹앱입니다.

현재 버전은 Vite 개발 서버의 `/api/market-data` 프록시를 통해 실데이터를 우선 반영합니다. API가 제공하지 않는 컨센서스 히스토리, 장기 재무 점수, 산업 시나리오 구조 데이터는 화면/계산 검증용 기준 데이터로 보완합니다.

## 실행 방법

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
```

개발 서버 기본 주소:

```txt
http://127.0.0.1:5173
```

## API 키 설정

실제 API 키는 `.env.local`에만 저장합니다. 저장소에는 키가 없는 `.env.example`만 남깁니다.

```txt
OPEN_DART_API_KEY=
KRX_API_KEY=
FMP_API_KEY=
NEWS_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
SEC_USER_AGENT=K-Market Radar contact@example.com
SEC_ACCEPT_ENCODING=gzip, deflate
SEC_REQUESTS_PER_SECOND=10
```

연결된 데이터 소스:

- Naver Pay Securities delayed quote provider: 국내 종목 현재가/등락률/거래량/시가총액 참고 시세
- FMP: 미국 종목 가격/시총 스냅샷
- Naver Search API: 국내 종목 뉴스/이슈
- NewsAPI: 미국 종목 뉴스/이슈
- OpenDART: 국내 공시 기반 알림
- KRX: 국내 지수/종목 시세. KRX 서비스별 활용 승인 전에는 fallback으로 표시됩니다.

국내 현재가는 `src/providers/naverDelayedQuoteProvider.ts`를 통해 서버사이드에서만 호출합니다. 네이버페이증권은 공식 Open API가 아니므로 `sourceLabel: "네이버페이증권 지연시세"`, `isRealtime: false`, `isDelayed: true`로 고정하며, 자동매매/고빈도 호출/체결 판단에는 사용하지 않습니다. 실패 시 `krxDailyProvider` 최근 종가, 그다음 `referenceQuoteProvider` 순서로 보완합니다.

SEC EDGAR 요청은 서버 어댑터에서 `User-Agent`, `Accept-Encoding: gzip, deflate`, 초당 10회 이하 제한을 적용하도록 준비했습니다. 브라우저는 해당 헤더를 직접 안정적으로 설정할 수 없으므로, 실제 공시 상세 호출은 서버/프록시에서 처리합니다.

## 주요 화면

- 대시보드: API 연결 상태, 후보/보유/과열/보유 강화 요약, 시장 히트맵, TOP 5 후보, 핵심 시나리오
- 산업 시나리오 맵: AI 발전 구조와 HBM, 패키징, 기판, 데이터센터, 전력, 냉각, 로봇, 우주항공, 보안 확산 구조
- 밸류체인 & 핵심 기업: 밸류체인별 핵심 기술, 대표 기업, 중심성 점수, 실적 연결성
- 종목 스크리너 & 스코어링: 시장/테마/점수/밸류 상태/최종판정/검색 필터와 레이더 점수 카드
- 밸류에이션 & 기대치 분석: 시장 기대 순이익, 필요 성장 배수, 필요 매출, 주가 vs EPS 컨센서스, 기대치 게이지
- 보유종목 & 이슈 모니터링: 보유 비중, 투자논리, 최근 이슈, 현재 판정, 위험도, 이슈 타임라인, 알림센터
- 설정: 데이터 소스 상태, API 키 체크리스트, 다크모드 전환

## 폴더 구조

```txt
server/
  api.ts
src/
  app/
    App.tsx
  components/
  context/
    MarketDataContext.tsx
    ThemeContext.tsx
  data/
    issues.ts
    portfolio.ts
    scenarios.ts
    stocks.ts
    valueChains.ts
  lib/
    api/
      env.ts
      rateLimiter.ts
      secEdgar.ts
    download.ts
    externalLinks.ts
    formatters.ts
    scoring.ts
    valuation.ts
  pages/
    Alerts.tsx
    Dashboard.tsx
    PortfolioMonitor.tsx
    ScenarioMap.tsx
    Screener.tsx
    Settings.tsx
    Valuation.tsx
    ValueChain.tsx
  types/
    marketData.ts
    portfolio.ts
    scenario.ts
    stock.ts
```

## 계산 로직

`src/lib/scoring.ts`는 최종점수, 최종판정, 선반영 리스크를 계산합니다.

최종점수는 다음 항목을 반영합니다.

- 산업 시나리오 점수 20
- 밸류체인 핵심성 점수 15
- 기업 중심성 점수 15
- 실적 연결성 점수 15
- 재무 안정성 점수 10
- 밸류에이션 정당화 점수 15
- 선반영 리스크 점수 차감 10

`src/lib/valuation.ts`는 시장 기대 순이익, 필요 이익 성장 배수, 필요 매출, 주가 상승 정당화율, 컨센서스 동행률을 UI에서 바로 사용할 수 있도록 묶습니다.

## 향후 API 연동 계획

- 국내 공시: OpenDART 공시 상세, 재무제표 파싱 확장
- 국내 시장 데이터: KRX 활용 승인 완료 후 국내 종목/지수 실데이터 전면 전환, 필요 시 별도 합법 금융 데이터 API 병행
- 미국 공시: SEC EDGAR submissions/companyfacts 연동
- 미국 재무/주가/뉴스: FMP stable API 확장
- 뉴스/이슈: Naver Search API, NewsAPI 기반 이슈 분류 고도화
- 실적 컨센서스: 합법적 컨센서스 제공 API 확보 후 EPS/매출/영업이익 히스토리 교체

이 앱은 실제 매수/매도 추천을 제공하지 않습니다. 모든 최종 상태는 “매수 검토”, “조정 대기”, “실적 확인 대기”, “과열 경고”처럼 검토 분류로만 표시합니다.
