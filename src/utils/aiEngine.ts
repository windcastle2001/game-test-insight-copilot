import type { AnalysisSettings, Decision, ExperimentItem, GameTestData, TrendAnalysisResult, TrendDataRow } from '../types/gameTest';

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

interface GeminiTrendChunkResponse {
  range: string;
  count: number;
  themes: TrendAnalysisResult['themes'];
  topInsights: string[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
}

const geminiAnalysisSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['scale', 'iterate', 'kill'] },
    confidence: { type: 'integer', description: '결론 적중 확률이 아니라 업로드된 KPI와 동향 신호가 최종 결정을 얼마나 일관되게 지지하는지 나타내는 판단 근거 강도. 0~100 정수.' },
    marketabilityScore: { type: 'integer' },
    retentionScore: { type: 'integer' },
    monetizationScore: { type: 'integer' },
    korBottleneck: { type: 'string' },
    korFocus: { type: 'string' },
    decisionReasons: {
      type: 'array',
      items: { type: 'string' },
      description: '개별 지표 나열이 아니라 지표 2개 이상 또는 지표와 동향을 연결한 구체적 판단 근거.',
    },
    formulaSummary: { type: 'string', description: '판단 근거 강도가 왜 그 수치인지 설명. 결론 적중률처럼 쓰지 말 것.' },
    experimentPlan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer' },
          experiment: { type: 'string' },
          experimentKor: { type: 'string' },
          targetKpi: { type: 'string' },
          expectedImpact: { type: 'string' },
          expectedImpactKor: { type: 'string' },
          owner: { type: 'string' },
          ownerKor: { type: 'string' },
        },
        required: ['priority', 'experiment', 'experimentKor', 'targetKpi', 'expectedImpact', 'expectedImpactKor', 'owner', 'ownerKor'],
      },
    },
    aiInsight: {
      type: 'object',
      properties: {
        executiveSummaryKor: { type: 'string' },
        whatIsWorkingKor: { type: 'string' },
        keyRiskKor: { type: 'string' },
        whyItMattersKor: { type: 'string' },
        recommendedDirectionKor: { type: 'string' },
      },
      required: ['executiveSummaryKor', 'whatIsWorkingKor', 'keyRiskKor', 'whyItMattersKor', 'recommendedDirectionKor'],
    },
  },
  required: [
    'decision',
    'confidence',
    'marketabilityScore',
    'retentionScore',
    'monetizationScore',
    'korBottleneck',
    'korFocus',
    'decisionReasons',
    'formulaSummary',
    'experimentPlan',
    'aiInsight',
  ],
};

const geminiTrendChunkSchema = {
  type: 'object',
  properties: {
    range: { type: 'string' },
    count: { type: 'integer' },
    themes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string' },
          count: { type: 'integer' },
          negativeRatio: { type: 'integer' },
          sources: { type: 'array', items: { type: 'string' } },
          representativeTexts: { type: 'array', items: { type: 'string' } },
          userRequests: { type: 'array', items: { type: 'string' } },
          decisionImplication: { type: 'string' },
        },
        required: ['tag', 'count', 'negativeRatio', 'sources', 'representativeTexts', 'userRequests', 'decisionImplication'],
      },
    },
    topInsights: { type: 'array', items: { type: 'string' } },
    overallSentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['range', 'count', 'themes', 'topInsights', 'overallSentiment'],
};

export function isGeminiEnabled(): boolean {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(key && key !== 'your_gemini_api_key_here');
}

function sanitizeJsonText(text: string): string {
  // Strip control characters that break JSON parsing (keep \t \n \r which are valid)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function tryParseJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  try { return JSON.parse(sanitizeJsonText(text)); } catch {}
  const cleaned = sanitizeJsonText(text).replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(cleaned);
}

async function callGeminiJson(prompt: string, schema: object, maxOutputTokens = 8192): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
        },
      }),
    }
  );
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Gemini 호출 실패: HTTP ${response.status}${message ? ` - ${message.slice(0, 240)}` : ''}`);
  }
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return tryParseJson(extractJson(text));
}

function rowsToPromptLines(rows: TrendDataRow[], offset: number): string {
  return rows
    .map((row, index) => {
      const title = row.title?.trim() || '제목 없음';
      const content = row.content?.trim() || '내용 없음';
      return `${offset + index + 1}. [${row.source || 'Unknown'} / ${row.category || 'uncategorized'} / ${row.date || '-'}] ${title} - ${content}`;
    })
    .join('\n');
}

function buildTrendChunkPrompt(rows: TrendDataRow[], offset: number, totalCount: number): string {
  const from = offset + 1;
  const to = offset + rows.length;
  return `너는 게임 리뷰/VOC 분석가다. 아래 원문 동향 ${from}-${to}번을 직접 읽고, 유저가 실제로 말한 이슈를 중복 없이 묶어라.

분석 규칙:
- 각 원문 1건은 반드시 대표 테마 1개에만 배정한다. themes의 count 합계는 반드시 ${rows.length}가 되어야 한다.
- 단순 키워드 매칭이 아니라 문맥으로 묶어라. 예: "광고가 많아서 흐름이 끊김"은 광고 피로, "설치하고 보니 광고랑 다름"은 스토어/광고소재.
- 부정 비율은 해당 테마 안에서 불만/요청/문제 제기 문장의 비중이다. "좋겠어요", "줄여주세요", "아쉬워요"는 보통 개선 요청 또는 부정 신호다.
- 대표 원문은 실제 원문에서 의미가 뚜렷한 문장만 짧게 골라라.
- userRequests는 실무자가 바로 실험 항목으로 바꿀 수 있게 구체적으로 써라.
- decisionImplication은 KPI 의사결정에 어떤 의미가 있는지 써라.

전체 원문 수: ${totalCount}건
이번 청크: ${from}-${to} (${rows.length}건)

원문:
${rowsToPromptLines(rows, offset)}

JSON 객체만 반환하라.`;
}

function normalizeCount(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function normalizeRatio(value: unknown): number {
  const parsed = normalizeCount(value, 0);
  return Math.min(100, Math.max(0, parsed));
}

function normalizeTrendChunk(value: any, rows: TrendDataRow[], offset: number): GeminiTrendChunkResponse {
  const range = `${offset + 1}-${offset + rows.length}`;
  const rawThemes = Array.isArray(value?.themes) ? value.themes : [];
  let themes = rawThemes
    .map((theme: any) => ({
      tag: String(theme?.tag ?? '기타').trim() || '기타',
      count: normalizeCount(theme?.count),
      negativeRatio: normalizeRatio(theme?.negativeRatio),
      sources: Array.isArray(theme?.sources) ? theme.sources.map((source: unknown) => String(source)).filter(Boolean).slice(0, 4) : [],
      representativeTexts: Array.isArray(theme?.representativeTexts) ? theme.representativeTexts.map((text: unknown) => String(text)).filter(Boolean).slice(0, 3) : [],
      userRequests: Array.isArray(theme?.userRequests) ? theme.userRequests.map((text: unknown) => String(text)).filter(Boolean).slice(0, 3) : [],
      decisionImplication: String(theme?.decisionImplication ?? '동향 원문 기반으로 추가 확인이 필요합니다.'),
    }))
    .filter((theme: TrendAnalysisResult['themes'][number]) => theme.count > 0);

  const currentTotal = themes.reduce((sum: number, theme: TrendAnalysisResult['themes'][number]) => sum + theme.count, 0);
  if (currentTotal > rows.length && currentTotal > 0) {
    let remaining = rows.length;
    themes = themes.map((theme: TrendAnalysisResult['themes'][number], index: number) => {
      const count = index === themes.length - 1 ? remaining : Math.max(0, Math.round((theme.count / currentTotal) * rows.length));
      remaining -= count;
      return { ...theme, count };
    }).filter((theme: TrendAnalysisResult['themes'][number]) => theme.count > 0);
  }
  const normalizedTotal = themes.reduce((sum: number, theme: TrendAnalysisResult['themes'][number]) => sum + theme.count, 0);
  if (normalizedTotal < rows.length) {
    themes.push({
      tag: '기타',
      count: rows.length - normalizedTotal,
      negativeRatio: 0,
      sources: [...new Set(rows.map((row) => row.source).filter(Boolean))].slice(0, 4),
      representativeTexts: rows.slice(0, 2).map((row) => row.content || row.title).filter(Boolean),
      userRequests: ['추가 원문 확인 후 세부 이슈를 분리해야 합니다.'],
      decisionImplication: 'AI 청크 분석에서 명확히 분류되지 않은 잔여 동향입니다.',
    });
  }

  return {
    range,
    count: rows.length,
    themes,
    topInsights: Array.isArray(value?.topInsights) ? value.topInsights.map((text: unknown) => String(text)).filter(Boolean).slice(0, 5) : [],
    overallSentiment: value?.overallSentiment === 'positive' || value?.overallSentiment === 'negative' ? value.overallSentiment : 'neutral',
  };
}

function mergeGeminiTrendChunks(base: TrendAnalysisResult, chunks: GeminiTrendChunkResponse[]): TrendAnalysisResult {
  const themeMap = new Map<string, TrendAnalysisResult['themes'][number] & { negativeWeighted: number }>();
  chunks.forEach((chunk) => {
    chunk.themes.forEach((theme) => {
      const previous = themeMap.get(theme.tag);
      if (previous) {
        previous.negativeWeighted += theme.negativeRatio * theme.count;
        previous.count += theme.count;
        previous.sources = [...new Set([...previous.sources, ...theme.sources])].slice(0, 5);
        previous.representativeTexts = [...previous.representativeTexts, ...theme.representativeTexts].slice(0, 4);
        previous.userRequests = [...new Set([...previous.userRequests, ...theme.userRequests])].slice(0, 3);
        previous.decisionImplication = previous.decisionImplication || theme.decisionImplication;
      } else {
        themeMap.set(theme.tag, { ...theme, negativeWeighted: theme.negativeRatio * theme.count });
      }
    });
  });

  const themes = [...themeMap.values()]
    .map(({ negativeWeighted, ...theme }) => ({
      ...theme,
      negativeRatio: Math.round(negativeWeighted / Math.max(theme.count, 1)),
    }))
    .sort((a, b) => b.count - a.count || b.negativeRatio - a.negativeRatio)
    .slice(0, 10);
  const tagSummary = themes.map((theme) => ({ tag: theme.tag, count: theme.count }));
  const negativeWeighted = themes.reduce((sum, theme) => sum + theme.count * theme.negativeRatio, 0);
  const totalCount = Math.max(base.totalCount, 1);
  const negativeRatio = Math.round(negativeWeighted / totalCount);
  const overallSentiment = negativeRatio >= 45 ? 'negative' : negativeRatio <= 18 ? 'positive' : 'neutral';
  const confidenceAdjustment = overallSentiment === 'negative' ? -Math.round((negativeRatio / 100) * 15) : overallSentiment === 'positive' ? Math.round(((100 - negativeRatio) / 100) * 12) : 0;
  const chunkSummaries = chunks.map((chunk) => ({
    range: chunk.range,
    count: chunk.count,
    topTags: chunk.themes.slice(0, 3).map((theme) => `${theme.tag} ${theme.count}건`),
    summary: chunk.topInsights[0] ?? `${chunk.range}번 원문을 Gemini가 직접 읽고 대표 테마를 분류했습니다.`,
  }));
  const topInsights = [
    themes[0] ? `Gemini 원문 청크 분석 기준 가장 큰 테마는 "${themes[0].tag}" (${themes[0].count}건, 부정 ${themes[0].negativeRatio}%)입니다.` : '',
    themes[1] ? `다음 반복 테마는 "${themes[1].tag}" (${themes[1].count}건)입니다.` : '',
    chunks.flatMap((chunk) => chunk.topInsights).slice(0, 3).join(' '),
    `동향 ${base.totalCount}건을 ${chunks.length}개 청크로 나눠 Gemini가 원문 기반으로 요약/취합했습니다.`,
  ].filter(Boolean);
  const clusters = themes.map((theme) => {
    const negativeCount = Math.round((theme.count * theme.negativeRatio) / 100);
    const positiveCount = theme.negativeRatio <= 20 ? Math.max(0, theme.count - negativeCount) : 0;
    const neutralCount = Math.max(0, theme.count - negativeCount - positiveCount);
    return {
      name: theme.tag,
      count: theme.count,
      positiveCount,
      negativeCount,
      neutralCount,
      sentiment: theme.negativeRatio >= 45 ? 'negative' as const : theme.negativeRatio <= 18 ? 'positive' as const : 'neutral' as const,
      sentimentRatio: theme.negativeRatio,
      tags: [theme.tag],
      representativeTexts: theme.representativeTexts,
      averageSimilarity: 100,
    };
  });

  return {
    ...base,
    clusters,
    themes,
    chunkSummaries,
    topInsights,
    overallSentiment,
    confidenceAdjustment,
    tagSummary,
    methodDescription: 'Gemini가 업로드된 동향 원문을 청크별로 직접 읽고, 각 원문을 대표 테마 1개에만 배정한 뒤 전체 테마/건의사항/의사결정 시사점으로 다시 취합했습니다.',
  };
}

export async function generateGeminiTrendAnalysis(
  trendData: TrendAnalysisResult | null,
  onProgress?: (step: string, percent: number) => void,
): Promise<TrendAnalysisResult | null> {
  if (!trendData || trendData.totalCount === 0) return trendData;
  if (!isGeminiEnabled()) throw new Error('Gemini API 키가 설정되지 않았습니다. 동향 원문 AI 분석을 실행할 수 없습니다.');
  const rows = trendData.sourceRows ?? [];
  if (rows.length === 0) return trendData;
  const chunkSize = 100;
  const totalChunks = Math.ceil(rows.length / chunkSize);
  const chunks: GeminiTrendChunkResponse[] = [];
  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const offset = chunkIndex * chunkSize;
      const chunkRows = rows.slice(offset, offset + chunkSize);
      const percent = Math.round(15 + (chunkIndex / totalChunks) * 50);
      onProgress?.(`동향 원문 분석 중 (${chunkIndex + 1}/${totalChunks}청크)`, percent);
      const response = await callGeminiJson(buildTrendChunkPrompt(chunkRows, offset, rows.length), geminiTrendChunkSchema, 8192);
      chunks.push(normalizeTrendChunk(response, chunkRows, offset));
    }
    onProgress?.('동향 분석 결과 취합 중', 68);
    return mergeGeminiTrendChunks(trendData, chunks);
  } catch (error) {
    console.error('Gemini trend analysis failed', error);
    throw new Error(`Gemini 동향 원문 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
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
  if (!isGeminiEnabled()) throw new Error('Gemini API 키가 설정되지 않았습니다. 분석을 실행할 수 없습니다.');
  try {
    const json = await callGeminiJson(buildPrompt(data, settings, localContext, trendData), geminiAnalysisSchema, 8192);
    return { analysis: normalizeGeminiResponse(json), statusMessage: 'Gemini API가 KPI, raw data, AI 동향 원문 분석 결과를 사용해 최종 분석을 생성했습니다.' };
  } catch (error) {
    console.error('Gemini analysis generation failed', error);
    throw new Error(`Gemini 응답 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const candidate = (fenced ?? trimmed)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0) throw new Error(`Gemini 응답에서 JSON 시작 부분을 찾지 못했습니다: ${trimmed.slice(0, 160)}`);
  if (end < start) throw new Error(`Gemini 응답이 JSON 끝까지 오지 않고 중간에 끊겼습니다. 응답 앞부분: ${trimmed.slice(0, 160)}`);
  return candidate.slice(start, end + 1);
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

function trendThemeLines(trendData?: TrendAnalysisResult | null): string {
  if (!trendData || trendData.themes.length === 0) return '- 동향 테마 요약 없음';
  return trendData.themes
    .slice(0, 8)
    .map((theme) => {
      const examples = theme.representativeTexts.slice(0, 3).map((text) => `"${text}"`).join(' / ');
      return `- ${theme.tag}: ${theme.count}건, 부정 ${theme.negativeRatio}%, 출처 ${theme.sources.join('/')}. 대표 원문: ${examples}. 건의: ${theme.userRequests.join(' ')} 시사점: ${theme.decisionImplication}`;
    })
    .join('\n');
}

function trendChunkLines(trendData?: TrendAnalysisResult | null): string {
  if (!trendData || trendData.chunkSummaries.length <= 1) return '- 청크 요약 없음';
  return trendData.chunkSummaries
    .slice(0, 8)
    .map((chunk) => `- ${chunk.range} (${chunk.count}건): ${chunk.topTags.join(', ')}`)
    .join('\n');
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
    formulaSummary: String(value?.formulaSummary ?? 'Gemini가 KPI 간 연결 신호와 동향 클러스터를 함께 검토해 결론을 도출했습니다.'),
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
- confidence는 결론이 맞을 확률이 아니다. 업로드된 KPI와 동향 신호가 최종 결정을 얼마나 일관되게 지지하는지 나타내는 "판단 근거 강도"다.
- 로컬 계산값은 참고용 검산 자료다. 최종 decision, confidence(판단 근거 강도), decisionReasons, formulaSummary, experimentPlan, aiInsight는 네가 반환한 JSON을 앱이 우선 사용한다.
- 단, 숫자와 기준값을 무시하고 감으로 판단하지 마라. 기준값 대비 어느 축이 약한지와 동향 클러스터가 그 판단을 강화/완화하는지 설명하라.
- Scale은 확장 가능한 지표가 복수 축에서 확인될 때, Iterate는 개선 실험 후 재검증이 필요할 때, Kill은 유입/잔존/수익화/유저 반응이 구조적으로 약할 때만 선택하라.
- 제너럴한 조언을 금지한다. decisionReasons와 aiInsight는 반드시 "지표 A + 지표 B = 원인 가설/실무 의미" 형태의 연결 가설을 포함하라.
- 최소 3개의 연결 가설을 decisionReasons에 포함하라. 예: "Store CVR 14% + CPI $0.856 = 광고 클릭 이후 스토어 기대 불일치 가능성", "D0 Tutorial 58% + D1 22.5% = 온보딩 이해 실패가 첫날 이탈을 키울 가능성", "Ad Completion 52% + ARPDAU $0.0178 = 광고 수익화 구조가 유저 피로만 만들고 수익을 충분히 회수하지 못함".
- experimentPlan은 각각 어떤 연결 가설을 검증하는 실험인지 targetKpi와 expectedImpactKor에 드러나야 한다.
- 동향은 단순 클러스터 이름만 보지 말고, 아래 동향 테마 요약의 건수/부정 비율/건의 사항을 의사결정 근거에 반영하라.
- 동향 건수가 많을 때는 청크 요약을 종합해 반복적으로 나타나는 요청을 우선순위화하라.
- 동향 테마 요약은 브라우저가 리뷰 1건당 대표 테마 1개로 중복 없이 선집계한 자료다. 너는 대표 원문까지 읽고 AI 관점에서 테마를 다시 해석해 최종 결론과 액션에 연결하라.
- decisionReasons와 aiInsight에는 최소 2개 이상 동향 테마의 건수, 부정 비율, 대표 원문에서 드러난 문제를 KPI와 연결해서 써라.

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
- 로컬 후보 결정: ${localContext.decision.toUpperCase()} / 판단 근거 강도 참고값 ${localContext.confidence}%
- 시장성/리텐션/수익화 참고 점수: ${localContext.marketabilityScore}/${localContext.retentionScore}/${localContext.monetizationScore}
- 로컬 판단 요약: ${localContext.formulaSummary}
- 로컬 병목: ${localContext.korBottleneck}
- 로컬 근거: ${localContext.decisionReasons.join(' | ')}

동향 클러스터:
${trendSummary}

동향 테마 요약:
${trendThemeLines(trendData)}

동향 청크 요약:
${trendChunkLines(trendData)}
${customPrompt}

반드시 API에 제공된 JSON schema와 같은 JSON 객체만 반환:
마크다운 코드블록, 설명문, 앞뒤 문장 없이 JSON 객체만 반환하라.
{
  "decision": "scale | iterate | kill",
  "confidence": 0,
  "marketabilityScore": 0,
  "retentionScore": 0,
  "monetizationScore": 0,
  "korBottleneck": "...",
  "korFocus": "...",
  "decisionReasons": ["지표 A + 지표 B = 원인 가설/실무 의미", "지표 C + 동향 태그 = 원인 가설/실무 의미", "지표 D + 지표 E = 원인 가설/실무 의미"],
  "formulaSummary": "판단 근거 강도가 왜 이 정도인지 설명. 결론 적중 확률이라고 말하지 말 것.",
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
