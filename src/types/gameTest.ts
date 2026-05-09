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
