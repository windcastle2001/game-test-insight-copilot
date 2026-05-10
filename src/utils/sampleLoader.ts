import Papa from 'papaparse';

export interface SamplePreset {
  id: string;
  label: string;
  description: string;
  expectedDecision: 'scale' | 'iterate' | 'kill';
  metricsCsv: string;
  trendsCsv: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'merge-snack-sprint',
    label: '머지 스낵 스프린트',
    description: '하이퍼캐주얼 · 7일 기본 지표 · 동향 300건',
    expectedDecision: 'iterate',
    metricsCsv: '/samples/01_merge_snack_sprint_metrics_7d_basic19.csv',
    trendsCsv: '/samples/01_merge_snack_sprint_trends_300.csv',
  },
  {
    id: 'idle-island-chef',
    label: '아이들 아일랜드 셰프',
    description: '하이브리드 · 14일 + 튜토리얼 · 동향 600건',
    expectedDecision: 'scale',
    metricsCsv: '/samples/02_idle_island_chef_metrics_14d_plus_tutorial.csv',
    trendsCsv: '/samples/02_idle_island_chef_trends_600.csv',
  },
  {
    id: 'runner-factory-rush',
    label: '러너 팩토리 러쉬',
    description: '하이퍼캐주얼 · 14일 전체 옵션 · 동향 350건',
    expectedDecision: 'kill',
    metricsCsv: '/samples/03_runner_factory_rush_metrics_14d_full_optional.csv',
    trendsCsv: '/samples/03_runner_factory_rush_trends_350.csv',
  },
];

async function fetchCsvRows(url: string): Promise<Record<string, string>[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`샘플 CSV 로드 실패: ${url} (HTTP ${response.status})`);
  const text = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (error: unknown) => reject(error),
    });
  });
}

export async function loadSamplePreset(preset: SamplePreset): Promise<{
  metricsRows: Record<string, string>[];
  trendsRows: Record<string, string>[];
}> {
  const [metricsRows, trendsRows] = await Promise.all([
    fetchCsvRows(preset.metricsCsv),
    fetchCsvRows(preset.trendsCsv),
  ]);
  return { metricsRows, trendsRows };
}
