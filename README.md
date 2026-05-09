# Game Test Insight Copilot

> AI 기반 게임 소프트런치 퍼블리싱 의사결정 도구  
> Supercent AI 프로덕트 기획자 과제 제출용 프로토타입

---

## 제품 개요

하이퍼캐주얼 / 하이브리드캐주얼 게임의 소프트런칭 KPI 데이터를 입력하면,  
AI가 **Scale / Iterate / Kill** 결정을 제안하고 다음 실험 액션까지 자동 생성하는 코파일럿 도구입니다.

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| KPI 입력 | CPI, CTR, IPM, D1/D3/D7 잔존율, ARPDAU, 플레이타임 |
| 샘플 게임 선택 | 3종 프리셋 (Scale / Iterate / Kill 케이스) |
| CSV 업로드 | 커스텀 게임 데이터 업로드 |
| Decision 도출 | Scale / Iterate / Kill + 신뢰도 % |
| KPI 상태 판단 | Good / Watch / Risk 상태 카드 |
| AI Insight | 5개 섹션 한국어/영어 인사이트 |
| 실험 계획 | 우선순위별 다음 실험 액션 |
| 회의 요약문 | 클립보드 복사 기능 |

---

## 기술 스택

- **프레임워크**: React + TypeScript + Vite
- **스타일링**: Tailwind CSS v4 (슈퍼센트 디자인 토큰)
- **차트**: recharts
- **아이콘**: lucide-react
- **애니메이션**: framer-motion
- **CSV 파싱**: papaparse
- **배포**: Render (Static Site)

---

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일 생성

---

## 환경 변수

`.env` 파일 생성 후 Gemini API 키 설정 (선택):

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

현재 프로토타입은 rule-based 분석 엔진을 사용합니다.  
API 키 입력 시 Gemini API로 인사이트가 강화됩니다.

---

## CSV 업로드 포맷

```csv
game_name,cpi,ctr,ipm,d1_retention,d3_retention,d7_retention,arpdau,day1_playtime
My Casual Game,0.45,2.1,28,32,14,6,0.025,6.5
```

---

## KPI 판단 기준 (Prototype Benchmark)

| KPI | Good | Watch | Risk |
|-----|------|-------|------|
| CPI ($) | ≤ 0.40 | 0.40~0.80 | > 0.80 |
| CTR (%) | ≥ 2.5 | 1.5~2.5 | < 1.5 |
| IPM | ≥ 35 | 20~35 | < 20 |
| D1 Retention (%) | ≥ 35 | 25~35 | < 25 |
| D3 Retention (%) | ≥ 18 | 10~18 | < 10 |
| D7 Retention (%) | ≥ 8 | 4~8 | < 4 |
| ARPDAU ($) | ≥ 0.04 | 0.02~0.04 | < 0.02 |
| Day1 Playtime (분) | ≥ 8 | 5~8 | < 5 |

> 이 기준은 프로토타입 내부 벤치마크이며, 실제 업계 절대 기준과 다를 수 있습니다.

---

## Render 배포

1. GitHub에 리포지터리 push
2. Render에서 New Static Site 생성
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Environment Variable: `VITE_GEMINI_API_KEY` 설정 (선택)

---

## 샘플 게임

| 게임명 | 예상 결론 | 특징 |
|--------|---------|------|
| Idle Dungeon Tycoon | Iterate | 마케팅 지표 양호, 리텐션 약함 |
| Block Puzzle Legend | Scale | 전반적으로 우수한 성과 |
| Runner Rush | Kill | 대부분의 지표가 Risk 수준 |

---

*슈퍼센트 AI 프로덕트 기획자 과제 제출용 — 2026년 5월*
