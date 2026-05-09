import type {
  GameTestData,
  AnalysisResult,
  Decision,
  KpiCard,
  ExperimentItem,
} from '../types/gameTest';
import {
  getKpiStatus,
  calcMarketabilityScore,
  calcRetentionScore,
  calcMonetizationScore,
} from './scoring';
import { generateGeminiInsight, isGeminiEnabled } from './aiEngine';

// KPI 메타 정보
const kpiMeta: Record<string, { name: string; korName: string; unit: string; engInterp: (v: number) => string; korInterp: (v: number) => string }> = {
  cpi: {
    name: 'CPI',
    korName: '설치당 비용',
    unit: '$',
    engInterp: (v) => v <= 0.4 ? 'Excellent ad efficiency — low acquisition cost.' : v <= 0.8 ? 'Acceptable, but room for creative optimization.' : 'High acquisition cost — creative or targeting needs work.',
    korInterp: (v) => v <= 0.4 ? '광고 효율 우수 — 낮은 획득 비용으로 UA 확장 가능합니다.' : v <= 0.8 ? '보통 수준 — 소재 최적화로 개선 여지가 있습니다.' : 'CPI가 높아 현재 소재/타겟팅 전략 재검토가 필요합니다.',
  },
  ctr: {
    name: 'CTR',
    korName: '클릭률',
    unit: '%',
    engInterp: (v) => v >= 2.5 ? 'Strong creative hook — ad content resonates well.' : v >= 1.5 ? 'Average CTR — minor creative refresh may help.' : 'Low CTR — ad creative needs significant improvement.',
    korInterp: (v) => v >= 2.5 ? '광고 소재 훅이 강합니다 — 시청자 반응이 좋습니다.' : v >= 1.5 ? '평균 수준 — 소재 일부 리프레시를 권장합니다.' : 'CTR이 낮습니다 — 광고 소재 대폭 개선이 필요합니다.',
  },
  ipm: {
    name: 'IPM',
    korName: '천회 노출당 설치',
    unit: '',
    engInterp: (v) => v >= 35 ? 'High conversion rate — strong ad-to-install funnel.' : v >= 20 ? 'Moderate IPM — funnel optimization recommended.' : 'Low IPM — ad creative or store page needs improvement.',
    korInterp: (v) => v >= 35 ? '전환율 우수 — 광고에서 설치까지 퍼널이 효과적입니다.' : v >= 20 ? '중간 수준 — 퍼널 최적화를 권장합니다.' : 'IPM이 낮습니다 — 소재 또는 스토어 페이지 개선이 필요합니다.',
  },
  d1Retention: {
    name: 'D1 Retention',
    korName: 'Day 1 잔존율',
    unit: '%',
    engInterp: (v) => v >= 35 ? 'Solid D1 — first impression drives strong day-one return.' : v >= 25 ? 'Average D1 — onboarding flow has room to improve.' : 'Weak D1 — core loop or onboarding critically needs rework.',
    korInterp: (v) => v >= 35 ? 'D1 우수 — 첫 인상이 강해 재방문율이 높습니다.' : v >= 25 ? 'D1 평균 — 온보딩 흐름 개선이 필요합니다.' : 'D1 위험 — 코어루프 또는 온보딩 구조 전면 재검토가 필요합니다.',
  },
  d3Retention: {
    name: 'D3 Retention',
    korName: 'Day 3 잔존율',
    unit: '%',
    engInterp: (v) => v >= 18 ? 'Good D3 — early game progression keeps players engaged.' : v >= 10 ? 'Moderate D3 — progression or reward pacing needs adjustment.' : 'Low D3 — early churn indicates weak gameplay loop.',
    korInterp: (v) => v >= 18 ? 'D3 우수 — 초반 진행구조가 유저를 유지하고 있습니다.' : v >= 10 ? 'D3 보통 — 보상 설계 또는 진행 속도 조정이 필요합니다.' : 'D3 위험 — 초반 이탈이 심각합니다. 게임플레이 루프 개선 필수.',
  },
  d7Retention: {
    name: 'D7 Retention',
    korName: 'Day 7 잔존율',
    unit: '%',
    engInterp: (v) => v >= 8 ? 'Healthy D7 — mid-game content sustains player interest.' : v >= 4 ? 'Below average D7 — mid-term engagement needs reinforcement.' : 'Critical D7 — long-term retention cannot support UA scale.',
    korInterp: (v) => v >= 8 ? 'D7 양호 — 중반 콘텐츠가 유저를 꾸준히 유지합니다.' : v >= 4 ? 'D7 평균 이하 — 중기 참여도 강화가 필요합니다.' : 'D7 위험 — 이 수준으로는 UA 확장 ROI를 확보할 수 없습니다.',
  },
  arpdau: {
    name: 'ARPDAU',
    korName: '일 평균 수익',
    unit: '$',
    engInterp: (v) => v >= 0.04 ? 'Strong monetization — revenue per user supports scaling.' : v >= 0.02 ? 'Moderate ARPDAU — ad or IAP optimization recommended.' : 'Low ARPDAU — current monetization structure needs redesign.',
    korInterp: (v) => v >= 0.04 ? '수익화 우수 — 유저당 수익이 UA 확장을 뒷받침합니다.' : v >= 0.02 ? 'ARPDAU 보통 — 광고 또는 인앱결제 최적화가 필요합니다.' : 'ARPDAU 위험 — 현재 수익화 구조 전면 재설계가 필요합니다.',
  },
  day1Playtime: {
    name: 'Day1 Playtime',
    korName: '첫날 플레이 시간',
    unit: '분',
    engInterp: (v) => v >= 8 ? 'Excellent session depth — players are deeply engaged.' : v >= 5 ? 'Average play time — session length optimization recommended.' : 'Short session — game may lack depth or has friction early on.',
    korInterp: (v) => v >= 8 ? '세션 깊이 우수 — 유저가 게임에 깊이 몰입합니다.' : v >= 5 ? '평균 플레이 시간 — 세션 연장을 위한 개선이 필요합니다.' : '세션이 짧습니다 — 초반 경험 마찰 또는 콘텐츠 깊이 부족.',
  },
};

function buildKpiCards(data: GameTestData): KpiCard[] {
  const entries: [string, number][] = [
    ['cpi', data.cpi],
    ['ctr', data.ctr],
    ['ipm', data.ipm],
    ['d1Retention', data.d1Retention],
    ['d3Retention', data.d3Retention],
    ['d7Retention', data.d7Retention],
    ['arpdau', data.arpdau],
    ['day1Playtime', data.day1Playtime],
  ];

  return entries.map(([key, value]) => {
    const meta = kpiMeta[key];
    const status = getKpiStatus(key, value);
    return {
      key,
      name: meta.name,
      korName: meta.korName,
      value,
      unit: meta.unit,
      status,
      interpretation: meta.engInterp(value),
      korInterpretation: meta.korInterp(value),
    };
  });
}

function determineDecision(
  marketability: number,
  retention: number,
  monetization: number,
  data: GameTestData
): { decision: Decision; confidence: number } {
  const d1Risk = getKpiStatus('d1Retention', data.d1Retention) === 'risk';
  const d3Risk = getKpiStatus('d3Retention', data.d3Retention) === 'risk';
  const d7Risk = getKpiStatus('d7Retention', data.d7Retention) === 'risk';

  const allRetentionRisk = d1Risk && d3Risk && d7Risk;
  const bothLow = marketability < 40 && retention < 40;

  if (allRetentionRisk || bothLow) {
    const confidence = Math.round(100 - (marketability + retention) / 2);
    return { decision: 'kill', confidence: Math.min(95, Math.max(60, confidence)) };
  }

  const riskKpiCount = [
    getKpiStatus('cpi', data.cpi),
    getKpiStatus('ctr', data.ctr),
    getKpiStatus('ipm', data.ipm),
    getKpiStatus('d1Retention', data.d1Retention),
    getKpiStatus('d3Retention', data.d3Retention),
    getKpiStatus('d7Retention', data.d7Retention),
    getKpiStatus('arpdau', data.arpdau),
    getKpiStatus('day1Playtime', data.day1Playtime),
  ].filter((s) => s === 'risk').length;

  if (marketability >= 70 && retention >= 70 && riskKpiCount <= 1) {
    const avgScore = (marketability + retention + monetization) / 3;
    const confidence = Math.round(50 + avgScore / 2);
    return { decision: 'scale', confidence: Math.min(96, Math.max(70, confidence)) };
  }

  // Iterate
  const avgScore = (marketability + retention + monetization) / 3;
  const confidence = Math.round(40 + avgScore / 3);
  return { decision: 'iterate', confidence: Math.min(88, Math.max(55, confidence)) };
}

function findBottleneck(
  marketability: number,
  retention: number,
  monetization: number,
  data: GameTestData
): { bottleneck: string; korBottleneck: string } {
  const scores = [
    { key: 'marketability', score: marketability, eng: 'Ad Marketability', kor: '광고 시장성 (CPI/CTR/IPM)' },
    { key: 'retention', score: retention, eng: 'Retention', kor: '유저 리텐션 (D1/D3/D7)' },
    { key: 'monetization', score: monetization, eng: 'Monetization', kor: '수익화 (ARPDAU/Playtime)' },
  ];
  const worst = scores.reduce((a, b) => (a.score < b.score ? a : b));

  if (worst.key === 'retention') {
    if (data.d1Retention < 25) {
      return { bottleneck: 'Weak D1 Retention — onboarding experience critical', korBottleneck: 'D1 잔존율 위험 — 온보딩 경험이 핵심 문제입니다' };
    }
    if (data.d7Retention < 4) {
      return { bottleneck: 'D7 Retention collapse — mid-game engagement failing', korBottleneck: 'D7 잔존율 급락 — 중반 콘텐츠 참여도가 낮습니다' };
    }
    return { bottleneck: 'Retention funnel leaking — engagement needs reinforcement', korBottleneck: '리텐션 퍼널 누수 — 참여도 강화가 필요합니다' };
  }
  if (worst.key === 'marketability') {
    if (data.cpi > 0.8) {
      return { bottleneck: 'High CPI — ad creative or targeting inefficient', korBottleneck: 'CPI 과다 — 광고 소재 또는 타겟팅 효율 개선 필요' };
    }
    return { bottleneck: 'Low marketability — ad funnel needs optimization', korBottleneck: '시장성 낮음 — 광고 퍼널 최적화가 필요합니다' };
  }
  return { bottleneck: 'Low monetization — revenue model needs improvement', korBottleneck: '수익화 부족 — 광고 배치 또는 인앱결제 구조 개선 필요' };
}

function buildAiInsight(
  data: GameTestData,
  decision: Decision,
  marketability: number,
  retention: number,
  _monetization: number
): AnalysisResult['aiInsight'] {
  const gameTitle = data.gameName;

  if (decision === 'scale') {
    return {
      executiveSummaryKor: `${gameTitle}는 마케팅성, 리텐션, 수익화 모두에서 기준치를 상회하는 강력한 성과를 보였습니다. 현 단계에서 UA 예산 확대를 통한 본격 스케일업이 권장됩니다.`,
      executiveSummary: `${gameTitle} demonstrates strong performance across marketability, retention, and monetization metrics. A full UA scale-up is recommended at this stage.`,
      whatIsWorkingKor: `CPI $${data.cpi}로 경쟁력 있는 획득 비용을 유지하면서, D1 ${data.d1Retention}% / D7 ${data.d7Retention}%의 우수한 리텐션 곡선을 보이고 있습니다. ARPDAU $${data.arpdau}는 수익화 구조가 유저 LTV를 뒷받침함을 나타냅니다.`,
      whatIsWorking: `Competitive CPI of $${data.cpi} combined with strong retention (D1: ${data.d1Retention}%, D7: ${data.d7Retention}%) indicates a well-optimized funnel. ARPDAU of $${data.arpdau} supports healthy LTV projections.`,
      keyRiskKor: `스케일업 과정에서 CPI가 현재 수준 이상으로 상승할 가능성이 있습니다. 리텐션 지표를 주간 단위로 모니터링하고, D30 리텐션 데이터를 확보하기 전까지 단계적 예산 집행을 권장합니다.`,
      keyRisk: `CPI may rise as UA budgets scale. Monitor retention metrics weekly. Staged budget increases are recommended until D30 retention data is available.`,
      whyItMattersKor: `현재 지표 수준이 유지된다면, 이 게임은 수익성 있는 퍼블리싱 타이틀로 성장할 잠재력을 갖추고 있습니다. 빠른 확장 결정이 시장 선점 기회를 좌우할 수 있습니다.`,
      whyItMatters: `At current metrics, this title has strong potential to become a profitable publishing title. Speed of scale-up decisions can determine market positioning.`,
      recommendedDirectionKor: `UA 예산을 현재 대비 3-5배 증액하여 테스트하세요. 소재 다양화와 타겟 지역 확장을 병행하고, ROAS 모니터링 체계를 구축하십시오.`,
      recommendedDirection: `Increase UA budget by 3-5x for the next phase. Diversify creatives and expand target geos. Establish a ROAS monitoring framework for ongoing optimization.`,
    };
  }

  if (decision === 'kill') {
    return {
      executiveSummaryKor: `${gameTitle}의 핵심 지표들이 확장 가능한 수준에 미달합니다. 현재 코어루프와 광고 전략으로는 수익성 있는 UA 스케일을 달성하기 어렵습니다.`,
      executiveSummary: `${gameTitle}'s core metrics fall below viable publishing thresholds. Current core loop and ad strategy cannot support profitable UA scale.`,
      whatIsWorkingKor: `아직 개선 가능성이 있는 영역을 탐색 중입니다. ${marketability > 30 ? `광고 시장성 점수(${marketability}점)는 부분적으로 소재 잠재력이 있음을 시사합니다.` : '현재 단계에서 강점으로 꼽을 지표가 제한적입니다.'}`,
      whatIsWorking: `${marketability > 30 ? `Marketability score of ${marketability} suggests some ad creative potential worth exploring.` : 'Limited metrics indicate strength at this stage.'}`,
      keyRiskKor: `D1 ${data.d1Retention}%, D7 ${data.d7Retention}%의 리텐션 곡선은 코어 게임플레이의 근본적인 문제를 나타냅니다. 이 수준에서의 UA 투자는 지속 불가능한 LTV를 생성합니다.`,
      keyRisk: `D1 ${data.d1Retention}% and D7 ${data.d7Retention}% retention indicates fundamental gameplay issues. UA investment at these levels produces unsustainable LTV.`,
      whyItMattersKor: `현재 지표로는 UA 비용을 회수할 수 있는 LTV가 형성되지 않습니다. 추가 투자 전 코어루프 재설계가 선행되어야 합니다.`,
      whyItMatters: `Current metrics cannot generate sufficient LTV to recover UA costs. Core loop redesign must precede any additional investment.`,
      recommendedDirectionKor: `UA 집행을 즉시 중단하고, 팀 내부 게임플레이 리뷰를 진행하세요. 코어루프 재설계 후 소규모 테스트(일 $50 이하)로 지표 변화를 확인한 뒤 재판단하십시오.`,
      recommendedDirection: `Stop UA spend immediately. Conduct internal gameplay review. Redesign core loop, then validate with minimal spend ($50/day) before any re-evaluation.`,
    };
  }

  // Iterate
  const strongPoint = marketability > retention
    ? `광고 시장성(${marketability}점)이 리텐션(${retention}점)보다 강합니다`
    : `리텐션(${retention}점)이 광고 시장성(${marketability}점)보다 강합니다`;

  return {
    executiveSummaryKor: `${gameTitle}는 일부 강점을 가지고 있으나 확장 전 개선이 필요한 영역이 존재합니다. ${strongPoint}. 핵심 병목을 해소한 뒤 재테스트를 권장합니다.`,
    executiveSummary: `${gameTitle} shows mixed signals with clear strengths in some areas. ${marketability > retention ? `Marketability (${marketability}) outperforms Retention (${retention})` : `Retention (${retention}) outperforms Marketability (${marketability})`}. Focused iteration recommended before scale.`,
    whatIsWorkingKor: `${data.cpi <= 0.4 ? `CPI $${data.cpi}로 광고 획득 효율이 우수합니다.` : data.d1Retention >= 35 ? `D1 잔존율 ${data.d1Retention}%로 첫 인상 경험이 양호합니다.` : `CTR ${data.ctr}%로 광고 소재의 훅이 작동하고 있습니다.`} 이 강점을 유지하면서 약점을 보완하는 전략이 필요합니다.`,
    whatIsWorking: `${data.cpi <= 0.4 ? `Strong CPI of $${data.cpi} indicates efficient ad acquisition.` : data.d1Retention >= 35 ? `D1 retention of ${data.d1Retention}% shows a solid first impression.` : `CTR of ${data.ctr}% indicates the ad creative hook is working.`} These strengths should be preserved while addressing weaknesses.`,
    keyRiskKor: `${data.d3Retention < 18 ? `D3 잔존율 ${data.d3Retention}%가 핵심 병목입니다. 3일 이내 이탈이 많아 초반 게임플레이 경험 개선이 시급합니다.` : data.cpi > 0.4 ? `CPI $${data.cpi}가 상승 추세입니다. 현재 UA 비용 구조로는 수익성 달성이 어렵습니다.` : `수익화 지표(ARPDAU $${data.arpdau})가 UA 비용을 정당화하기에 부족합니다.`}`,
    keyRisk: `${data.d3Retention < 18 ? `D3 retention of ${data.d3Retention}% is the critical bottleneck. Significant churn within 3 days suggests early gameplay needs improvement.` : data.cpi > 0.4 ? `CPI of $${data.cpi} makes current UA economics challenging for profitability.` : `Monetization (ARPDAU $${data.arpdau}) insufficient to justify UA costs at scale.`}`,
    whyItMattersKor: `이 게임은 개선 가능성이 있습니다. 올바른 실험 방향으로 2-3주 내 재테스트가 가능하며, 지표 개선 시 스케일 결정으로 전환될 수 있습니다.`,
    whyItMatters: `This title has potential. With targeted experiments, a re-test in 2-3 weeks could unlock the path to scale. The window for iteration is open.`,
    recommendedDirectionKor: `${data.d3Retention < 18 ? '온보딩 플로우와 3일 이내 진행 구조를 우선 개선하세요. D3 지표를 18% 이상으로 끌어올리는 것이 최우선 목표입니다.' : data.cpi > 0.8 ? '광고 소재를 전면 교체하고 타겟 오디언스를 좁혀 CPI를 $0.5 이하로 낮추는 것을 목표로 하세요.' : 'ARPDAU를 높이기 위해 인터스티셜 광고 배치와 보상형 광고 노출 빈도를 조정하세요.'}`,
    recommendedDirection: `${data.d3Retention < 18 ? 'Prioritize onboarding flow and early progression (Day 1-3). Target D3 retention above 18% before re-scaling.' : data.cpi > 0.8 ? 'Refresh ad creatives completely and narrow targeting to reduce CPI below $0.50.' : 'Optimize ad placement and rewarded ad frequency to improve ARPDAU above $0.04.'}`,
  };
}

function buildExperimentPlan(
  data: GameTestData,
  decision: Decision,
  _marketability: number,
  _retention: number
): ExperimentItem[] {
  const plans: ExperimentItem[] = [];

  if (decision === 'kill') {
    plans.push(
      {
        priority: 1,
        experiment: 'Core Loop Redesign Sprint',
        experimentKor: '코어루프 전면 재설계',
        targetKpi: 'D1/D3 Retention',
        expectedImpact: 'D1 +10~15%p improvement target',
        expectedImpactKor: 'D1 잔존율 10~15%p 향상 목표',
        owner: 'Game Designer',
        ownerKor: '게임 기획자',
      },
      {
        priority: 2,
        experiment: 'Onboarding Tutorial A/B Test',
        experimentKor: '온보딩 튜토리얼 A/B 테스트',
        targetKpi: 'D1 Retention, Day1 Playtime',
        expectedImpact: 'Tutorial skip rate reduction by 30%',
        expectedImpactKor: '튜토리얼 스킵율 30% 감소 목표',
        owner: 'UX Designer + PM',
        ownerKor: 'UX 디자이너 + 기획자',
      },
      {
        priority: 3,
        experiment: 'Ad Creative Complete Overhaul',
        experimentKor: '광고 소재 전면 교체',
        targetKpi: 'CPI, CTR, IPM',
        expectedImpact: 'CTR improvement to 2.0%+ target',
        expectedImpactKor: 'CTR 2.0% 이상 달성 목표',
        owner: 'UA / Creative Team',
        ownerKor: 'UA / 크리에이티브 팀',
      }
    );
    return plans;
  }

  if (decision === 'scale') {
    plans.push(
      {
        priority: 1,
        experiment: 'Geo Expansion Test — Tier 1 Markets',
        experimentKor: 'Tier 1 시장 지역 확장 테스트',
        targetKpi: 'Install Volume, CPI',
        expectedImpact: '3x install volume with CPI ≤ $0.45',
        expectedImpactKor: '설치량 3배 확장, CPI $0.45 이하 유지',
        owner: 'UA Manager',
        ownerKor: 'UA 매니저',
      },
      {
        priority: 2,
        experiment: 'LTV Optimization — IAP Funnel Test',
        experimentKor: 'LTV 최적화 — 인앱결제 퍼널 테스트',
        targetKpi: 'ARPDAU, D30 ROAS',
        expectedImpact: 'ARPDAU uplift 20%+',
        expectedImpactKor: 'ARPDAU 20% 이상 향상',
        owner: 'Monetization PM',
        ownerKor: '수익화 기획자',
      },
      {
        priority: 3,
        experiment: 'Creative Scaling — Top Performer Variations',
        experimentKor: '광고 소재 스케일링 — 최고 성과 변형 테스트',
        targetKpi: 'CTR, IPM',
        expectedImpact: 'Maintain CTR ≥ 3.0% at scale',
        expectedImpactKor: '스케일 확장 시 CTR 3.0% 이상 유지',
        owner: 'Creative Team',
        ownerKor: '크리에이티브 팀',
      }
    );
    return plans;
  }

  // Iterate plans — based on weakest KPIs
  const hasWeakD3 = data.d3Retention < 18;
  const hasWeakD7 = data.d7Retention < 8;
  const hasHighCpi = data.cpi > 0.4;
  const hasWeakArpdau = data.arpdau < 0.04;
  const hasWeakD1 = data.d1Retention < 35;

  if (hasWeakD1 || hasWeakD3) {
    plans.push({
      priority: plans.length + 1,
      experiment: 'Onboarding Flow Optimization',
      experimentKor: '온보딩 플로우 최적화',
      targetKpi: 'D1 Retention, D3 Retention',
      expectedImpact: `D1 target: 35%+ (current: ${data.d1Retention}%)`,
      expectedImpactKor: `D1 목표 35% 이상 달성 (현재: ${data.d1Retention}%)`,
      owner: 'Game Designer',
      ownerKor: '게임 기획자',
    });
  }

  if (hasWeakD7) {
    plans.push({
      priority: plans.length + 1,
      experiment: 'Mid-Game Content & Daily Quest System',
      experimentKor: '중반 콘텐츠 및 데일리 퀘스트 시스템 추가',
      targetKpi: 'D7 Retention, Day1 Playtime',
      expectedImpact: `D7 target: 8%+ (current: ${data.d7Retention}%)`,
      expectedImpactKor: `D7 목표 8% 이상 달성 (현재: ${data.d7Retention}%)`,
      owner: 'Game Designer + Content Team',
      ownerKor: '게임 기획자 + 콘텐츠 팀',
    });
  }

  if (hasHighCpi) {
    plans.push({
      priority: plans.length + 1,
      experiment: 'Creative Refresh — Gameplay Hook Variants',
      experimentKor: '광고 소재 교체 — 게임플레이 훅 변형 테스트',
      targetKpi: 'CPI, CTR',
      expectedImpact: `CPI target: ≤$0.40 (current: $${data.cpi})`,
      expectedImpactKor: `CPI 목표 $0.40 이하 (현재: $${data.cpi})`,
      owner: 'UA / Creative Team',
      ownerKor: 'UA / 크리에이티브 팀',
    });
  }

  if (hasWeakArpdau) {
    plans.push({
      priority: plans.length + 1,
      experiment: 'Rewarded Ad Placement Optimization',
      experimentKor: '보상형 광고 배치 최적화',
      targetKpi: 'ARPDAU',
      expectedImpact: `ARPDAU target: $0.04+ (current: $${data.arpdau})`,
      expectedImpactKor: `ARPDAU 목표 $0.04 이상 (현재: $${data.arpdau})`,
      owner: 'Monetization PM',
      ownerKor: '수익화 기획자',
    });
  }

  // 보완 실험 추가 (최소 3개 보장)
  if (plans.length < 3) {
    plans.push({
      priority: plans.length + 1,
      experiment: 'Push Notification Re-engagement Sequence',
      experimentKor: '푸시 알림 재참여 시퀀스 설계',
      targetKpi: 'D3, D7 Retention',
      expectedImpact: 'Lapsed user recovery rate +15%',
      expectedImpactKor: '이탈 유저 재참여율 15% 향상',
      owner: 'Marketing + Game PM',
      ownerKor: '마케팅 + 게임 기획자',
    });
  }

  return plans.slice(0, 5);
}

function buildMeetingSummary(
  data: GameTestData,
  decision: Decision,
  confidence: number,
  marketability: number,
  retention: number,
  monetization: number,
  korBottleneck: string,
  experiments: ExperimentItem[]
): { eng: string; kor: string } {
  const decisionLabel = { scale: 'SCALE', iterate: 'ITERATE', kill: 'KILL' }[decision];
  const dateStr = new Date().toLocaleDateString('ko-KR');

  const kor = `[${data.gameName}] 소프트런치 테스트 결과 보고
작성일: ${dateStr}

■ 분석 결론
최종 결정: ${decisionLabel} (신뢰도 ${confidence}%)

■ 핵심 지표 요약
- CPI: $${data.cpi} | CTR: ${data.ctr}% | IPM: ${data.ipm}
- D1 잔존율: ${data.d1Retention}% | D3: ${data.d3Retention}% | D7: ${data.d7Retention}%
- ARPDAU: $${data.arpdau} | 첫날 플레이: ${data.day1Playtime}분

■ 종합 점수
- 광고 시장성: ${marketability}점 / 100
- 리텐션: ${retention}점 / 100
- 수익화: ${monetization}점 / 100

■ 핵심 병목
${korBottleneck}

■ 우선 실험 계획
${experiments.slice(0, 3).map((e, i) => `${i + 1}. ${e.experimentKor} (담당: ${e.ownerKor})\n   목표: ${e.expectedImpactKor}`).join('\n')}

* 본 분석은 Prototype Benchmark 기준을 사용하였으며, 실제 업계 절대 기준과 다를 수 있습니다.
* Game Test Insight Copilot (Supercent AI Prototype)`;

  const eng = `[${data.gameName}] Soft Launch Test Report
Date: ${dateStr}

DECISION: ${decisionLabel} (Confidence: ${confidence}%)

KEY METRICS
- CPI: $${data.cpi} | CTR: ${data.ctr}% | IPM: ${data.ipm}
- D1: ${data.d1Retention}% | D3: ${data.d3Retention}% | D7: ${data.d7Retention}%
- ARPDAU: $${data.arpdau} | Day1 Playtime: ${data.day1Playtime}min

COMPOSITE SCORES
- Marketability: ${marketability}/100
- Retention: ${retention}/100
- Monetization: ${monetization}/100

TOP EXPERIMENTS
${experiments.slice(0, 3).map((e, i) => `${i + 1}. ${e.experiment} (Owner: ${e.owner})\n   Target: ${e.expectedImpact}`).join('\n')}

* Generated by Game Test Insight Copilot (Supercent AI Prototype)`;

  return { eng, kor };
}

export async function analyzeGame(data: GameTestData): Promise<AnalysisResult> {
  const marketability = calcMarketabilityScore(data.cpi, data.ctr, data.ipm);
  const retention = calcRetentionScore(data.d1Retention, data.d3Retention, data.d7Retention);
  const monetization = calcMonetizationScore(data.arpdau, data.day1Playtime);

  const { decision, confidence } = determineDecision(marketability, retention, monetization, data);
  const { bottleneck, korBottleneck } = findBottleneck(marketability, retention, monetization, data);

  const focusMap: Record<Decision, { eng: string; kor: string }> = {
    scale: { eng: 'UA Budget Expansion', kor: 'UA 예산 확대' },
    iterate: {
      eng: retention < marketability ? 'Retention Improvement' : 'Ad Creative Optimization',
      kor: retention < marketability ? '리텐션 개선' : '광고 소재 최적화',
    },
    kill: { eng: 'Core Loop Redesign', kor: '코어루프 재설계' },
  };

  const kpiCards = buildKpiCards(data);
  let aiInsight = buildAiInsight(data, decision, marketability, retention, monetization);
  const experimentPlan = buildExperimentPlan(data, decision, marketability, retention);
  const { eng: meetingSummary, kor: meetingSummaryKor } = buildMeetingSummary(
    data, decision, confidence, marketability, retention, monetization, korBottleneck, experimentPlan
  );

  // Gemini API 연동: 키가 있으면 AI 인사이트를 Gemini로 교체
  if (isGeminiEnabled()) {
    const geminiResult = await generateGeminiInsight(data, decision);
    if (geminiResult) {
      aiInsight = {
        ...aiInsight,
        executiveSummaryKor: geminiResult.executiveSummaryKor,
        whatIsWorkingKor: geminiResult.whatIsWorkingKor,
        keyRiskKor: geminiResult.keyRiskKor,
        whyItMattersKor: geminiResult.whyItMattersKor,
        recommendedDirectionKor: geminiResult.recommendedDirectionKor,
      };
    }
  }

  return {
    decision,
    confidence,
    mainBottleneck: bottleneck,
    korBottleneck,
    recommendedFocus: focusMap[decision].eng,
    korFocus: focusMap[decision].kor,
    marketabilityScore: marketability,
    retentionScore: retention,
    monetizationScore: monetization,
    kpiCards,
    aiInsight,
    experimentPlan,
    meetingSummary,
    meetingSummaryKor,
  };
}
