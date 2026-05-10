import type { TrendAnalysisResult, TrendCluster, TrendDataRow } from '../types/gameTest';

const TAG_KEYWORDS: Record<string, string[]> = {
  '광고 피로': ['광고', 'ad', 'ads', '강제광고', '보상형', 'rewarded', '광고가', '광고를', '광고만'],
  '결제 압박': ['결제', '과금', '상점', '패키지', 'iap', '현질', '가격', '비싸', '구매'],
  '튜토리얼/온보딩': ['튜토리얼', 'tutorial', '설명', '가이드', '처음', '초반', 'onboarding', '헷갈', '뭘 해야'],
  '난이도': ['어렵', '난이도', '보스', '실패', '막힘', '막혀', 'hard', 'level', 'stage'],
  '반복/지루함': ['지루', '반복', '똑같', '노가다', 'boring', 'repeat', '할 게', '콘텐츠'],
  '재미/몰입': ['재밌', '재미', '중독', '몰입', '손맛', 'fun', 'addictive', '계속 하게'],
  '버그/성능': ['버그', '튕김', '튕겨', '멈춤', '멈춥', 'crash', 'lag', '렉', '발열', '로딩'],
  '스토어/광고소재': ['스크린샷', '스토어', '광고랑', '영상', 'creative', 'store', '설치하고 보니'],
  '커뮤니티 반응': ['카페', '디스코드', '공식', '댓글', 'community', 'discord', '공지', '운영자'],
};

const POSITIVE = [
  '재밌',
  '재미있',
  '중독',
  '귀엽',
  '만족',
  '추천',
  '손맛',
  '괜찮',
  '시원',
  '계속 하게',
  '마음에',
  'fun',
  'love',
  'great',
  'good',
  'addictive',
];

const NEGATIVE = [
  '별로',
  '최악',
  '짜증',
  '불편',
  '지루',
  '어렵',
  '튕김',
  '튕겨',
  '버그',
  '끊',
  '강제',
  '줄였으면',
  '헷갈',
  '모르겠',
  '막혀',
  '실패',
  '답답',
  '아쉬',
  '발열',
  '멈춤',
  '멈춥',
  '불안',
  '부담',
  '반복',
  '다르',
  '실망',
  '피로',
  '낮',
  '느려',
  '오래 하면',
  'bad',
  'boring',
  'crash',
  'annoying',
];

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'this', 'that', '너무', '진짜', '그냥', '좀', '근데', '하는', '있는', '같음']);
const PRIMARY_TAG_PRIORITY = [
  '버그/성능',
  '튜토리얼/온보딩',
  '광고 피로',
  '스토어/광고소재',
  '난이도',
  '반복/지루함',
  '결제 압박',
  '커뮤니티 반응',
  '재미/몰입',
  '기타',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function hasWord(text: string, word: string): boolean {
  const lower = normalize(text);
  if (/^[a-z0-9]+$/i.test(word)) return new RegExp(`\\b${word}\\b`, 'i').test(lower);
  return lower.includes(word.toLowerCase());
}

function detectSentiment(text: string): TrendCluster['sentiment'] {
  const normalized = normalize(text);
  const pos = POSITIVE.filter((word) => hasWord(normalized, word)).length;
  const neg = NEGATIVE.filter((word) => hasWord(normalized, word)).length;
  if (neg > 0 && neg >= pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

function detectTags(text: string): string[] {
  const tags = Object.entries(TAG_KEYWORDS)
    .filter(([, words]) => words.some((word) => hasWord(text, word)))
    .map(([tag]) => tag);
  return tags.length > 0 ? tags : ['기타'];
}

function selectPrimaryTag(tags: string[], sentiment: TrendCluster['sentiment']): string {
  const unique = [...new Set(tags)];
  if (sentiment === 'positive' && unique.includes('재미/몰입') && unique.length <= 2) return '재미/몰입';
  return PRIMARY_TAG_PRIORITY.find((tag) => unique.includes(tag)) ?? unique[0] ?? '기타';
}

function vectorize(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  tokens(text).forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));
  return counts;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  a.forEach((value, key) => {
    dot += value * (b.get(key) ?? 0);
    aNorm += value * value;
  });
  b.forEach((value) => {
    bNorm += value * value;
  });
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function mergeVectors(vectors: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  vectors.forEach((vector) => vector.forEach((value, key) => merged.set(key, (merged.get(key) ?? 0) + value)));
  return merged;
}

function topTerms(vectors: Map<string, number>[], fallbackTags: string[]): string[] {
  const merged = mergeVectors(vectors);
  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .filter((term) => !fallbackTags.some((tag) => tag.includes(term)))
    .slice(0, 3);
}

function clusterRows(rows: TrendDataRow[]) {
  const items = rows.map((row, index) => {
    const text = `${row.source} ${row.title} ${row.content} ${row.category}`;
    const sentiment = detectSentiment(text);
    const tags = detectTags(text);
    return {
      index,
      row,
      text,
      vector: vectorize(text),
      sentiment,
      tags,
      primaryTag: selectPrimaryTag(tags, sentiment),
    };
  });

  const clusters: Array<{ items: typeof items; centroid: Map<string, number> }> = [];
  items.forEach((item) => {
    let bestIndex = -1;
    let bestScore = 0;
    clusters.forEach((cluster, index) => {
      const score = cosine(item.vector, cluster.centroid);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0 && bestScore >= 0.18) {
      clusters[bestIndex].items.push(item);
      clusters[bestIndex].centroid = mergeVectors(clusters[bestIndex].items.map((entry) => entry.vector));
    } else {
      clusters.push({ items: [item], centroid: new Map(item.vector) });
    }
  });

  return clusters;
}

function validateRows(originalRows: Record<string, string>[], rows: TrendDataRow[]): string[] {
  const warnings: string[] = [];
  const required = ['date', 'source', 'title', 'content', 'category'];
  if (originalRows.length === 0) return ['CSV에 분석할 행이 없습니다.'];

  const headers = Object.keys(normalizeHeader(originalRows[0]));
  required.forEach((field) => {
    if (!headers.includes(field)) warnings.push(`필수 컬럼 누락: ${field}`);
  });

  rows.forEach((row, index) => {
    if (!row.content.trim() && !row.title.trim()) warnings.push(`${index + 1}행: title/content가 모두 비어 있습니다.`);
    if (row.source && !['google play', 'apple app store', 'official community'].includes(row.source.toLowerCase())) {
      warnings.push(`${index + 1}행: 권장 소스가 아닙니다 (${row.source}).`);
    }
  });

  return warnings.slice(0, 12);
}

function sourceLabel(source: string): string {
  const lower = source.toLowerCase();
  if (lower.includes('google')) return 'Google Play';
  if (lower.includes('apple')) return 'Apple App Store';
  if (lower.includes('community') || lower.includes('official')) return 'Official Community';
  return source || 'Unknown';
}

function requestForTag(tag: string): string {
  const requests: Record<string, string> = {
    '광고 피로': '강제 광고 빈도와 노출 타이밍을 줄이고, 보상형 광고의 선택권과 보상 가치를 재조정해야 합니다.',
    '결제 압박': '초반 패키지 팝업을 낮추고, 결제 제안보다 플레이 목표와 보상 이해를 먼저 제공해야 합니다.',
    '튜토리얼/온보딩': '첫 세션 목표, 조작 설명, 핵심 재미 전달 시간을 줄여 온보딩 이탈을 낮춰야 합니다.',
    '난이도': '막히는 스테이지의 난이도 상승폭과 실패 시 보상 체감을 조정해야 합니다.',
    '반복/지루함': '반복 체감이 오기 전에 새 기믹, 목표, 보상 루프를 더 빨리 열어야 합니다.',
    '재미/몰입': '긍정적으로 언급된 손맛, 캐릭터, 짧은 플레이 장점을 소재와 초반 경험에 더 전면 배치해야 합니다.',
    '버그/성능': '광고 복귀, 발열, 멈춤 등 안정성 이슈를 UA 확대 전 우선 수정해야 합니다.',
    '스토어/광고소재': '광고 소재와 스토어 이미지, 실제 첫 플레이 장면의 기대값을 맞춰야 합니다.',
    '커뮤니티 반응': '공식 커뮤니티에서 반복되는 요청을 다음 빌드 노트와 실험 항목으로 연결해야 합니다.',
  };
  return requests[tag] ?? '반복 언급된 불만과 요청을 다음 실험의 검증 항목으로 분리해야 합니다.';
}

function implicationForTag(tag: string, count: number, negativeRatio: number): string {
  const severity = negativeRatio >= 60 ? '강한 부정 신호' : negativeRatio >= 35 ? '주의 신호' : '보조 신호';
  const base = `${count}건, 부정 ${negativeRatio}%의 ${severity}입니다.`;
  const implications: Record<string, string> = {
    '광고 피로': `${base} 광고 수익화 지표가 낮다면 광고를 늘리는 방식보다 광고 구조 재설계가 먼저입니다.`,
    '튜토리얼/온보딩': `${base} D0/D1 리텐션이 낮다면 첫 경험 이해 실패가 핵심 병목일 가능성이 큽니다.`,
    '난이도': `${base} D3/D7 하락과 함께 보이면 중기 잔존 개선 실험의 우선순위가 높습니다.`,
    '스토어/광고소재': `${base} CPI 또는 Store CVR이 나쁘다면 소재-스토어-실제 플레이 기대 불일치를 의심해야 합니다.`,
    '버그/성능': `${base} 안정성 이슈는 KPI 해석을 흐릴 수 있어 UA 확대 전 차단 조건입니다.`,
    '반복/지루함': `${base} 플레이타임과 D3 이후 잔존이 낮다면 코어 루프 반복감이 이탈 원인일 수 있습니다.`,
    '재미/몰입': `${base} 긍정 신호로 쓸 수 있지만 다른 부정 테마를 상쇄할 만큼 유지 지표 확인이 필요합니다.`,
    '결제 압박': `${base} 초반 결제 노출이 리텐션과 리뷰 감성에 부담을 주는지 검증해야 합니다.`,
    '커뮤니티 반응': `${base} 반복 요청은 정성 VOC 기반의 다음 빌드 우선순위로 묶어야 합니다.`,
  };
  return implications[tag] ?? `${base} 정량 KPI와 연결할 원인 가설로 검증해야 합니다.`;
}

function buildTaggedRows(rows: TrendDataRow[]) {
  return rows.map((row) => {
    const text = `${row.source} ${row.title} ${row.content} ${row.category}`;
    const sentiment = detectSentiment(text);
    const tags = detectTags(text);
    return { row, text, tags, sentiment, primaryTag: selectPrimaryTag(tags, sentiment) };
  });
}

function buildTrendThemes(rows: TrendDataRow[]) {
  const taggedRows = buildTaggedRows(rows);
  const tagMap = new Map<string, typeof taggedRows>();
  taggedRows.forEach((item) => tagMap.set(item.primaryTag, [...(tagMap.get(item.primaryTag) ?? []), item]));
  return [...tagMap.entries()]
    .map(([tag, items]) => {
      const negativeCount = items.filter((item) => item.sentiment === 'negative').length;
      const negativeRatio = Math.round((negativeCount / Math.max(items.length, 1)) * 100);
      return {
        tag,
        count: items.length,
        negativeRatio,
        sources: [...new Set(items.map((item) => sourceLabel(item.row.source)))],
        representativeTexts: items.slice(0, 3).map((item) => item.row.content || item.row.title),
        userRequests: [requestForTag(tag)],
        decisionImplication: implicationForTag(tag, items.length, negativeRatio),
      };
    })
    .sort((a, b) => b.count - a.count || b.negativeRatio - a.negativeRatio)
    .slice(0, 8);
}

function buildChunkSummaries(rows: TrendDataRow[], chunkSize = 100) {
  const summaries = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = buildTaggedRows(rows.slice(start, start + chunkSize));
    const tagCounts = new Map<string, number>();
    chunk.forEach((row) => tagCounts.set(row.primaryTag, (tagCounts.get(row.primaryTag) ?? 0) + 1));
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, count]) => `${tag} ${count}건`);
    const from = start + 1;
    const to = start + chunk.length;
    summaries.push({
      range: `${from}-${to}`,
      count: chunk.length,
      topTags,
      summary: `${from}-${to}번 동향에서는 ${topTags.join(', ') || '주요 태그 없음'}이 대표 테마로 집계됩니다.`,
    });
  }
  return summaries;
}

export function analyzeTrendData(
  rows: TrendDataRow[],
  weightAdjustment = 15,
  applyToAnalysis = true,
  sourceWarnings: string[] = []
): TrendAnalysisResult {
  if (rows.length === 0) {
    return {
      totalCount: 0,
      dateRange: { from: '', to: '' },
      clusters: [],
      themes: [],
      chunkSummaries: [],
      topInsights: [],
      overallSentiment: 'neutral',
      confidenceAdjustment: 0,
      weightAdjustment,
      applyToAnalysis,
      warnings: sourceWarnings.length ? sourceWarnings : ['분석 가능한 동향 데이터가 없습니다.'],
      tagSummary: [],
      methodDescription: '로컬 텍스트 벡터 유사도 기반 클러스터링',
    };
  }

  const rawClusters = clusterRows(rows);
  const themes = buildTrendThemes(rows);
  const chunkSummaries = buildChunkSummaries(rows);
  const dates = rows.map((row) => row.date).filter(Boolean).sort();
  const tagCounts = new Map<string, number>();
  rawClusters.forEach((cluster) => cluster.items.forEach((item) => tagCounts.set(item.primaryTag, (tagCounts.get(item.primaryTag) ?? 0) + 1)));

  const clusters: TrendCluster[] = rawClusters
    .map((cluster, index) => {
      const positiveCount = cluster.items.filter((item) => item.sentiment === 'positive').length;
      const negativeCount = cluster.items.filter((item) => item.sentiment === 'negative').length;
      const neutralCount = cluster.items.length - positiveCount - negativeCount;
      const tags = [...new Set(cluster.items.map((item) => item.primaryTag))].slice(0, 5);
      const terms = topTerms(cluster.items.map((item) => item.vector), tags);
      const name = tags.includes('기타') && terms.length ? `유사 반응 ${index + 1}: ${terms.join(', ')}` : tags.slice(0, 2).join(' + ');
      const similarities = cluster.items.map((item) => cosine(item.vector, cluster.centroid));
      const averageSimilarity = Math.round((similarities.reduce((sum, value) => sum + value, 0) / Math.max(similarities.length, 1)) * 100);
      const sentiment: TrendCluster['sentiment'] = positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';
      return {
        name,
        count: cluster.items.length,
        positiveCount,
        negativeCount,
        neutralCount,
        sentiment,
        sentimentRatio: Math.round((negativeCount / cluster.items.length) * 100),
        tags,
        representativeTexts: cluster.items.slice(0, 2).map((item) => item.row.content || item.row.title),
        averageSimilarity,
      };
    })
    .sort((a, b) => b.count - a.count);

  const totalPositive = clusters.reduce((sum, cluster) => sum + cluster.positiveCount, 0);
  const totalNegative = clusters.reduce((sum, cluster) => sum + cluster.negativeCount, 0);
  const overallSentiment =
    totalPositive > totalNegative * 1.2 ? 'positive' : totalNegative > totalPositive * 1.2 ? 'negative' : 'neutral';
  const negativeRatio = totalNegative / rows.length;
  const rawAdjustment =
    overallSentiment === 'negative'
      ? -Math.round(negativeRatio * weightAdjustment)
      : overallSentiment === 'positive'
        ? Math.round((1 - negativeRatio) * Math.min(weightAdjustment, 20))
        : 0;

  const top = clusters[0];
  const riskCluster = clusters.find((cluster) => cluster.sentimentRatio >= 50 && cluster.count >= 2);
  const tagSummary = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return {
    totalCount: rows.length,
    dateRange: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
    clusters,
    themes,
    chunkSummaries,
    topInsights: [
      top ? `가장 큰 유사 반응 묶음은 "${top.name}"이며 ${top.count}건입니다.` : '',
      riskCluster ? `"${riskCluster.name}" 묶음은 부정 비율이 ${riskCluster.sentimentRatio}%라 우선 확인이 필요합니다.` : '',
      tagSummary[0] ? `가장 많이 붙은 대표 이슈 태그는 "${tagSummary[0].tag}" (${tagSummary[0].count}건)입니다.` : '',
      themes[0] ? `주요 건의 사항: ${themes[0].userRequests[0]}` : '',
      applyToAnalysis ? `동향 신호가 판단 근거 강도에 ${rawAdjustment > 0 ? '+' : ''}${rawAdjustment}%p 반영됩니다.` : '동향 신호는 화면에만 표시하고 판단 근거 강도에는 반영하지 않습니다.',
    ].filter(Boolean),
    overallSentiment,
    confidenceAdjustment: applyToAnalysis ? rawAdjustment : 0,
    weightAdjustment,
    applyToAnalysis,
    warnings: sourceWarnings,
    tagSummary,
    methodDescription:
      '브라우저에서 텍스트 토큰 벡터 유사도로 1차 군집화하고, 표시용 집계는 리뷰 1건당 대표 테마 1개로 중복 없이 계산합니다. Gemini 최종 분석에는 대표 테마 건수, 부정 비율, 실제 대표 문장을 함께 전달합니다.',
  };
}

function normalizeHeader(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? '']));
}

export function parseTrendCsvRows(rows: Record<string, string>[]): { rows: TrendDataRow[]; warnings: string[] } {
  const parsed = rows.map(normalizeHeader).map((row) => ({
    date: row.date ?? '',
    source: row.source ?? '',
    title: row.title ?? '',
    content: row.content ?? '',
    category: row.category ?? '',
  }));
  return { rows: parsed, warnings: validateRows(rows, parsed) };
}

export function generateTrendCsvTemplate(): string {
  return ['date,source,title,content,category', ',,,,'].join('\n');
}
