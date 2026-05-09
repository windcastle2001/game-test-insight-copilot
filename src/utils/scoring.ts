import type { AnalysisSettings, KpiStatus } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';

interface KpiThreshold {
  good: number;
  watch: number;
  reversed?: boolean;
}

function thresholds(settings?: AnalysisSettings): Record<string, KpiThreshold> {
  const t = (settings ?? DEFAULT_SETTINGS).thresholds;
  return {
    cpi: { ...t.cpi, reversed: true },
    ctr: t.ctr,
    ipm: t.ipm,
    d1Retention: t.d1Retention,
    d3Retention: t.d3Retention,
    d7Retention: t.d7Retention,
    arpdau: t.arpdau,
    day1Playtime: t.day1Playtime,
  };
}

export function getKpiStatus(key: string, value: number, settings?: AnalysisSettings): KpiStatus {
  const t = thresholds(settings)[key];
  if (!t) return 'watch';

  if (t.reversed) {
    if (value <= t.good) return 'good';
    if (value <= t.watch) return 'watch';
    return 'risk';
  }

  if (value >= t.good) return 'good';
  if (value >= t.watch) return 'watch';
  return 'risk';
}

function score(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / (max - min)) * 100;
}

function scoreReversed(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((max - clamped) / (max - min)) * 100;
}

export function calcMarketabilityScore(cpi: number, ctr: number, ipm: number): number {
  return Math.round(scoreReversed(cpi, 0.2, 1.5) * 0.4 + score(ctr, 0.5, 5) * 0.3 + score(ipm, 5, 60) * 0.3);
}

export function calcRetentionScore(d1: number, d3: number, d7: number): number {
  return Math.round(score(d1, 10, 55) * 0.4 + score(d3, 3, 30) * 0.35 + score(d7, 1, 15) * 0.25);
}

export function calcMonetizationScore(arpdau: number, playtime: number): number {
  return Math.round(score(arpdau, 0.005, 0.08) * 0.7 + score(playtime, 2, 15) * 0.3);
}

export function calcWeightedScore(
  marketability: number,
  retention: number,
  monetization: number,
  settings?: AnalysisSettings
): number {
  const w = (settings ?? DEFAULT_SETTINGS).weights;
  const total = w.marketability + w.retention + w.monetization;
  if (total <= 0) return Math.round((marketability + retention + monetization) / 3);
  return Math.round((marketability * w.marketability + retention * w.retention + monetization * w.monetization) / total);
}
