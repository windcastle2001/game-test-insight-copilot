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
    description: '마케팅 지표 양호, 리텐션 약함',
    data: {
      gameName: 'Idle Dungeon Tycoon',
      gameGenre: '하이브리드캐주얼',
      testPeriod: '2024-04-01 ~ 2024-04-14',
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
    description: '전반적으로 우수한 성과',
    data: {
      gameName: 'Block Puzzle Legend',
      gameGenre: '캐주얼',
      testPeriod: '2024-03-15 ~ 2024-03-29',
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
    description: '대부분의 지표가 Risk 수준',
    data: {
      gameName: 'Runner Rush',
      gameGenre: '하이퍼캐주얼',
      testPeriod: '2024-05-01 ~ 2024-05-14',
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
