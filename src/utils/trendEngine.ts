import type { TrendAnalysisResult, TrendCluster, TrendDataRow } from '../types/gameTest';

const TAG_KEYWORDS: Record<string, string[]> = {
  '광고 피로': ['광고', 'ad', 'ads', '강제광고', '보상형', 'rewarded'],
  '결제 압박': ['결제', '과금', '상점', '패키지', 'iap', '현질', '가격'],
  '튜토리얼/온보딩': ['튜토리얼', 'tutorial', '설명', '가이드', '처음', '초반', 'onboarding'],
  '난이도': ['어렵', '난이도', '보스', '실패', '막힘', 'hard', 'level', 'stage'],
  '반복/지루함': ['지루', '반복', '똑같', '노가다', 'boring', 'repeat'],
  '재미/몰입': ['재밌', '재미', '중독', '몰입', 'fun', 'addictive', '좋'],
  '버그/성능': ['버그', '튕김', '멈춤', 'crash', 'lag', '렉', '발열'],
  '스토어/광고소재': ['스크린샷', '스토어', '광고랑', '영상', 'creative', 'store'],
  '커뮤니티 반응': ['카페', '디스코드', '공식', '댓글', 'community', 'discord'],
};

const POSITIVE = ['재밌', '좋', '중독', '귀엽', '만족', '추천', 'fun', 'love', 'great', 'good', 'addictive'];
const NEGATIVE = ['별로', '최악', '짜증', '불편', '지루', '어렵', '튕김', '버그', 'bad', 'boring', 'crash', 'annoying'];
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'this', 'that', '너무', '진짜', '그냥', '좀', '근데', '하다', '있는', '같음']);

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
  const pos = POSITIVE.filter((word) => hasWord(text, word)).length;
  const neg = NEGATIVE.filter((word) => hasWord(text, word)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

function detectTags(text: string): string[] {
  const tags = Object.entries(TAG_KEYWORDS)
    .filter(([, words]) => words.some((word) => hasWord(text, word)))
    .map(([tag]) => tag);
  return tags.length > 0 ? tags : ['기타'];
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
    return {
      index,
      row,
      text,
      vector: vectorize(text),
      sentiment: detectSentiment(text),
      tags: detectTags(text),
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
  const dates = rows.map((row) => row.date).filter(Boolean).sort();
  const tagCounts = new Map<string, number>();
  rawClusters.forEach((cluster) => cluster.items.forEach((item) => item.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1))));

  const clusters: TrendCluster[] = rawClusters
    .map((cluster, index) => {
      const positiveCount = cluster.items.filter((item) => item.sentiment === 'positive').length;
      const negativeCount = cluster.items.filter((item) => item.sentiment === 'negative').length;
      const neutralCount = cluster.items.length - positiveCount - negativeCount;
      const tags = [...new Set(cluster.items.flatMap((item) => item.tags))].slice(0, 5);
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
    topInsights: [
      top ? `가장 큰 유사 반응 묶음은 "${top.name}"이며 ${top.count}건입니다.` : '',
      riskCluster ? `"${riskCluster.name}" 묶음의 부정 비율이 ${riskCluster.sentimentRatio}%라서 우선 확인이 필요합니다.` : '',
      tagSummary[0] ? `가장 많이 붙은 이슈 태그는 "${tagSummary[0].tag}" (${tagSummary[0].count}건)입니다.` : '',
      applyToAnalysis ? `동향 신호가 최종 신뢰도에 ${rawAdjustment > 0 ? '+' : ''}${rawAdjustment}%p 반영됩니다.` : '동향 신호는 화면에만 표시되고 최종 신뢰도에는 반영되지 않습니다.',
    ].filter(Boolean),
    overallSentiment,
    confidenceAdjustment: applyToAnalysis ? rawAdjustment : 0,
    weightAdjustment,
    applyToAnalysis,
    warnings: sourceWarnings,
    tagSummary,
    methodDescription: 'Gemini 호출 없이 브라우저에서 텍스트 토큰 벡터를 만들고 코사인 유사도로 묶는 로컬 클러스터링입니다.',
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
