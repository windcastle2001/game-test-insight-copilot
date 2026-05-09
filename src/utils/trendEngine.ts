/**
 * trendEngine.ts
 * 동향 데이터 CSV를 키워드 기반으로 클러스터링하고 감성 분석합니다.
 */

import type { TrendDataRow, TrendCluster, TrendAnalysisResult } from '../types/gameTest';

// ─── 키워드 정의 ──────────────────────────────────────────────────────────────
const CLUSTER_KEYWORDS: Record<string, string[]> = {
  '광고/수익화':    ['광고', 'ad', '인앱결제', 'iap', 'monetization', '결제', '과금', 'revenue', '수익', 'arpu'],
  '게임성/코어루프': ['어렵', '쉽', '튜토리얼', 'tutorial', '게임성', 'gameplay', 'core loop', '루프', '재미', '지루', '반복'],
  '리텐션/이탈':    ['이탈', 'churn', '재방문', 'retention', 'd1', 'd3', 'd7', '잔존', '복귀', 'lapsed', '돌아'],
  '마케팅/UA':     ['cpi', 'ctr', 'ipm', '광고비', 'ua', 'creative', '소재', '전환', 'install', 'impression', 'click'],
  '경쟁사/시장':   ['경쟁', 'competitor', 'market', '시장', 'trend', '트렌드', '순위', 'ranking', 'similar'],
  '유저경험/UX':   ['ux', '경험', '불편', '버그', 'bug', '크래시', 'crash', 'ui', '인터페이스', '어색', '느림', '렉'],
};

const POSITIVE_KEYWORDS = [
  '좋', '재미', '훌륭', 'good', 'great', 'love', 'amazing', '최고', 'excellent',
  'fun', 'enjoy', '만족', 'positive', 'above', '상승', '성장', 'improve',
];

const NEGATIVE_KEYWORDS = [
  '나쁨', '최악', '싫', '불편', 'bad', 'terrible', 'poor', '별로', 'low', 'below',
  'issue', 'problem', '문제', '위험', 'risk', 'churn', 'spike', '낮', '감소', 'drop',
];

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = normalize(text);
  const posScore = POSITIVE_KEYWORDS.filter((k) => lower.includes(k.toLowerCase())).length;
  const negScore = NEGATIVE_KEYWORDS.filter((k) => lower.includes(k.toLowerCase())).length;

  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

function detectCluster(text: string): string {
  const lower = normalize(text);
  for (const [clusterName, keywords] of Object.entries(CLUSTER_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return clusterName;
    }
  }
  return '기타';
}

// ─── 메인 분석 함수 ──────────────────────────────────────────────────────────
export function analyzeTrendData(
  rows: TrendDataRow[],
  weightAdjustment = 15,
  applyToAnalysis = true
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
    };
  }

  // 날짜 범위 계산
  const dates = rows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const dateRange = { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' };

  // 클러스터별 집계
  const clusterMap: Record<string, { total: number; pos: number; neg: number; neutral: number }> = {};
  for (const clusterName of [...Object.keys(CLUSTER_KEYWORDS), '기타']) {
    clusterMap[clusterName] = { total: 0, pos: 0, neg: 0, neutral: 0 };
  }

  for (const row of rows) {
    const combinedText = `${row.title} ${row.content}`;
    const cluster = detectCluster(combinedText);
    const sentiment = detectSentiment(combinedText);

    clusterMap[cluster].total++;
    if (sentiment === 'positive') clusterMap[cluster].pos++;
    else if (sentiment === 'negative') clusterMap[cluster].neg++;
    else clusterMap[cluster].neutral++;
  }

  const clusters: TrendCluster[] = Object.entries(clusterMap)
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => {
      const negRatio = v.total > 0 ? Math.round((v.neg / v.total) * 100) : 0;
      let sentiment: TrendCluster['sentiment'] = 'neutral';
      if (v.pos > v.neg) sentiment = 'positive';
      else if (v.neg > v.pos) sentiment = 'negative';

      return {
        name,
        count: v.total,
        positiveCount: v.pos,
        negativeCount: v.neg,
        neutralCount: v.neutral,
        sentiment,
        sentimentRatio: negRatio,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 전체 감성 결정
  const totalPos = clusters.reduce((s, c) => s + c.positiveCount, 0);
  const totalNeg = clusters.reduce((s, c) => s + c.negativeCount, 0);
  let overallSentiment: TrendAnalysisResult['overallSentiment'] = 'neutral';
  if (totalPos > totalNeg * 1.2) overallSentiment = 'positive';
  else if (totalNeg > totalPos * 1.2) overallSentiment = 'negative';

  // confidence 보정값 계산 (-20 ~ +20)
  const negRatioOverall = rows.length > 0 ? totalNeg / rows.length : 0.5;
  let confidenceAdjustment = 0;
  if (overallSentiment === 'negative') {
    confidenceAdjustment = -Math.round(negRatioOverall * 20);
  } else if (overallSentiment === 'positive') {
    confidenceAdjustment = Math.round((1 - negRatioOverall) * 15);
  }

  // 주요 인사이트 자동 생성
  const topInsights: string[] = [];
  if (clusters.length > 0) {
    const top = clusters[0];
    topInsights.push(`가장 많이 언급된 이슈: "${top.name}" (${top.count}건, 부정 ${top.sentimentRatio}%)`);
  }
  const highNegCluster = clusters.find((c) => c.sentimentRatio >= 60 && c.count >= 3);
  if (highNegCluster) {
    topInsights.push(
      `"${highNegCluster.name}" 관련 부정 의견 집중 — 즉시 개선 검토 필요`
    );
  }
  const positiveCluster = clusters.find((c) => c.sentiment === 'positive' && c.count >= 3);
  if (positiveCluster) {
    topInsights.push(
      `"${positiveCluster.name}" 영역에서 긍정 반응 우세 — 강점 유지 권장`
    );
  }
  if (overallSentiment === 'negative') {
    topInsights.push(`전체 동향 부정 우세 (부정 ${Math.round(negRatioOverall * 100)}%) — Confidence 하향 보정 적용`);
  } else if (overallSentiment === 'positive') {
    topInsights.push(`전체 동향 긍정 우세 — Confidence 상향 보정 적용`);
  }

  return {
    totalCount: rows.length,
    dateRange,
    clusters,
    topInsights,
    overallSentiment,
    confidenceAdjustment: applyToAnalysis ? confidenceAdjustment : 0,
    weightAdjustment,
    applyToAnalysis,
  };
}

export function parseTrendCsvRows(rows: Record<string, string>[]): TrendDataRow[] {
  return rows.map((row) => ({
    date:     row.date ?? '',
    source:   row.source ?? '',
    title:    row.title ?? '',
    content:  row.content ?? '',
    category: row.category ?? '',
  }));
}

export function generateTrendCsvTemplate(): string {
  return [
    'date,source,title,content,category',
    '2026-04-01,AppStore,리뷰1,게임이 너무 어려워요 튜토리얼이 불친절함,user_review',
    '2026-04-02,PlayStore,리뷰2,광고가 너무 많아서 불편해요,user_review',
    '2026-04-01,GameAnalytics,이벤트1,Day 3 churn spike detected at stage 5,internal',
    '2026-04-05,SensorTower,트렌드1,Similar casual games showing D1 above 40%,market',
    '2026-04-06,AppStore,리뷰3,재미있어요 계속 하게 됩니다,user_review',
  ].join('\n');
}
