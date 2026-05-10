import type { AnalysisSettings, Decision, ExperimentItem, GameTestData, TrendAnalysisResult } from '../types/gameTest';

export interface GeminiAnalysisResponse {
  decision: Decision;
  confidence: number;
  marketabilityScore?: number;
  retentionScore?: number;
  monetizationScore?: number;
  korBottleneck: string;
  korFocus: string;
  decisionReasons: string[];
  formulaSummary: string;
  experimentPlan: ExperimentItem[];
  aiInsight: {
    executiveSummaryKor: string;
    whatIsWorkingKor: string;
    keyRiskKor: string;
    whyItMattersKor: string;
    recommendedDirectionKor: string;
  };
}

export interface GeminiAnalysisResult {
  analysis: GeminiAnalysisResponse | null;
  statusMessage: string;
}

export function isGeminiEnabled(): boolean {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(key && key !== 'your_gemini_api_key_here');
}

export async function generateGeminiAnalysis(
  data: GameTestData,
  settings: AnalysisSettings,
  localContext: {
    decision: Decision;
    confidence: number;
    marketabilityScore: number;
    retentionScore: number;
    monetizationScore: number;
    decisionReasons: string[];
    formulaSummary: string;
    korBottleneck: string;
  },
  trendData?: TrendAnalysisResult | null
): Promise<GeminiAnalysisResult> {
  if (!isGeminiEnabled()) return { analysis: null, statusMessage: 'Gemini API 키가 설정되지 않아 로컬 분석으로 대체했습니다.' };
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(data, settings, localContext, trendData) }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 2400 },
        }),
      }
    );
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      return { analysis: null, statusMessage: `Gemini 호출 실패: HTTP ${response.status}${message ? ` - ${message.slice(0, 160)}` : ''}` };
    }
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const json = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? text;
    return { analysis: normalizeGeminiResponse(JSON.parse(json.trim())), statusMessage: 'Gemini API가 KPI, raw data, 동향을 사용해 최종 분석을 생성했습니다.' };
  } catch (error) {
    console.error('Gemini analysis generation failed', error);
    return { analysis: null, statusMessage: `Gemini 응답 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
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

function rawMetricSummaryLines(data: GameTestData): string {
  return data.rawMetricSummary?.length ? data.rawMetricSummary.map((line) => `- ${line}`).join('\n') : '- 커스텀 raw 지표 없음';
}

function settingsLines(settings: AnalysisSettings): string {
  return Object.entries(settings.thresholds)
    .map(([key, value]) => `- ${key}: good ${value.good}, watch ${value.watch}`)
    .join('\n');
}

function normalizeDecision(value: unknown): Decision {
  if (value === 'scale' || value === 'iterate' || value === 'kill') return value;
  const lowered = String(value ?? '').toLowerCase();
  if (lowered.includes('scale')) return 'scale';
  if (lowered.includes('kill')) return 'kill';
  return 'iterate';
}

function clampScore(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function normalizeGeminiResponse(value: any): GeminiAnalysisResponse {
  const insight = value?.aiInsight ?? value ?? {};
  return {
    decision: normalizeDecision(value?.decision),
    confidence: clampScore(value?.confidence, 70),
    marketabilityScore: Number.isFinite(Number(value?.marketabilityScore)) ? clampScore(value.marketabilityScore, 0) : undefined,
    retentionScore: Number.isFinite(Number(value?.retentionScore)) ? clampScore(value.retentionScore, 0) : undefined,
    monetizationScore: Number.isFinite(Number(value?.monetizationScore)) ? clampScore(value.monetizationScore, 0) : undefined,
    korBottleneck: String(value?.korBottleneck ?? insight.keyRiskKor ?? 'Gemini 분석 결과 핵심 병목을 확인해야 합니다.'),
    korFocus: String(value?.korFocus ?? value?.recommendedFocus ?? '핵심 KPI 개선'),
    decisionReasons: asStringArray(value?.decisionReasons).slice(0, 6),
    formulaSummary: String(value?.formulaSummary ?? 'Gemini가 KPI, 기준값, 동향 클러스터를 함께 검토해 결론을 도출했습니다.'),
    experimentPlan: Array.isArray(value?.experimentPlan) ? value.experimentPlan.slice(0, 5).map((item: any, index: number) => ({
      priority: Number(item?.priority) || index + 1,
      experiment: String(item?.experiment ?? item?.experimentKor ?? '개선 실험'),
      experimentKor: String(item?.experimentKor ?? item?.experiment ?? '개선 실험'),
      targetKpi: String(item?.targetKpi ?? '핵심 KPI'),
      expectedImpact: String(item?.expectedImpact ?? item?.expectedImpactKor ?? '개선 효과 확인'),
      expectedImpactKor: String(item?.expectedImpactKor ?? item?.expectedImpact ?? '개선 효과 확인'),
      owner: String(item?.owner ?? item?.ownerKor ?? 'PM'),
      ownerKor: String(item?.ownerKor ?? item?.owner ?? 'PM'),
    })) : [],
    aiInsight: {
      executiveSummaryKor: String(insight.executiveSummaryKor ?? 'Gemini 분석 요약을 생성하지 못했습니다.'),
      whatIsWorkingKor: String(insight.whatIsWorkingKor ?? '상대적으로 유지할 강점을 추가 확인해야 합니다.'),
      keyRiskKor: String(insight.keyRiskKor ?? value?.korBottleneck ?? '핵심 리스크를 추가 확인해야 합니다.'),
      whyItMattersKor: String(insight.whyItMattersKor ?? '소프트 론칭 판단은 KPI와 유저 반응을 함께 해석해야 합니다.'),
      recommendedDirectionKor: String(insight.recommendedDirectionKor ?? '우선순위가 높은 실험부터 재검증하세요.'),
    },
  };
}

function buildPrompt(
  data: GameTestData,
  settings: AnalysisSettings,
  localContext: {
    decision: Decision;
    confidence: number;
    marketabilityScore: number;
    retentionScore: number;
    monetizationScore: number;
    decisionReasons: string[];
    formulaSummary: string;
    korBottleneck: string;
  },
  trendData?: TrendAnalysisResult | null
): string {
  const trendSummary = trendData
    ? trendData.clusters.map((cluster) => `${cluster.name}: ${cluster.count}건, 부정 ${cluster.sentimentRatio}%, 태그 ${cluster.tags.join('/')}`).join('\n')
    : '동향 CSV 없음';

  const customPrompt = settings.customPrompt?.trim()
    ? `\n사용자 추가 분석 지시:\n${settings.customPrompt.trim()}\n`
    : '';

  return `너는 캐주얼 게임 퍼블리싱 PM이자 데이터 분석가다. 아래 KPI, 기준값, 선택 지표, 동향 클러스터를 모두 사용해서 최종 퍼블리싱 판단까지 직접 내려라.

중요:
- 입력되지 않은 선택 지표는 판단 근거로 쓰지 마라.
- 로컬 계산값은 참고용 검산 자료다. 최종 decision, confidence, decisionReasons, formulaSummary, experimentPlan, aiInsight는 네가 반환한 JSON을 앱이 우선 사용한다.
- 단, 숫자와 기준값을 무시하고 감으로 판단하지 마라. 기준값 대비 어느 축이 약한지와 동향 클러스터가 그 판단을 강화/완화하는지 설명하라.
- Scale은 확장 가능한 지표가 복수 축에서 확인될 때, Iterate는 개선 실험 후 재검증이 필요할 때, Kill은 유입/잔존/수익화/유저 반응이 구조적으로 약할 때만 선택하라.

게임: ${data.gameName}
장르: ${data.gameGenre}
테스트 기간: ${data.testPeriod}

기본 KPI:
- CPI: $${data.cpi}
- CTR: ${data.ctr}%
- IPM: ${data.ipm}
- D1/D3/D7 잔존율: ${data.d1Retention}% / ${data.d3Retention}% / ${data.d7Retention}%
- ARPDAU: $${data.arpdau}
- 첫날 플레이: ${data.day1Playtime}분

선택 입력 지표:
${optionalMetricLines(data)}

커스텀 raw 지표 요약:
${rawMetricSummaryLines(data)}

사용 중인 기준값:
${settingsLines(settings)}

로컬 검산 참고:
- 로컬 후보 결정: ${localContext.decision.toUpperCase()} / 신뢰도 ${localContext.confidence}%
- 시장성/리텐션/수익화 참고 점수: ${localContext.marketabilityScore}/${localContext.retentionScore}/${localContext.monetizationScore}
- 로컬 판단 요약: ${localContext.formulaSummary}
- 로컬 병목: ${localContext.korBottleneck}
- 로컬 근거: ${localContext.decisionReasons.join(' | ')}

동향 클러스터:
${trendSummary}
${customPrompt}

반드시 아래 JSON 형식만 반환:
{
  "decision": "scale | iterate | kill",
  "confidence": 0,
  "marketabilityScore": 0,
  "retentionScore": 0,
  "monetizationScore": 0,
  "korBottleneck": "...",
  "korFocus": "...",
  "decisionReasons": ["...", "...", "..."],
  "formulaSummary": "KPI와 동향을 종합한 판단 근거 요약",
  "experimentPlan": [
    {
      "priority": 1,
      "experiment": "...",
      "experimentKor": "...",
      "targetKpi": "...",
      "expectedImpact": "...",
      "expectedImpactKor": "...",
      "owner": "...",
      "ownerKor": "..."
    }
  ],
  "aiInsight": {
  "executiveSummaryKor": "...",
  "whatIsWorkingKor": "...",
  "keyRiskKor": "...",
  "whyItMattersKor": "...",
  "recommendedDirectionKor": "..."
  }
}`;
}
