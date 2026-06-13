# K-Market Radar

한국 증시 산업·밸류체인 기반 종목 성향 분석 레이더

Korea stock market value-chain radar. 산업 시나리오, 핵심 밸류체인, 중심 기업성, 실적 연결성, 밸류에이션 정당화, 선반영 리스크, 보유종목 이슈를 한 흐름으로 점검하는 Vite + React 대시보드입니다.

## Local Development

```powershell
npm install
npm run dev
```

개발 서버 기본 주소:

```txt
http://127.0.0.1:5174/
```

로컬 개발에서는 `vite.config.ts`의 `configureServer(server)`가 `registerApiRoutes(server)`를 붙여 `/api/*` 요청을 처리합니다.

## Build

```powershell
npm run build
```

## Vercel Deployment

Vercel이 의도된 프로덕션 배포 대상입니다. GitHub Pages는 정적 파일만 제공하므로 `/api/*` 서버 함수가 실행되지 않습니다.

Vercel 설정:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

루트 `/api` 폴더의 Serverless Functions가 프로덕션 `/api/*` 요청을 처리합니다. 프론트엔드는 기존처럼 `/api/market-data`, `/api/technical-signals` 같은 경로를 호출합니다.

## GitHub Pages Preview

GitHub Pages URL:

```txt
https://m-t-lee.github.io/k-market-radar/
```

GitHub Pages는 정적 미리보기 용도입니다. API 함수가 실행되지 않으므로 실시간 데이터 연동은 실패할 수 있고, 화면은 기본/보완 데이터로 표시됩니다. GitHub Actions 빌드는 `GITHUB_PAGES=true`로 실행되어 Vite base가 `/k-market-radar/`로 설정됩니다.

## Required Environment Variables

Vercel Project Settings에 아래 값을 등록합니다. 민감한 키는 `VITE_*`로 만들지 않습니다.

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
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

로컬 테스트에서는 같은 값을 `.env.local`에 넣습니다. 저장소에는 실제 키를 커밋하지 않습니다.

관리자 설정 접근:

- `ADMIN_PASSWORD`: `/admin-login`에서 입력하는 관리자 비밀번호입니다.
- `ADMIN_SESSION_SECRET`: HttpOnly 관리자 세션 쿠키 서명에 사용합니다. 충분히 긴 랜덤 문자열을 사용합니다.

## 주요 화면

- 대시보드: 후보/보유/과열/보유 강화 요약, 시장 히트맵, 핵심 시나리오
- 산업 시나리오: 산업별 핵심 밸류체인과 세부 섹터 흐름
- 국내 증시 브리핑: 강한 흐름, 약한 흐름, 이벤트 요약
- 밸류체인 & 핵심 기업: 밸류체인별 핵심 기술, 대표 기업, 시장 유동성, 시장 반응
- 기업진단 보드: 그룹 지배구조와 보유 관계 요약
- 종목 스크리너 & 스코어링: 시장/테마/점수/밸류 상태/최종판정 필터
- 보유종목 & 이슈: 보유 비중, 투자논리, 최근 이슈, 알림센터
- 설정: 관리자에게만 보이는 API 연결 상태와 표시 정책

## API 구조

로컬 개발:

```txt
server/api.ts
vite.config.ts configureServer()
```

Vercel 프로덕션:

```txt
api/market-data.ts
api/technical-signals.ts
api/quotes/naver/[symbol].ts
api/quotes/domestic/[symbol].ts
api/status.ts
api/admin/login.ts
api/admin/me.ts
api/admin/logout.ts
```

공통 데이터 수집과 계산 로직은 `server/api.ts`와 `server/adminAuth.ts`에 두고, Vercel 함수는 얇은 요청/응답 어댑터로 유지합니다.

## 데이터 소스

- Naver Pay Securities delayed quote provider: 국내 종목 현재가/등락률/거래량/시가총액 참고 시세
- KRX: 국내 지수/종목 일별 시세
- FMP: 미국 종목 가격/시총 스냅샷
- Stooq: 미국 지수/종목 보완 데이터
- Naver Search API: 국내 종목 뉴스/이슈
- NewsAPI: 미국 종목 뉴스/이슈
- OpenDART: 국내 공시 기반 알림
- SEC EDGAR: 미국 종목 메타데이터 보강

국내 현재가는 공식 실시간 체결 데이터가 아니며, 자동매매/고빈도 호출/체결 판단에는 사용하지 않습니다. 실패 시 KRX 일별 종가, 기준 데이터 순서로 보완합니다.
