# Game Test Insight Copilot

> 게임 소프트런치 KPI + 유저 동향 원문을 한 번에 입력하면, **Gemini 3.0 Flash**가 Scale / Iterate / Kill 결정 방향과 다음 실험 액션·회의 요약문까지 한 화면에서 생성하는 퍼블리싱 PM용 코파일럿.

**Supercent AI 프로덕트 기획자 과제 제출용 프로토타입 · 2026년 5월**

- **🌐 라이브 데모**: <https://game-test-insight-copilot.onrender.com>
- **📂 GitHub**: <https://github.com/windcastle2001/game-test-insight-copilot>
- **📄 과제 문서**: 리포지터리 루트 상위의 `임광윤_AI프로덕트기획자_과제전형.md`

---

## 60초 평가자 체험 가이드

1. 라이브 데모 URL 접속
2. 입력 패널 최상단 **샘플 게임 카드 3종** 중 하나 클릭 (예: `SCALE — 아이들 아일랜드 셰프`)
3. 라이브 지표 + 동향 원문이 자동으로 채워짐
4. 페이지 하단의 **`Gemini로 분석 생성`** 버튼 클릭
5. 진행 모달에서 `(N/총개수청크)` 진행률 확인 — 약 1~2분 소요
6. 결과 확인 → **`분석 결과 PDF 다운로드`** (보라색 버튼) → A4 PDF 한 파일로 저장

---

## 핵심 기능

| 영역 | 기능 |
|---|---|
| **데이터 입력** | ① raw 지표 CSV 업로드 (캠페인/노출/클릭/설치/리텐션 등 19개 기본 + 커스텀 컬럼) ② 동향 CSV 업로드 (date / source / title / content / category) ③ 샘플 게임 3종 1클릭 로드 |
| **자동 KPI 계산** | raw data → CPI / CTR / IPM / D1·D3·D7 / ARPDAU / Day1 Playtime + 선택 지표 (D14, D30, ROAS, LTV, 튜토리얼 완료율, 광고 시청 완료율, 스토어 전환율) |
| **AI 동향 분석** | Gemini 3.0 Flash가 동향 원문을 100건 단위 청크로 직접 읽고, 각 원문을 단일 대표 테마에 배정 (count 합 = 입력 행 수) |
| **AI 의사결정** | KPI + 동향 분석 결과 + 임계값을 함께 Gemini에 전달 → Scale / Iterate / Kill, 판단 근거 강도, 핵심 병목, 결정 근거(지표+동향 연결 가설) |
| **시각화** | Decision Summary 색상 카드 / KPI Health Dashboard / Retention Trend / Marketability×Retention Matrix / AI Insight 5개 카드 / 실험 계획 표 / 회의 요약 (한·영) |
| **보고 자동화** | A4 PDF 한 파일 다운로드 (`GameTestInsight_<게임명>_<날짜>.pdf`) + 회의 요약 클립보드 복사 |
| **진행 상황** | 분석 시 진행 모달 + 실시간 프로그레스 바 |

---

## 샘플 데이터 (라이브 데모에 내장)

| 게임명 | 기대 결론 | 데이터 |
|---|---|---|
| 머지 스낵 스프린트 | 🟡 ITERATE | 7일 기본 지표 + 동향 300건 |
| 아이들 아일랜드 셰프 | 🟢 SCALE | 14일 + 튜토리얼 지표 + 동향 600건 |
| 러너 팩토리 러쉬 | 🔴 KILL | 14일 풀옵션 지표 + 동향 350건 |

CSV 원본은 `public/samples/` 폴더에 포함돼 있어 직접 다운로드/검토할 수 있습니다.

---

## 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | React 18 + TypeScript + Vite | |
| 스타일링 | Tailwind CSS v4 + 슈퍼센트 디자인 토큰 | Pink `#FF1FA8` / Yellow `#F5C300` / Purple `#5B2D8E` |
| 차트 | recharts | Retention Trend, Marketability × Retention |
| 아이콘 | lucide-react | |
| CSV 파싱 | papaparse | UTF-8 BOM 자동 처리 |
| PDF 생성 | jsPDF + html2canvas | A4 다중 페이지 지원 |
| AI API | Gemini 3.0 Flash Preview | `responseMimeType: application/json` + `responseJsonSchema` 강제 |
| 호스팅 | Render Static Site | GitHub 연동 자동 배포 |

---

## 로컬 실행

```bash
git clone https://github.com/windcastle2001/game-test-insight-copilot.git
cd game-test-insight-copilot
npm install
cp .env.example .env   # 또는 .env 직접 생성
# .env 파일에 VITE_GEMINI_API_KEY 입력
npm run dev
```

브라우저에서 <http://localhost:5173> 접속.

### 환경 변수

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> Gemini API 키가 없으면 분석 버튼 클릭 시 에러 모달이 표시됩니다. 무료 키는 <https://aistudio.google.com/app/apikey> 에서 발급 가능합니다.

### 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성됩니다.

---

## 코드 구조

```
src/
├── components/
│   ├── Header.tsx              # 슈퍼센트 브랜딩 헤더
│   ├── InputPanel.tsx          # 샘플 카드 + 지표/동향 업로드 + 세팅 모달
│   ├── DecisionSummary.tsx     # Scale/Iterate/Kill 결정 카드
│   ├── KpiHealthDashboard.tsx
│   ├── ChartSection.tsx
│   ├── AiInsightSection.tsx
│   ├── ExperimentPlan.tsx
│   └── MeetingSummary.tsx
├── utils/
│   ├── aiEngine.ts             # Gemini 호출 + JSON 파싱 안정화 (4단계 폴백)
│   ├── analysisEngine.ts       # KPI 검산 + Gemini 호출 오케스트레이션
│   ├── trendEngine.ts          # 동향 CSV 파싱 + 로컬 클러스터링
│   ├── rawDataEngine.ts        # raw CSV → KPI 자동 계산
│   ├── scoring.ts              # KPI 임계값 판정
│   ├── sampleLoader.ts         # 샘플 CSV 원클릭 로드
│   └── pdfExport.ts            # html2canvas + jsPDF
├── types/gameTest.ts
├── App.tsx
└── index.css                   # 슈퍼센트 디자인 토큰
```

---

## CSV 입력 스펙

### Raw 지표 CSV (19개 기본 컬럼)

```csv
game_name,game_genre,test_period,date,campaign_name,impressions,clicks,installs,
spend_usd,dau,new_users,revenue_usd,cohort_date,d1_active_users,d3_active_users,
d7_active_users,ad_revenue_usd,iap_revenue_usd,avg_session_minutes
머지 스낵 스프린트,하이퍼캐주얼,2026-05-01 ~ 2026-05-07,2026-05-01,
미국_TikTok_소재A,49920,1043,1338,602.1,1705,1445,37.94,
2026-05-01,448,210,84,31.11,6.83,5.7
```

추가로 커스텀 지표 컬럼은 입력 패널의 **`raw 지표 선택`** 모달에서 자유롭게 추가/삭제할 수 있으며, 빈 양식 다운로드 버튼이 선택된 컬럼 기준으로 양식 CSV를 생성합니다.

### 동향 CSV

```csv
date,source,title,content,category
2026-05-01,Google Play,중간부터 난이도가 확 올라감,
처음에는 술술 넘어가다가 특정 스테이지부터 갑자기 막혀요...,user_review
```

---

## 분석 파이프라인

```
[CSV 업로드]
    ↓
[Raw KPI 자동 계산]  rawDataEngine.ts
    ↓
[동향 청크 분할]  100건 단위
    ↓
[Gemini 3.0 Flash — 동향 청크별 분석]  병렬 아닌 순차 (rate limit 고려)
    ↓ each chunk: themes/sources/representativeTexts/userRequests/decisionImplication
[청크 결과 취합]  가중평균(부정 비율 × 건수) → 최종 테마 / 통계
    ↓
[Gemini 3.0 Flash — 최종 의사결정]  KPI + 임계값 + 동향 분석 결과 → JSON 스키마 강제
    ↓
[화면 출력]  Decision / KPI / Charts / AI Insight / 실험계획 / 회의요약
```

---

## JSON 응답 안정화 (4단계 파싱 폴백)

Gemini가 한국어 리뷰 원문을 인용할 때 raw 줄바꿈/제어문자가 JSON 문자열에 그대로 들어가 파싱이 깨지는 케이스를 막기 위해 구현:

1. **원본 그대로** `JSON.parse`
2. **제어 문자 제거** (`\x00-\x1F` + `\x7F`) 후 재시도
3. **trailing comma 제거** (`,]` → `]`) 후 재시도
4. **응답 토큰 한도 잘림 복구** — 열린 `[`·`{`를 자동 닫고 마지막 미완성 토큰 트리밍

추가로 응답 토큰 한도는 `32768`로 설정해 한국어 리뷰 100건 청크가 한 번에 들어가도록 헤드룸 확보.

---

## Render 배포

- **자동 배포**: GitHub `main` 브랜치 푸시 시 Render가 자동 빌드
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**: `VITE_GEMINI_API_KEY`
- **SPA 라우팅**: `public/_redirects` 에 `/* /index.html 200` 설정 (포함됨)

---

## 향후 확장 가능성

- **실시간 데이터 연동** — AppsFlyer / Adjust / Firebase Analytics API
- **벤치마크 자동 갱신** — Sensor Tower / data.ai API로 장르·지역별 기준값
- **광고 소재 분석** — Gemini Vision으로 크리에이티브 클러스터링
- **VOC 자동 수집** — Google Play / App Store 리뷰 API + Discord/Reddit 크롤러
- **자동 리포팅** — Slack / Notion / Google Slides 연동 (Function Calling)
- **테스트 이력 저장** — Supabase / Firebase로 분석 결과 영구 보관 + 버전별 비교
- **임베딩 기반 유사 게임 추천** — 과거 테스트 결과 중 유사 패턴 자동 검색

---

## 라이선스

이 프로젝트는 슈퍼센트 AI 프로덕트 기획자 과제 제출용으로 작성되었습니다. 평가 목적 외 사용은 제한됩니다.

---

*Built with Claude Code, Codex, and ChatGPT — 2026년 5월*
