import type { KpiStatus, AnalysisSettings } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';

interface KpiThreshold {
  good: number;
  watch: number;
  reversed?: boolean;
}

const DEFAULT_THRESHOLDS: Record<string, KpiThreshold> = {
  cpi:          { good: DEFAULT_SETTINGS.thresholds.cpi.good,          watch: DEFAULT_SETTINGS.thresholds.cpi.watch,          reversed: true },
  ctr:          { good: DEFAULT_SETTINGS.thresholds.ctr.good,          watch: DEFAULT_SETTINGS.thresholds.ctr.watch },
  ipm:          { good: DEFAULT_SETTINGS.thresholds.ipm.good,          watch: DEFAULT_SETTINGS.thresholds.ipm.watch },
  d1Retention:  { good: DEFAULT_SETTINGS.thresholds.d1Retention.good,  watch: DEFAULT_SETTINGS.thresholds.d1Retention.watch },
  d3Retention:  { good: DEFAULT_SETTINGS.thresholds.d3Retention.good,  watch: DEFAULT_SETTINGS.thresholds.d3Retention.watch },
  d7Retention:  { good: DEFAULT_SETTINGS.thresholds.d7Retention.good,  watch: DEFAULT_SETTINGS.thresholds.d7Retention.watch },
  arpdau:       { good: DEFAULT_SETTINGS.thresholds.arpdau.good,       watch: DEFAULT_SETTINGS.thresholds.arpdau.watch },
  day1Playtime: { good: DEFAULT_SETTINGS.thresholds.day1Playtime.good, watch: DEFAULT_SETTINGS.thresholds.day1Playtime.watch },
};

function buildThresholds(settings?: AnalysisSettings): Record<string, KpiThreshold> {
  if (!settings) return DEFAULT_THRESHOLDS;
  const t = settings.thresholds;
  return {
    cpi:          { good: t.cpi.good,          watch: t.cpi.watch,          reversed: true },
    ctr:          { good: t.ctr.good,          watch: t.ctr.watch },
    ipm:          { good: t.ipm.good,          watch: t.ipm.watch },
    d1Retention:  { good: t.d1Retention.good,  watch: t.d1Retention.watch },
    d3Retention:  { good: t.d3Retention.good,  watch: t.d3Retention.watch },
    d7Retention:  { good: t.d7Retention.good,  watch: t.d7Retention.watch },
    arpdau:       { good: t.arpdau.good,       watch: t.arpdau.watch },
    day1Playtime: { good: t.day1Playtime.good, watch: t.day1Playtime.watch },
  };
}

export function getKpiStatus(key: string, value: number, settings?: AnalysisSettings): KpiStatus {
  const thresholds = buildThresholds(settings);
  const t = thresholds[key];
  if (!t) return 'watch';

  if (t.reversed) {
    if (value <= t.good) return 'good';
    if (value <= t.watch) return 'watch';
    return 'risk';
  } else {
    if (value >= t.good) return 'good';
    if (value >= t.watch) return 'watch';
    return 'risk';
  }
}

function normalizeScore(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / (max - min)) * 100;
}

function normalizeScoreReversed(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((max - clamped) / (max - min)) * 100;
}

/**
 * Marketability Score (0-100)
 * 기본 가중치: CPI 40% + CTR 30% + IPM 30%
 * settings가 있으면 전체 marketability 가중치로 비율 유지
 */
export function calcMarketabilityScore(
  cpi: number,
  ctr: number,
  ipm: number,
  _settings?: AnalysisSettings
): number {
  const cpiScore = normalizeScoreReversed(cpi, 0.2, 1.5);
  const ctrScore = normalizeScore(ctr, 0.5, 5.0);
  const ipmScore = normalizeScore(ipm, 5, 60);
  return Math.round(cpiScore * 0.4 + ctrScore * 0.3 + ipmScore * 0.3);
}

/**
 * Retention Score (0-100)
 * D1 40% + D3 35% + D7 25%
 */
export function calcRetentionScore(
  d1: number,
  d3: number,
  d7: number,
  _settings?: AnalysisSettings
): number {
  const d1Score = normalizeScore(d1, 10, 55);
  const d3Score = normalizeScore(d3, 3, 30);
  const d7Score = normalizeScore(d7, 1, 15);
  return Math.round(d1Score * 0.4 + d3Score * 0.35 + d7Score * 0.25);
}

/**
 * Monetization Score (0-100)
 * ARPDAU 70% + Day1Playtime 30%
 */
export function calcMonetizationScore(
  arpdau: number,
  playtime: number,
  _settings?: AnalysisSettings
): number {
  const arpdauScore   = normalizeScore(arpdau, 0.005, 0.08);
  const playtimeScore = normalizeScore(playtime, 2, 15);
  return Math.round(arpdauScore * 0.7 + playtimeScore * 0.3);
}

/**
 * 가중 합산 점수 (settings weights 반영)
 */
export function calcWeightedScore(
  marketability: number,
  retention: number,
  monetization: number,
  settings?: AnalysisSettings
): number {
  const w = settings?.weights ?? DEFAULT_SETTINGS.weights;
  const total = w.marketability + w.retention + w.monetization;
  if (total === 0) return Math.round((marketability + retention + monetization) / 3);

  return Math.round(
    (marketability * w.marketability + retention * w.retention + monetization * w.monetization) / total
  );
}
