import { useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Download, Upload, Zap } from 'lucide-react';
import type { GameTestData, RawDataParseResult, TrendAnalysisResult } from '../types/gameTest';
import { downloadCsv, generateRawDataTemplate, parseRawDataCsv } from '../utils/rawDataEngine';
import { analyzeTrendData, parseTrendCsvRows } from '../utils/trendEngine';

interface Props {
  data: GameTestData | null;
  onChange: (data: GameTestData) => void;
  onTrendDataChange: (data: TrendAnalysisResult | null) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  loadingStep: string;
}

function buildGameData(rawResult: RawDataParseResult): GameTestData {
  const firstDate = rawResult.rows.map((row) => row.date).filter(Boolean).sort()[0] ?? '';
  const lastDate = rawResult.rows.map((row) => row.date).filter(Boolean).sort().at(-1) ?? '';
  return {
    gameName: rawResult.gameName || '업로드 게임',
    gameGenre: rawResult.gameGenre ?? '하이퍼캐주얼',
    testPeriod: rawResult.testPeriod || (firstDate && lastDate ? `${firstDate} ~ ${lastDate}` : 'Raw data upload'),
    cpi: rawResult.calculatedKpis.cpi ?? 0,
    ctr: rawResult.calculatedKpis.ctr ?? 0,
    ipm: rawResult.calculatedKpis.ipm ?? 0,
    d1Retention: rawResult.calculatedKpis.d1Retention ?? 0,
    d3Retention: rawResult.calculatedKpis.d3Retention ?? 0,
    d7Retention: rawResult.calculatedKpis.d7Retention ?? 0,
    arpdau: rawResult.calculatedKpis.arpdau ?? 0,
    day1Playtime: rawResult.calculatedKpis.day1Playtime ?? 0,
    d0TutorialCompletion: rawResult.calculatedKpis.d0TutorialCompletion,
    firstSessionDropoff: rawResult.calculatedKpis.firstSessionDropoff,
    adWatchCompletion: rawResult.calculatedKpis.adWatchCompletion,
    storeConversion: rawResult.calculatedKpis.storeConversion,
    d14Retention: rawResult.calculatedKpis.d14Retention,
    d30Retention: rawResult.calculatedKpis.d30Retention,
    roas: rawResult.calculatedKpis.roas,
    ltv: rawResult.calculatedKpis.ltv,
  };
}

function buildTrendData(rows: Record<string, string>[]): TrendAnalysisResult | null {
  const trendRows = rows
    .map((raw) => Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? ''])))
    .map((row) => ({
      date: row.date ?? '',
      source: row.trend_source ?? row.source ?? '',
      title: row.trend_title ?? row.title ?? '',
      content: row.trend_content ?? row.content ?? row.review_content ?? '',
      category: row.trend_category ?? row.category ?? '',
    }))
    .filter((row) => row.title.trim() || row.content.trim());

  if (trendRows.length === 0) return null;
  const parsed = parseTrendCsvRows(trendRows);
  return analyzeTrendData(parsed.rows, 15, true, parsed.warnings);
}

const previewMetrics: Array<{ key: keyof GameTestData; label: string; suffix: string; prefix?: string }> = [
  { key: 'cpi', label: 'CPI', prefix: '$', suffix: '' },
  { key: 'ctr', label: 'CTR', suffix: '%' },
  { key: 'ipm', label: 'IPM', suffix: '' },
  { key: 'd1Retention', label: 'D1', suffix: '%' },
  { key: 'd3Retention', label: 'D3', suffix: '%' },
  { key: 'd7Retention', label: 'D7', suffix: '%' },
  { key: 'arpdau', label: 'ARPDAU', prefix: '$', suffix: '' },
  { key: 'day1Playtime', label: '첫날 플레이', suffix: '분' },
];

export default function InputPanel({ data, onChange, onTrendDataChange, onAnalyze, isLoading, loadingStep }: Props) {
  const rawFileRef = useRef<HTMLInputElement>(null);
  const [rawResult, setRawResult] = useState<RawDataParseResult | null>(null);
  const [trendResult, setTrendResult] = useState<TrendAnalysisResult | null>(null);

  const uploadRaw = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        const sourceRows = rows as Record<string, string>[];
        const nextRaw = parseRawDataCsv(sourceRows);
        const nextGame = buildGameData(nextRaw);
        const nextTrend = buildTrendData(sourceRows);
        setRawResult(nextRaw);
        setTrendResult(nextTrend);
        onChange(nextGame);
        onTrendDataChange(nextTrend);
      },
    });
    event.target.value = '';
  };

  const ready = Boolean(data && rawResult);

  return (
    <section className="page-shell input-section">
      <div className="section-heading">
        <p className="section-eyebrow">Raw Data Upload</p>
        <h2>CSV 하나로 KPI와 유저 동향을 자동 분석합니다</h2>
        <p>광고, 코호트, 매출, 플레이, 리뷰/커뮤니티 텍스트를 한 파일로 올리면 KPI를 계산하고 Gemini가 판단과 액션을 생성합니다.</p>
      </div>

      <div className="raw-card raw-only-card">
        <div className="raw-upload-main">
          <div>
            <strong>Raw Data CSV</strong>
            <p>필수: date, campaign_name, impressions, clicks, installs, spend_usd, dau, new_users, revenue_usd, cohort_date, d1_active_users, d3_active_users, d7_active_users</p>
            <p>선택: game_name, game_genre, test_period, d14/d30, tutorial, ad, store, trend_source, trend_title, trend_content, trend_category</p>
          </div>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => rawFileRef.current?.click()}><Upload size={15} /> CSV 업로드</button>
            <button className="outline-button" type="button" onClick={() => downloadCsv(generateRawDataTemplate(), 'raw_data_blank_template.csv')}><Download size={15} /> 빈 양식</button>
            <input ref={rawFileRef} type="file" accept=".csv" onChange={uploadRaw} hidden />
          </div>
        </div>

        {rawResult && data ? (
          <div className="raw-preview">
            <div className="raw-summary-grid">
              <span><b>{data.gameName}</b> {data.gameGenre}</span>
              <span>{rawResult.rowCount}개 행</span>
              <span>{rawResult.campaigns.length}개 캠페인</span>
              <span>동향 {trendResult?.totalCount ?? 0}건</span>
            </div>
            {rawResult.warnings.length > 0 && <div className="warning-box">{rawResult.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
            <div className="kpi-preview-grid">
              {previewMetrics.map((metric) => (
                <div className="kpi-preview" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{metric.prefix}{data[metric.key] as number}{metric.suffix}</strong>
                </div>
              ))}
            </div>
            {trendResult && (
              <div className="trend-inline">
                <strong>동향 클러스터</strong>
                <div className="tag-cloud">
                  {trendResult.tagSummary.slice(0, 6).map((item) => <span key={item.tag}>{item.tag} {item.count}</span>)}
                </div>
                {trendResult.topInsights.slice(0, 2).map((item) => <p key={item}>{item}</p>)}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-panel">아직 업로드된 Raw Data가 없습니다. CSV를 올리면 계산된 KPI와 동향 요약이 이곳에 표시됩니다.</div>
        )}
      </div>

      <button className="analyze-button" type="button" disabled={isLoading || !ready} onClick={onAnalyze}>
        <Zap size={18} />
        {isLoading ? loadingStep : 'Gemini로 분석 생성'}
      </button>
    </section>
  );
}
