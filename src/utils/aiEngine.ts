import type { Decision, GameTestData, TrendAnalysisResult } from '../types/gameTest';

interface GeminiInsightResponse {
  executiveSummaryKor: string;
  whatIsWorkingKor: string;
  keyRiskKor: string;
  whyItMattersKor: string;
  recommendedDirectionKor: string;
}

export function isGeminiEnabled(): boolean {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(key && key !== 'your_gemini_api_key_here');
}

export async function generateGeminiInsight(
  data: GameTestData,
  decision: Decision,
  trendData?: TrendAnalysisResult | null
): Promise<GeminiInsightResponse | null> {
  if (!isGeminiEnabled()) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(data, decision, trendData) }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 1200 },
        }),
      }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const json = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1] ?? text;
    return JSON.parse(json) as GeminiInsightResponse;
  } catch (error) {
    console.error('Gemini insight generation failed', error);
    return null;
  }
}

function optionalMetricLines(data: GameTestData): string {
  const entries: Array<[string, number | undefined, string]> = [
    ['D0 튜토리얼 완료율', data.d0TutorialCompletion, '%'],
    ['첫 세션 이탈률', data.firstSessionDropoff, '%'],
    ['광고 시청 완료율', data.adWatchCompletion, '%'],
    ['스토어 전환율', data.storeConversion, '%'],
    ['D14 잔존율', data.d14Retention, '%'],
    ['D30 잔존율', data.d30Retention, '%'],
    ['ROAS', data.roas, '%'],
    ['LTV', data.ltv, '$'],
  ];
  const lines = entries
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([label, value, unit]) => `- ${label}: ${unit === '$' ? '$' : ''}${value}${unit === '$' ? '' : unit}`);
  return lines.length > 0 ? lines.join('\n') : '- 추가 지표 없음';
}

function buildPrompt(data: GameTestData, decision: Decision, trendData?: TrendAnalysisResult | null): string {
  const trendSummary = trendData
    ? trendData.clusters.map((cluster) => `${cluster.name}: ${cluster.count}건, 부정 ${cluster.sentimentRatio}%, 태그 ${cluster.tags.join('/')}`).join('\n')
    : '동향 CSV 없음';

  return `너는 캐주얼 게임 퍼블리싱 PM이다. 아래 KPI, 선택 입력 지표, 동향 요약을 바탕으로 한국어 인사이트만 JSON으로 작성하라.

중요:
- 입력되지 않은 선택 지표는 판단 근거로 쓰지 마라.
- 최종 결정(${decision.toUpperCase()}) 자체는 앱의 점수 엔진이 계산한 값이다. 너는 그 결정을 설명하고 다음 액션을 구체화한다.

게임: ${data.gameName}
장르: ${data.gameGenre}
결정: ${decision.toUpperCase()}

기본 KPI:
- CPI: $${data.cpi}
- CTR: ${data.ctr}%
- IPM: ${data.ipm}
- D1/D3/D7 잔존율: ${data.d1Retention}% / ${data.d3Retention}% / ${data.d7Retention}%
- ARPDAU: $${data.arpdau}
- 첫날 플레이: ${data.day1Playtime}분

선택 입력 지표:
${optionalMetricLines(data)}

동향 클러스터:
${trendSummary}

반드시 아래 JSON 형식만 반환:
{
  "executiveSummaryKor": "...",
  "whatIsWorkingKor": "...",
  "keyRiskKor": "...",
  "whyItMattersKor": "...",
  "recommendedDirectionKor": "..."
}`;
}
