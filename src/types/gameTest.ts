export type GameGenre = '하이퍼캐주얼' | '하이브리드캐주얼' | '캐주얼';

export interface GameTestData {
  gameName: string;
  gameGenre: GameGenre;
  testPeriod: string;
  cpi: number;
  ctr: number;
  ipm: number;
  d1Retention: number;
  d3Retention: number;
  d7Retention: number;
  arpdau: number;
  day1Playtime: number;
  d0TutorialCompletion?: number;
  firstSessionDropoff?: number;
  adWatchCompletion?: number;
  storeConversion?: number;
  d14Retention?: number;
  d30Retention?: number;
  roas?: number;
  ltv?: number;
  rawMetricSummary?: string[];
}

export type KpiStatus = 'good' | 'watch' | 'risk';
export type Decision = 'scale' | 'iterate' | 'kill';

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
    d0TutorialCompletion: { good: number; watch: number };
    firstSessionDropoff: { good: number; watch: number };
    adWatchCompletion: { good: number; watch: number };
    storeConversion: { good: number; watch: number };
    d14Retention: { good: number; watch: number };
    d30Retention: { good: number; watch: number };
    roas: { good: number; watch: number };
    ltv: { good: number; watch: number };
  };
  weights: {
    marketability: number;
    retention: number;
    monetization: number;
  };
  customPrompt: string;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  thresholds: {
    cpi: { good: 0.4, watch: 0.8 },
    ctr: { good: 2.5, watch: 1.5 },
    ipm: { good: 35, watch: 20 },
    d1Retention: { good: 35, watch: 25 },
    d3Retention: { good: 18, watch: 10 },
    d7Retention: { good: 8, watch: 4 },
    arpdau: { good: 0.04, watch: 0.02 },
    day1Playtime: { good: 8, watch: 5 },
    d0TutorialCompletion: { good: 80, watch: 60 },
    firstSessionDropoff: { good: 25, watch: 45 },
    adWatchCompletion: { good: 80, watch: 60 },
    storeConversion: { good: 30, watch: 18 },
    d14Retention: { good: 4, watch: 2 },
    d30Retention: { good: 2, watch: 1 },
    roas: { good: 100, watch: 50 },
    ltv: { good: 0.12, watch: 0.05 },
  },
  weights: { marketability: 35, retention: 45, monetization: 20 },
  customPrompt: '',
};

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
  sentimentRatio: number;
  tags: string[];
  representativeTexts: string[];
  averageSimilarity: number;
}

export interface TrendAnalysisResult {
  totalCount: number;
  dateRange: { from: string; to: string };
  clusters: TrendCluster[];
  themes: Array<{
    tag: string;
    count: number;
    negativeRatio: number;
    sources: string[];
    representativeTexts: string[];
    userRequests: string[];
    decisionImplication: string;
  }>;
  chunkSummaries: Array<{
    range: string;
    count: number;
    topTags: string[];
    summary: string;
  }>;
  topInsights: string[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
  confidenceAdjustment: number;
  weightAdjustment: number;
  applyToAnalysis: boolean;
  warnings: string[];
  tagSummary: Array<{ tag: string; count: number }>;
  methodDescription: string;
}

export interface RawDataRow {
  game_name: string;
  game_genre: string;
  test_period: string;
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
  d14_active_users: number;
  d30_active_users: number;
  tutorial_starts: number;
  tutorial_completes: number;
  first_session_users: number;
  first_session_exits: number;
  ad_starts: number;
  ad_completes: number;
  store_page_views: number;
  store_installs: number;
}

export interface RawDataParseResult {
  rows: RawDataRow[];
  rowCount: number;
  campaigns: string[];
  gameName: string;
  gameGenre?: GameGenre;
  testPeriod: string;
  extraMetricSummary: string[];
  calculatedKpis: Partial<Pick<
    GameTestData,
    | 'cpi'
    | 'ctr'
    | 'ipm'
    | 'd1Retention'
    | 'd3Retention'
    | 'd7Retention'
    | 'arpdau'
    | 'day1Playtime'
    | 'd0TutorialCompletion'
    | 'firstSessionDropoff'
    | 'adWatchCompletion'
    | 'storeConversion'
    | 'd14Retention'
    | 'd30Retention'
    | 'roas'
    | 'ltv'
  >>;
  warnings: string[];
}

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
  decisionReasons: string[];
  formulaSummary: string;
  aiProvider: 'gemini' | 'local-fallback';
  aiStatusMessage: string;
  meetingSummary: string;
  meetingSummaryKor: string;
}
