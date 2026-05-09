import type { AnalysisSettings, GameGenre } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';

export interface BenchmarkPreset {
  id: string;
  label: string;
  genre: GameGenre;
  market: string;
  platform: string;
  note: string;
  settings: AnalysisSettings;
}

function settings(overrides: Partial<AnalysisSettings['thresholds']>, weights = DEFAULT_SETTINGS.weights): AnalysisSettings {
  return {
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...overrides },
    weights,
    customPrompt: '',
  };
}

export const benchmarkPresets: BenchmarkPreset[] = [
  {
    id: 'hypercasual-global-mobile',
    label: '하이퍼캐주얼 · 글로벌 · Mobile',
    genre: '하이퍼캐주얼',
    market: 'Global',
    platform: 'iOS/Android',
    note: '낮은 CPI와 빠른 D1 검증을 중시하는 내부 프로토타입 기준',
    settings: settings({
      cpi: { good: 0.35, watch: 0.7 },
      d1Retention: { good: 32, watch: 23 },
      d7Retention: { good: 6, watch: 3 },
      day1Playtime: { good: 6, watch: 4 },
    }),
  },
  {
    id: 'hybridcasual-us-mobile',
    label: '하이브리드캐주얼 · US · Mobile',
    genre: '하이브리드캐주얼',
    market: 'US',
    platform: 'iOS/Android',
    note: '리텐션과 수익화 균형을 더 강하게 보는 내부 프로토타입 기준',
    settings: settings({
      cpi: { good: 0.55, watch: 1.1 },
      d1Retention: { good: 35, watch: 25 },
      d3Retention: { good: 18, watch: 10 },
      d7Retention: { good: 8, watch: 4 },
      arpdau: { good: 0.045, watch: 0.025 },
    }, { marketability: 30, retention: 45, monetization: 25 }),
  },
  {
    id: 'casual-kr-mobile',
    label: '캐주얼 · KR · Mobile',
    genre: '캐주얼',
    market: 'KR',
    platform: 'iOS/Android',
    note: '초반 잔존과 플레이 시간을 더 보수적으로 보는 내부 프로토타입 기준',
    settings: settings({
      ctr: { good: 2.2, watch: 1.3 },
      d1Retention: { good: 38, watch: 28 },
      d3Retention: { good: 20, watch: 12 },
      d7Retention: { good: 9, watch: 5 },
      day1Playtime: { good: 9, watch: 6 },
    }, { marketability: 30, retention: 50, monetization: 20 }),
  },
];
