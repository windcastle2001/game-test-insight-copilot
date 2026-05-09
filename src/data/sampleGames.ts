import type { GameTestData } from '../types/gameTest';

export interface SampleGame {
  id: string;
  label: string;
  expectedDecision: string;
  description: string;
  data: GameTestData;
}

export const sampleGames: SampleGame[] = [
  {
    id: 'idle-dungeon-tycoon',
    label: 'Idle Dungeon Tycoon',
    expectedDecision: 'Iterate',
    description: '광고 반응은 좋지만 중기 리텐션 보강 필요',
    data: {
      gameName: 'Idle Dungeon Tycoon',
      gameGenre: '하이브리드캐주얼',
      testPeriod: '2026-04-01 ~ 2026-04-14',
      cpi: 0.38,
      ctr: 2.8,
      ipm: 32,
      d1Retention: 38,
      d3Retention: 12,
      d7Retention: 5,
      arpdau: 0.022,
      day1Playtime: 7.5,
    },
  },
  {
    id: 'block-puzzle-legend',
    label: 'Block Puzzle Legend',
    expectedDecision: 'Scale',
    description: '시장성, 리텐션, 수익화가 모두 양호',
    data: {
      gameName: 'Block Puzzle Legend',
      gameGenre: '캐주얼',
      testPeriod: '2026-03-15 ~ 2026-03-29',
      cpi: 0.29,
      ctr: 3.2,
      ipm: 42,
      d1Retention: 42,
      d3Retention: 22,
      d7Retention: 10,
      arpdau: 0.048,
      day1Playtime: 9.2,
    },
  },
  {
    id: 'runner-rush',
    label: 'Runner Rush',
    expectedDecision: 'Kill',
    description: '핵심 KPI 대부분이 위험 구간',
    data: {
      gameName: 'Runner Rush',
      gameGenre: '하이퍼캐주얼',
      testPeriod: '2026-05-01 ~ 2026-05-14',
      cpi: 1.2,
      ctr: 0.9,
      ipm: 8,
      d1Retention: 18,
      d3Retention: 6,
      d7Retention: 2,
      arpdau: 0.008,
      day1Playtime: 3.2,
    },
  },
];
