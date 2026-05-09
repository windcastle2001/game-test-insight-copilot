/**
 * AI Engine — Gemini API 어댑터
 *
 * 현재 상태: Rule-based 분석 엔진 사용 (utils/analysisEngine.ts)
 * 향후: VITE_GEMINI_API_KEY 환경변수 설정 시 Gemini API로 교체 가능
 *
 * 교체 방법:
 * 1. .env 파일에 VITE_GEMINI_API_KEY=your_key 입력
 * 2. isGeminiEnabled() → true 반환 확인
 * 3. generateGeminiInsight() 함수 구현체 교체
 */

import type { GameTestData } from '../types/gameTest';

export function isGeminiEnabled(): boolean {
  return Boolean(
    import.meta.env.VITE_GEMINI_API_KEY &&
    import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );
}

interface GeminiInsightResponse {
  executiveSummaryKor: string;
  whatIsWorkingKor: string;
  keyRiskKor: string;
  whyItMattersKor: string;
  recommendedDirectionKor: string;
}

/**
 * Gemini API 호출 준비 함수
 * 현재는 null을 반환하며, API 키 설정 시 실제 응답 반환
 */
export async function generateGeminiInsight(
  data: GameTestData,
  decision: string
): Promise<GeminiInsightResponse | null> {
  if (!isGeminiEnabled()) {
    return null;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const prompt = buildGeminiPrompt(data, decision);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const result = await response.json();
    const text: string = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // JSON 파싱 시도
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as GeminiInsightResponse;
    }

    return null;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    return null;
  }
}

function buildGeminiPrompt(data: GameTestData, decision: string): string {
  return `당신은 하이퍼캐주얼 / 하이브리드캐주얼 게임 퍼블리싱 전문가입니다.
아래 소프트런치 테스트 데이터를 분석하고, JSON 형식으로 한국어 인사이트를 작성하세요.

게임명: ${data.gameName}
장르: ${data.gameGenre}
결정: ${decision.toUpperCase()}

KPI 지표:
- CPI: $${data.cpi}
- CTR: ${data.ctr}%
- IPM: ${data.ipm}
- D1 잔존율: ${data.d1Retention}%
- D3 잔존율: ${data.d3Retention}%
- D7 잔존율: ${data.d7Retention}%
- ARPDAU: $${data.arpdau}
- 첫날 플레이 시간: ${data.day1Playtime}분

아래 JSON 형식으로만 응답하세요 (코드블록 포함):

\`\`\`json
{
  "executiveSummaryKor": "100자 내외의 종합 요약",
  "whatIsWorkingKor": "잘 작동하고 있는 부분 설명",
  "keyRiskKor": "핵심 리스크 설명",
  "whyItMattersKor": "이것이 중요한 이유",
  "recommendedDirectionKor": "구체적인 다음 액션 방향"
}
\`\`\``;
}
