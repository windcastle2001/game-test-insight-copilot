import type { AnalysisSettings, GameTestData, KpiStatus } from '../types/gameTest';
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
    d0TutorialCompletion: t.d0TutorialCompletion,
    firstSessionDropoff: { ...t.firstSessionDropoff, reversed: true },
    adWatchCompletion: t.adWatchCompletion,
    storeConversion: t.storeConversion,
    d14Retention: t.d14Retention,
    d30Retention: t.d30Retention,
    roas: t.roas,
    ltv: t.ltv,
  };
}

export function hasMetric(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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

function average(parts: Array<{ value: number | undefined; weight: number }>): number {
  const valid = parts.filter((part) => hasMetric(part.value));
  const totalWeight = valid.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) return 0;
  return Math.round(valid.reduce((sum, part) => sum + (part.value as number) * part.weight, 0) / totalWeight);
}

export function calcMarketabilityScore(data: GameTestData): number {
  return average([
    { value: scoreReversed(data.cpi, 0.2, 1.5), weight: 35 },
    { value: score(data.ctr, 0.5, 5), weight: 25 },
    { value: score(data.ipm, 5, 60), weight: 25 },
    { value: hasMetric(data.storeConversion) ? score(data.storeConversion, 5, 45) : undefined, weight: 15 },
  ]);
}

export function calcRetentionScore(data: GameTestData): number {
  return average([
    { value: score(data.d1Retention, 10, 55), weight: 28 },
    { value: score(data.d3Retention, 3, 30), weight: 24 },
    { value: score(data.d7Retention, 1, 15), weight: 20 },
    { value: hasMetric(data.d0TutorialCompletion) ? score(data.d0TutorialCompletion, 40, 95) : undefined, weight: 10 },
    { value: hasMetric(data.firstSessionDropoff) ? scoreReversed(data.firstSessionDropoff, 10, 75) : undefined, weight: 8 },
    { value: hasMetric(data.d14Retention) ? score(data.d14Retention, 0.5, 8) : undefined, weight: 6 },
    { value: hasMetric(data.d30Retention) ? score(data.d30Retention, 0.2, 5) : undefined, weight: 4 },
  ]);
}

export function calcMonetizationScore(data: GameTestData): number {
  return average([
    { value: score(data.arpdau, 0.005, 0.08), weight: 42 },
    { value: score(data.day1Playtime, 2, 15), weight: 18 },
    { value: hasMetric(data.adWatchCompletion) ? score(data.adWatchCompletion, 30, 95) : undefined, weight: 15 },
    { value: hasMetric(data.roas) ? score(data.roas, 10, 140) : undefined, weight: 15 },
    { value: hasMetric(data.ltv) ? score(data.ltv, 0.01, 0.2) : undefined, weight: 10 },
  ]);
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
