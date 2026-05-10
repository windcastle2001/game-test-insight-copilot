import type { AnalysisResult, AnalysisSettings, Decision, ExperimentItem, GameTestData, KpiCard, TrendAnalysisResult } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';
import { calcMarketabilityScore, calcMonetizationScore, calcRetentionScore, calcWeightedScore, getKpiStatus, hasMetric } from './scoring';
import { generateGeminiAnalysis, isGeminiEnabled } from './aiEngine';

const kpiMeta: Record<string, { name: string; korName: string; unit: string; optional?: boolean }> = {
  cpi: { name: 'CPI', korName: '설치 비용', unit: '$' },
  ctr: { name: 'CTR', korName: '클릭률', unit: '%' },
  ipm: { name: 'IPM', korName: '천 회 노출당 설치', unit: '' },
  d1Retention: { name: 'D1 Retention', korName: '1일차 잔존율', unit: '%' },
  d3Retention: { name: 'D3 Retention', korName: '3일차 잔존율', unit: '%' },
  d7Retention: { name: 'D7 Retention', korName: '7일차 잔존율', unit: '%' },
  arpdau: { name: 'ARPDAU', korName: '일평균 수익', unit: '$' },
  day1Playtime: { name: 'Day1 Playtime', korName: '첫날 플레이 시간', unit: '분' },
  d0TutorialCompletion: { name: 'D0 Tutorial', korName: '튜토리얼 완료율', unit: '%', optional: true },
  firstSessionDropoff: { name: 'First Exit', korName: '첫 세션 이탈률', unit: '%', optional: true },
  adWatchCompletion: { name: 'Ad Completion', korName: '광고 시청 완료율', unit: '%', optional: true },
  storeConversion: { name: 'Store CVR', korName: '스토어 전환율', unit: '%', optional: true },
  d14Retention: { name: 'D14 Retention', korName: '14일차 잔존율', unit: '%', optional: true },
  d30Retention: { name: 'D30 Retention', korName: '30일차 잔존율', unit: '%', optional: true },
  roas: { name: 'ROAS', korName: '광고비 회수율', unit: '%', optional: true },
  ltv: { name: 'LTV', korName: '유저당 생애가치', unit: '$', optional: true },
};

const metricKeys = Object.keys(kpiMeta) as Array<keyof GameTestData>;

function customMetricCards(data: GameTestData): KpiCard[] {
  return (data.rawMetricSummary ?? []).map((summary, index) => {
    const label = summary.split(':')[0] || `커스텀 지표 ${index + 1}`;
    const value = Number(summary.match(/평균\s*([0-9.]+)/)?.[1] ?? 0);
    return {
      key: `custom-${index}`,
      name: label,
      korName: label,
      value,
      unit: '',
      status: 'watch',
      interpretation: summary,
      korInterpretation: `Gemini 분석 참고 지표: ${summary}`,
    };
  });
}

function buildKpiCards(data: GameTestData, settings: AnalysisSettings): KpiCard[] {
  const standardCards = metricKeys
    .map((key) => [key, data[key]] as const)
    .filter(([key, value]) => !kpiMeta[String(key)].optional || hasMetric(value as number | undefined))
    .map(([key, value]) => {
      const numeric = value as number;
      const meta = kpiMeta[String(key)];
      const status = getKpiStatus(String(key), numeric, settings);
      const label = status === 'good' ? '양호' : status === 'watch' ? '주의' : '위험';
      return {
        key: String(key),
        ...meta,
        value: numeric,
        status,
        interpretation: `${label}: ${meta.korName} 기준으로 판정했습니다.`,
        korInterpretation: `${label}: ${meta.korName} 기준으로 판정했습니다.`,
      };
    });
  return [...standardCards, ...customMetricCards(data)];
}

function trendSummary(trendData?: TrendAnalysisResult | null): string {
  if (!trendData || trendData.totalCount === 0) return '동향 데이터 없음';
  const clusters = trendData.clusters.slice(0, 3).map((cluster) => `${cluster.name} ${cluster.count}건/부정 ${cluster.sentimentRatio}%`).join(', ');
  const tags = trendData.tagSummary.slice(0, 4).map((item) => `${item.tag} ${item.count}`).join(', ');
  return `동향 ${trendData.totalCount}건, 주요 클러스터: ${clusters}. 주요 태그: ${tags}. 신뢰도 보정 ${trendData.confidenceAdjustment > 0 ? '+' : ''}${trendData.confidenceAdjustment}%p`;
}

function determineDecision(
  marketability: number,
  retention: number,
  monetization: number,
  weightedScore: number,
  data: GameTestData,
  settings: AnalysisSettings,
  trendData?: TrendAnalysisResult | null
): { decision: Decision; confidence: number; reasons: string[]; formula: string } {
  const kpiCards = buildKpiCards(data, settings);
  const riskCount = kpiCards.filter((card) => card.status === 'risk').length;
  const allRetentionRisk = ['d1Retention', 'd3Retention', 'd7Retention'].every(
    (key) => getKpiStatus(key, data[key as keyof GameTestData] as number, settings) === 'risk'
  );
  const trendAdjust = trendData?.applyToAnalysis ? trendData.confidenceAdjustment : 0;
  const optionalUsed = kpiCards.filter((card) => kpiMeta[card.key]?.optional || card.key.startsWith('custom-')).map((card) => card.korName);
  const formula = `시장성 ${marketability}점, 리텐션 ${retention}점, 수익화 ${monetization}점을 기준값과 비교했고 동향 신호는 신뢰도에 ${trendAdjust > 0 ? '+' : ''}${trendAdjust}%p 반영했습니다.`;

  if (allRetentionRisk || (marketability < 40 && retention < 40)) {
    return {
      decision: 'kill',
      confidence: Math.min(96, Math.max(62, Math.round(100 - weightedScore / 2) - Math.min(0, trendAdjust))),
      formula,
      reasons: [
        allRetentionRisk ? 'D1/D3/D7 리텐션이 모두 위험 구간입니다.' : '시장성과 리텐션 점수가 모두 40점 미만입니다.',
        `입력된 지표 중 위험 KPI ${riskCount}개가 확인되었습니다.`,
        optionalUsed.length > 0 ? `추가 지표 반영: ${optionalUsed.join(', ')}` : '추가 지표는 입력되지 않아 기본 KPI만 반영했습니다.',
        trendSummary(trendData),
      ],
    };
  }

  if (marketability >= 70 && retention >= 70 && monetization >= 45 && riskCount <= 1) {
    return {
      decision: 'scale',
      confidence: Math.min(97, Math.max(68, Math.round(55 + weightedScore / 2) + trendAdjust)),
      formula,
      reasons: [
        '시장성과 리텐션이 모두 70점 이상입니다.',
        '수익화가 최소 기준을 넘고 위험 KPI가 1개 이하입니다.',
        optionalUsed.length > 0 ? `추가 지표 반영: ${optionalUsed.join(', ')}` : '추가 지표는 입력되지 않아 기본 KPI만 반영했습니다.',
        trendSummary(trendData),
      ],
    };
  }

  return {
    decision: 'iterate',
    confidence: Math.min(90, Math.max(48, Math.round(42 + weightedScore / 3) + trendAdjust)),
    formula,
    reasons: [
      'Scale 조건은 부족하지만 Kill 조건까지는 아닙니다.',
      `가장 약한 축은 ${marketability <= retention && marketability <= monetization ? '시장성' : retention <= monetization ? '리텐션' : '수익화'}입니다.`,
      optionalUsed.length > 0 ? `추가 지표 반영: ${optionalUsed.join(', ')}` : '추가 지표는 입력되지 않아 기본 KPI만 반영했습니다.',
      trendSummary(trendData),
    ],
  };
}

function findBottleneck(marketability: number, retention: number, monetization: number, data: GameTestData) {
  if (hasMetric(data.d0TutorialCompletion) && data.d0TutorialCompletion < 60) return '튜토리얼 완료율이 낮아 첫 경험에서 이탈이 발생할 가능성이 큽니다.';
  if (hasMetric(data.firstSessionDropoff) && data.firstSessionDropoff > 45) return '첫 세션 이탈률이 높아 초반 몰입 구조를 다시 점검해야 합니다.';
  if (hasMetric(data.storeConversion) && data.storeConversion < 18) return '스토어 전환율이 낮아 광고 소재와 스토어 페이지 간 기대 차이가 의심됩니다.';
  if (hasMetric(data.roas) && data.roas < 50) return 'ROAS가 낮아 현재 유입 비용을 수익으로 회수하기 어렵습니다.';

  const worst = [
    { key: 'marketability', score: marketability },
    { key: 'retention', score: retention },
    { key: 'monetization', score: monetization },
  ].sort((a, b) => a.score - b.score)[0].key;
  if (worst === 'retention') return data.d1Retention < 25 ? 'D1 잔존율이 낮아 첫 경험 또는 온보딩 구조 점검이 필요합니다.' : '초반 리텐션 흐름이 약해 보상, 난이도, 진행 속도 조정이 필요합니다.';
  if (worst === 'marketability') return data.cpi > 0.8 ? 'CPI가 높아 광고 소재 또는 타깃 효율 개선이 필요합니다.' : '광고에서 설치까지의 전환 효율이 낮아 스토어 페이지와 소재 점검이 필요합니다.';
  return '수익화 지표가 약해 광고 배치, 보상형 광고, IAP 구조 개선이 필요합니다.';
}

function buildExperiments(data: GameTestData, decision: Decision, trendData?: TrendAnalysisResult | null): ExperimentItem[] {
  const items: ExperimentItem[] = [];
  const add = (experimentKor: string, targetKpi: string, expectedImpactKor: string, ownerKor: string) => {
    items.push({ priority: items.length + 1, experiment: experimentKor, experimentKor, targetKpi, expectedImpact: expectedImpactKor, expectedImpactKor, owner: ownerKor, ownerKor });
  };
  const trendTags = trendData?.tagSummary.map((item) => item.tag) ?? [];
  if (hasMetric(data.d0TutorialCompletion) && data.d0TutorialCompletion < 80) add('튜토리얼 단축 및 스킵 구간 테스트', 'D0 Tutorial', '튜토리얼 완료율 80% 이상', 'UX/게임 기획자');
  if (hasMetric(data.adWatchCompletion) && data.adWatchCompletion < 60) add('보상형 광고 보상 가치 재조정', 'Ad Completion', '광고 완료율 70% 이상 회복', '수익화 PM');
  if (trendTags.includes('광고 피로')) add('강제 광고 빈도와 위치 재설계', 'ARPDAU, D1 Retention', '광고 불만을 줄이면서 ARPDAU 유지', '수익화 PM');
  if (trendTags.includes('난이도')) add('난이도 급상승 구간 완화', 'D3 Retention', '3일차 이탈률 감소', '레벨 디자이너');
  if (decision === 'scale') {
    add('상위 국가 UA 예산 증액 테스트', 'CPI, IPM, ROAS', 'CPI 상승폭을 15% 이내로 유지하며 설치량 3배 확대', 'UA 매니저');
    add('우수 소재 변형 5종 확장', 'CTR, IPM', 'CTR 3.0% 이상 유지', '크리에이티브 팀');
  } else if (decision === 'kill') {
    add('코어 루프 재설계 스프린트', 'D1/D3 Retention', 'D1 잔존율 10%p 이상 개선 가능성 확인', '게임 기획자');
    add('광고 소재 전면 교체', 'CTR, CPI', 'CTR 2.0% 이상 회복', 'UA/크리에이티브 팀');
  } else {
    if (data.d3Retention < 18) add('3일차 진행 구조 개선', 'D3 Retention', 'D3 잔존율 18% 이상 도달', '게임 기획자');
    if (data.cpi > 0.4 || data.ctr < 2.5) add('광고 후킹 메시지 재검증', 'CPI, CTR, IPM', 'CPI 0.4달러 이하 또는 CTR 2.5% 이상', 'UA/크리에이티브 팀');
    if (data.arpdau < 0.04) add('보상형 광고 배치 조정', 'ARPDAU, Playtime', 'ARPDAU 0.04달러 이상', '수익화 PM');
  }
  while (items.length < 3) add('소규모 재테스트 운영', '핵심 KPI', '2주 내 개선 방향성 검증', 'PM');
  return items.slice(0, 5).map((item, index) => ({ ...item, priority: index + 1 }));
}

function insight(data: GameTestData, decision: Decision, bottleneck: string, trendData?: TrendAnalysisResult | null): AnalysisResult['aiInsight'] {
  const trendText = trendData && trendData.totalCount > 0 ? ` 동향 분석에서는 ${trendData.topInsights.join(' ')}` : '';
  const decisionText = decision === 'scale' ? '확장 가능성이 높습니다' : decision === 'iterate' ? '개선 후 재검증이 필요합니다' : '현 방향으로 확장하기 어렵습니다';
  return {
    executiveSummaryKor: `${data.gameName}은 현재 지표 기준으로 ${decisionText}.${trendText}`,
    executiveSummary: `${data.gameName} is classified as ${decision.toUpperCase()} based on current KPI and trend signals.`,
    whatIsWorkingKor: data.cpi <= 0.4 || data.ctr >= 2.5 ? '광고 소재의 초기 반응은 활용 가능한 수준입니다. 이 강점은 다음 테스트에서도 유지해야 합니다.' : '현재 단계에서는 뚜렷한 강점보다 개선해야 할 지표가 더 큽니다.',
    whatIsWorking: 'Current strengths are derived from comparatively better KPI areas.',
    keyRiskKor: bottleneck,
    keyRisk: bottleneck,
    whyItMattersKor: '소프트 론칭 의사결정은 유입 비용, 잔존율, 수익화, 실제 유저 반응을 함께 봐야 합니다. 입력되지 않은 장기 지표는 제외하고, 확보된 지표만으로 판단합니다.',
    whyItMatters: 'Soft launch decisions require a combined view of acquisition, retention, monetization, and user voice.',
    recommendedDirectionKor: decision === 'scale' ? '예산을 단계적으로 키우되 CPI 상승, 장기 리텐션 하락, 리뷰 클러스터 악화를 함께 감시하세요.' : decision === 'iterate' ? '가장 낮은 KPI와 가장 큰 부정 클러스터를 연결해 1-2개의 실험으로 좁혀 재테스트하세요.' : 'UA 집행을 멈추고 코어 루프, 온보딩, 부정 리뷰 클러스터를 먼저 재설계한 뒤 소액으로 다시 검증하세요.',
    recommendedDirection: 'Proceed with the next action according to KPI and trend signals.',
  };
}

function meetingSummary(data: GameTestData, result: Omit<AnalysisResult, 'meetingSummary' | 'meetingSummaryKor'>) {
  const decision = result.decision.toUpperCase();
  const kor = `[${data.gameName}] 소프트 론칭 테스트 결과 보고
작성일: ${new Date().toLocaleDateString('ko-KR')}

결론: ${decision} (신뢰도 ${result.confidence}%)

핵심 지표
- CPI $${data.cpi} / CTR ${data.ctr}% / IPM ${data.ipm}
- D1 ${data.d1Retention}% / D3 ${data.d3Retention}% / D7 ${data.d7Retention}%
- ARPDAU $${data.arpdau} / 첫날 플레이 ${data.day1Playtime}분

판정 근거
${result.decisionReasons.map((reason) => `- ${reason}`).join('\n')}

판단 근거
${result.formulaSummary}

핵심 병목
${result.korBottleneck}

우선 실험
${result.experimentPlan.slice(0, 3).map((item) => `${item.priority}. ${item.experimentKor} (${item.ownerKor}) - ${item.expectedImpactKor}`).join('\n')}`;
  const eng = `[${data.gameName}] Soft Launch Test Report
Decision: ${decision} (Confidence ${result.confidence}%)
Formula: ${result.formulaSummary}`;
  return { kor, eng };
}

export async function analyzeGame(
  data: GameTestData,
  settings: AnalysisSettings = DEFAULT_SETTINGS,
  trendData?: TrendAnalysisResult | null
): Promise<AnalysisResult> {
  const marketabilityScore = calcMarketabilityScore(data);
  const retentionScore = calcRetentionScore(data);
  const monetizationScore = calcMonetizationScore(data);
  const weightedScore = calcWeightedScore(marketabilityScore, retentionScore, monetizationScore, settings);
  const decisionResult = determineDecision(marketabilityScore, retentionScore, monetizationScore, weightedScore, data, settings, trendData);
  const korBottleneck = findBottleneck(marketabilityScore, retentionScore, monetizationScore, data);
  const experimentPlan = buildExperiments(data, decisionResult.decision, trendData);
  let aiInsight = insight(data, decisionResult.decision, korBottleneck, trendData);
  let decision = decisionResult.decision;
  let confidence = decisionResult.confidence;
  let mainBottleneck = korBottleneck;
  let recommendedFocus = decisionResult.decision === 'scale' ? 'UA 확장' : decisionResult.decision === 'iterate' ? '핵심 KPI와 동향 클러스터 개선' : '코어 루프 재설계';
  let finalMarketabilityScore = marketabilityScore;
  let finalRetentionScore = retentionScore;
  let finalMonetizationScore = monetizationScore;
  let finalExperimentPlan = experimentPlan;
  let decisionReasons = decisionResult.reasons;
  let formulaSummary = decisionResult.formula;
  if (!isGeminiEnabled()) throw new Error('Gemini API 키가 설정되지 않았습니다. 분석을 실행할 수 없습니다.');
  const geminiResult = await generateGeminiAnalysis(
    data,
    settings,
    {
      decision: decisionResult.decision,
      confidence: decisionResult.confidence,
      marketabilityScore,
      retentionScore,
      monetizationScore,
      decisionReasons: decisionResult.reasons,
      formulaSummary: decisionResult.formula,
      korBottleneck,
    },
    trendData
  );
  const gemini = geminiResult.analysis;
  if (!gemini) throw new Error(geminiResult.statusMessage);
  decision = gemini.decision;
  confidence = gemini.confidence;
  mainBottleneck = gemini.korBottleneck;
  recommendedFocus = gemini.korFocus;
  finalMarketabilityScore = gemini.marketabilityScore ?? marketabilityScore;
  finalRetentionScore = gemini.retentionScore ?? retentionScore;
  finalMonetizationScore = gemini.monetizationScore ?? monetizationScore;
  finalExperimentPlan = gemini.experimentPlan.length > 0 ? gemini.experimentPlan : buildExperiments(data, gemini.decision, trendData);
  decisionReasons = gemini.decisionReasons.length > 0 ? gemini.decisionReasons : decisionResult.reasons;
  formulaSummary = gemini.formulaSummary;
  aiInsight = {
    ...aiInsight,
    ...gemini.aiInsight,
    executiveSummary: `${data.gameName} is classified as ${gemini.decision.toUpperCase()} by Gemini using KPI, benchmark, and trend signals.`,
    whatIsWorking: gemini.aiInsight.whatIsWorkingKor,
    keyRisk: gemini.aiInsight.keyRiskKor,
    whyItMatters: gemini.aiInsight.whyItMattersKor,
    recommendedDirection: gemini.aiInsight.recommendedDirectionKor,
  };

  const partial = {
    decision,
    confidence,
    mainBottleneck,
    korBottleneck: mainBottleneck,
    recommendedFocus,
    korFocus: recommendedFocus,
    marketabilityScore: finalMarketabilityScore,
    retentionScore: finalRetentionScore,
    monetizationScore: finalMonetizationScore,
    kpiCards: buildKpiCards(data, settings),
    aiInsight,
    experimentPlan: finalExperimentPlan,
    decisionReasons,
    formulaSummary,
    aiProvider: 'gemini' as const,
    aiStatusMessage: geminiResult.statusMessage,
  };
  const summary = meetingSummary(data, partial);
  return { ...partial, meetingSummary: summary.eng, meetingSummaryKor: summary.kor };
}
