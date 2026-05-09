// ─── Analysis Settings (분석 기준 설정) ───────────────────────────────────────
export interface AnalysisSettings {
  thresholds: {
    cpi: { good: number; watch: number };
    ctr: { good: number; watch: number };
    ipm: { good: number; watch: number };
    d1Retention: { good: number; watch: number };
    d3Retention: { good: number; watch: number };
    d7Retention: { good: number; watch: number };
    arpdau: { good: number; watch: number };
    day1Playtime: { good: number; watch: number };
  };
  weights: {
    marketability: number;  // 0-100, 합계 = 100
    retention: number;
    monetization: number;
  };
  customPrompt: string;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  thresholds: {
    cpi:          { good: 0.4,  watch: 0.8 },
    ctr:          { good: 2.5,  watch: 1.5 },
    ipm:          { good: 35,   watch: 20 },
    d1Retention:  { good: 35,   watch: 25 },
    d3Retention:  { good: 18,   watch: 10 },
    d7Retention:  { good: 8,    watch: 4 },
    arpdau:       { good: 0.04, watch: 0.02 },
    day1Playtime: { good: 8,    watch: 5 },
  },
  weights: { marketability: 35, retention: 45, monetization: 20 },
  customPrompt: '',
};

// ─── Trend Analysis (동향 분석) ───────────────────────────────────────────────
export interface TrendDataRow {
  date: string;
  source: string;
  title: string;
  content: string;
  category: string;
}

export interface TrendCluster {
  name: string;
  count: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentRatio: number; // 부정 비율 0-100
}

export interface TrendAnalysisResult {
  totalCount: number;
  dateRange: { from: string; to: string };
  clusters: TrendCluster[];
  topInsights: string[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
  confidenceAdjustment: number; // -20 ~ +20, 최종 confidence 보정값
  weightAdjustment: number;     // 0-30, 동향 반영 가중치 (유저 설정)
  applyToAnalysis: boolean;
}

// ─── Raw Data (원시 데이터) ───────────────────────────────────────────────────
export interface RawDataRow {
  date: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  installs: number;
  spend_usd: number;
  dau: number;
  new_users: number;
  revenue_usd: number;
  ad_revenue_usd: number;
  iap_revenue_usd: number;
  avg_session_minutes: number;
  cohort_date: string;
  d1_active_users: number;
  d3_active_users: number;
  d7_active_users: number;
}

export interface RawDataParseResult {
  rows: RawDataRow[];
  rowCount: number;
  campaigns: string[];
  calculatedKpis: {
    cpi: number;
    ctr: number;
    ipm: number;
    d1Retention: number;
    d3Retention: number;
    d7Retention: number;
    arpdau: number;
    day1Playtime: number;
  };
}

// ─── Game Test Data ───────────────────────────────────────────────────────────
export interface GameTestData {
  gameName: string;
  gameGenre: '하이퍼캐주얼' | '하이브리드캐주얼' | '캐주얼';
  testPeriod: string;
  cpi: number;          // Cost Per Install ($)
  ctr: number;          // Click-Through Rate (%)
  ipm: number;          // Installs Per Mille
  d1Retention: number;  // Day 1 잔존율 (%)
  d3Retention: number;  // Day 3 잔존율 (%)
  d7Retention: number;  // Day 7 잔존율 (%)
  arpdau: number;       // Average Revenue Per DAU ($)
  day1Playtime: number; // Day 1 평균 플레이 시간 (분)
}

export type KpiStatus = 'good' | 'watch' | 'risk';
export type Decision = 'scale' | 'iterate' | 'kill';

export interface KpiCard {
  key: string;
  name: string;
  korName: string;
  value: number;
  unit: string;
  status: KpiStatus;
  interpretation: string;
  korInterpretation: string;
}

export interface ExperimentItem {
  priority: number;
  experiment: string;
  experimentKor: string;
  targetKpi: string;
  expectedImpact: string;
  expectedImpactKor: string;
  owner: string;
  ownerKor: string;
}

export interface AnalysisResult {
  decision: Decision;
  confidence: number;
  mainBottleneck: string;
  korBottleneck: string;
  recommendedFocus: string;
  korFocus: string;
  marketabilityScore: number;
  retentionScore: number;
  monetizationScore: number;
  kpiCards: KpiCard[];
  aiInsight: {
    executiveSummary: string;
    executiveSummaryKor: string;
    whatIsWorking: string;
    whatIsWorkingKor: string;
    keyRisk: string;
    keyRiskKor: string;
    whyItMatters: string;
    whyItMattersKor: string;
    recommendedDirection: string;
    recommendedDirectionKor: string;
  };
  experimentPlan: ExperimentItem[];
  meetingSummary: string;
  meetingSummaryKor: string;
}
