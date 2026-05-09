import type { KpiStatus } from '../types/gameTest';

interface KpiThreshold {
  good: number;
  watch: number;
  reversed?: boolean; // true = 낮을수록 좋음 (CPI 등)
}

const thresholds: Record<string, KpiThreshold> = {
  cpi:          { good: 0.4,  watch: 0.8,  reversed: true },
  ctr:          { good: 2.5,  watch: 1.5 },
  ipm:          { good: 35,   watch: 20 },
  d1Retention:  { good: 35,   watch: 25 },
  d3Retention:  { good: 18,   watch: 10 },
  d7Retention:  { good: 8,    watch: 4 },
  arpdau:       { good: 0.04, watch: 0.02 },
  day1Playtime: { good: 8,    watch: 5 },
};

export function getKpiStatus(key: string, value: number): KpiStatus {
  const t = thresholds[key];
  if (!t) return 'watch';

  if (t.reversed) {
    // 낮을수록 good
    if (value <= t.good) return 'good';
    if (value <= t.watch) return 'watch';
    return 'risk';
  } else {
    if (value >= t.good) return 'good';
    if (value >= t.watch) return 'watch';
    return 'risk';
  }
}

/** 0-100 점수 정규화 (일반 방향: 높을수록 좋음) */
function normalizeScore(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / (max - min)) * 100;
}

/** 0-100 점수 정규화 (역방향: 낮을수록 좋음) */
function normalizeScoreReversed(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((max - clamped) / (max - min)) * 100;
}

/**
 * Marketability Score (0-100)
 * CPI 40% + CTR 30% + IPM 30%
 */
export function calcMarketabilityScore(cpi: number, ctr: number, ipm: number): number {
  const cpiScore  = normalizeScoreReversed(cpi, 0.2, 1.5);  // 역방향
  const ctrScore  = normalizeScore(ctr, 0.5, 5.0);
  const ipmScore  = normalizeScore(ipm, 5, 60);
  return Math.round(cpiScore * 0.4 + ctrScore * 0.3 + ipmScore * 0.3);
}

/**
 * Retention Score (0-100)
 * D1 40% + D3 35% + D7 25%
 */
export function calcRetentionScore(d1: number, d3: number, d7: number): number {
  const d1Score = normalizeScore(d1, 10, 55);
  const d3Score = normalizeScore(d3, 3, 30);
  const d7Score = normalizeScore(d7, 1, 15);
  return Math.round(d1Score * 0.4 + d3Score * 0.35 + d7Score * 0.25);
}

/**
 * Monetization Score (0-100)
 * ARPDAU 70% + Day1Playtime 30%
 */
export function calcMonetizationScore(arpdau: number, playtime: number): number {
  const arpdauScore   = normalizeScore(arpdau, 0.005, 0.08);
  const playtimeScore = normalizeScore(playtime, 2, 15);
  return Math.round(arpdauScore * 0.7 + playtimeScore * 0.3);
}
