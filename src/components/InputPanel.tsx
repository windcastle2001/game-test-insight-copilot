import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Download, Plus, Settings, Trash2, Upload, X, Zap } from 'lucide-react';
import type { GameTestData, RawDataParseResult, TrendAnalysisResult } from '../types/gameTest';
import { DEFAULT_RAW_COLUMNS, downloadCsv, generateRawDataTemplate, parseRawDataCsv, type RawMetricColumn } from '../utils/rawDataEngine';
import { analyzeTrendData, generateTrendCsvTemplate, parseTrendCsvRows } from '../utils/trendEngine';

interface Props {
  data: GameTestData | null;
  trendData: TrendAnalysisResult | null;
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
    rawMetricSummary: rawResult.extraMetricSummary,
  };
}

function buildTrendData(rows: Record<string, string>[]): TrendAnalysisResult | null {
  const trendRows = rows
    .map((raw) => Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? ''])))
    .map((row) => ({
      date: row.date ?? '',
      source: row.source ?? '',
      title: row.title ?? '',
      content: row.content ?? row.review_content ?? '',
      category: row.category ?? '',
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

export default function InputPanel({ data, trendData, onChange, onTrendDataChange, onAnalyze, isLoading, loadingStep }: Props) {
  const rawFileRef = useRef<HTMLInputElement>(null);
  const trendFileRef = useRef<HTMLInputElement>(null);
  const [rawResult, setRawResult] = useState<RawDataParseResult | null>(null);
  const [trendResult, setTrendResult] = useState<TrendAnalysisResult | null>(null);
  const [columns, setColumns] = useState<RawMetricColumn[]>(DEFAULT_RAW_COLUMNS);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    setTrendResult(trendData);
  }, [trendData]);

  const uploadRaw = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        const sourceRows = rows as Record<string, string>[];
        const nextRaw = parseRawDataCsv(sourceRows, columns);
        const nextGame = buildGameData(nextRaw);
        setRawResult(nextRaw);
        onChange(nextGame);
      },
    });
    event.target.value = '';
  };

  const uploadTrend = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        const nextTrend = buildTrendData(rows as Record<string, string>[]);
        setTrendResult(nextTrend);
        onTrendDataChange(nextTrend);
      },
    });
    event.target.value = '';
  };

  const toggleColumn = (key: string) => {
    setColumns((current) => current.map((column) => column.key === key && !column.required ? { ...column, selected: !column.selected } : column));
  };

  const removeCustomColumn = (key: string) => {
    setColumns((current) => current.filter((column) => column.key !== key || !column.custom));
  };

  const addCustomColumn = () => {
    const normalizedKey = customKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!normalizedKey || columns.some((column) => column.key === normalizedKey)) return;
    setColumns((current) => [...current, { key: normalizedKey, label: customLabel.trim() || normalizedKey, selected: true, custom: true }]);
    setCustomKey('');
    setCustomLabel('');
  };

  const ready = Boolean(data && rawResult);
  const selectedColumnCount = columns.filter((column) => column.required || column.selected).length;

  return (
    <section className="page-shell input-section">
      <div className="section-heading">
        <p className="section-eyebrow">Data Upload</p>
        <h2>라이브 지표와 동향 데이터를 분리해서 업로드합니다</h2>
        <p>먼저 raw 지표 CSV로 KPI를 계산하고, 별도 동향 CSV로 리뷰/커뮤니티 반응을 묶은 뒤 Gemini 분석을 생성합니다.</p>
      </div>

      <div className="raw-card raw-only-card">
        <div className="raw-upload-main">
          <div>
            <strong>원본 라이브 지표 CSV</strong>
            <p>선택된 {selectedColumnCount}개 컬럼 기준으로 빈 CSV를 만들고, 업로드 시 KPI를 자동 계산합니다.</p>
          </div>
          <div className="button-row">
            <button className="settings-cta compact-cta" type="button" onClick={() => setIsMetricModalOpen(true)}><Settings size={15} /> raw 지표 선택</button>
            <button className="primary-button" type="button" onClick={() => rawFileRef.current?.click()}><Upload size={15} /> CSV 업로드</button>
            <button className="outline-button" type="button" onClick={() => downloadCsv(generateRawDataTemplate(columns), 'raw_metrics_template.csv')}><Download size={15} /> 지표 빈 양식</button>
            <input ref={rawFileRef} type="file" accept=".csv" onChange={uploadRaw} hidden />
          </div>
        </div>

        {rawResult && data ? (
          <div className="raw-preview">
            <div className="raw-summary-grid">
              <span><b>{data.gameName}</b> {data.gameGenre}</span>
              <span>{rawResult.rowCount}개 행</span>
              <span>{rawResult.campaigns.length}개 캠페인</span>
              <span>커스텀 지표 {rawResult.extraMetricSummary.length}개</span>
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
          </div>
        ) : (
          <div className="empty-panel">아직 업로드된 지표 CSV가 없습니다. 빈 양식을 받은 뒤 데이터를 채워 올려주세요.</div>
        )}
      </div>

      <div className="raw-card raw-only-card">
        <div className="raw-upload-main">
          <div>
            <strong>동향 CSV</strong>
            <p>필수 컬럼: date, source, title, content, category</p>
          </div>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => trendFileRef.current?.click()}><Upload size={15} /> 동향 CSV 업로드</button>
            <button className="outline-button" type="button" onClick={() => downloadCsv(generateTrendCsvTemplate(), 'trend_template.csv')}><Download size={15} /> 동향 빈 양식</button>
            <input ref={trendFileRef} type="file" accept=".csv" onChange={uploadTrend} hidden />
          </div>
        </div>
        {trendResult ? (
          <div className="trend-inline">
            <div className="raw-summary-grid">
              <span><b>{trendResult.totalCount}건</b> 동향 데이터</span>
              <span>{trendResult.dateRange.from || '-'} ~ {trendResult.dateRange.to || '-'}</span>
              <span>클러스터 {trendResult.clusters.length}개</span>
              <span>감성 {trendResult.overallSentiment}</span>
            </div>
            {trendResult.warnings.length > 0 && <div className="warning-box">{trendResult.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
            <div className="tag-cloud">
              {trendResult.tagSummary.slice(0, 8).map((item) => <span key={item.tag}>{item.tag} {item.count}</span>)}
            </div>
            <p className="method-note">{trendResult.methodDescription}</p>
            <div className="trend-theme-list">
              {trendResult.themes.slice(0, 5).map((theme) => (
                <article className="trend-theme-card" key={theme.tag}>
                  <div>
                    <strong>{theme.tag}</strong>
                    <span>{theme.count}건 · 부정 {theme.negativeRatio}% · {theme.sources.join(', ')}</span>
                  </div>
                  <p>{theme.decisionImplication}</p>
                  <ul className="trend-examples">
                    {theme.representativeTexts.slice(0, 2).map((text) => <li key={text}>{text}</li>)}
                  </ul>
                  <small>{theme.userRequests.join(' ')}</small>
                </article>
              ))}
            </div>
            {trendResult.chunkSummaries.length > 1 && (
              <div className="chunk-summary-list">
                {trendResult.chunkSummaries.slice(0, 6).map((chunk) => (
                  <span key={chunk.range}>{chunk.range}: {chunk.topTags.join(', ')}</span>
                ))}
              </div>
            )}
            {trendResult.topInsights.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
          </div>
        ) : (
          <div className="empty-panel">동향 CSV를 올리면 리뷰/커뮤니티 반응 클러스터가 이곳에 표시됩니다.</div>
        )}
      </div>

      {isMetricModalOpen && (
        <div className="modal-backdrop">
          <div className="settings-modal metric-modal">
            <div className="modal-head">
              <div>
                <p className="section-eyebrow">Raw Metric Settings</p>
                <h2>CSV에 넣을 raw 지표 선택</h2>
                <p>필수 컬럼은 고정되고, 선택한 후보와 커스텀 지표만 빈 CSV에 포함됩니다.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsMetricModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="metric-column-grid">
              {columns.map((column) => (
                <label className={`metric-column ${column.required ? 'locked' : ''}`} key={column.key}>
                  <input type="checkbox" checked={column.required || column.selected} disabled={column.required} onChange={() => toggleColumn(column.key)} />
                  <span><b>{column.label}</b><small>{column.key}{column.required ? ' · 필수' : column.custom ? ' · 커스텀' : ''}</small></span>
                  {column.custom && <button type="button" onClick={(event) => { event.preventDefault(); removeCustomColumn(column.key); }}><Trash2 size={14} /></button>}
                </label>
              ))}
            </div>
            <div className="custom-metric-row">
              <input placeholder="컬럼명 예: level_fail_count" value={customKey} onChange={(event) => setCustomKey(event.target.value)} />
              <input placeholder="표시명 예: 레벨 실패 횟수" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} />
              <button className="primary-button" type="button" onClick={addCustomColumn}><Plus size={15} /> 추가</button>
            </div>
            <div className="modal-actions">
              <button className="outline-button" type="button" onClick={() => setColumns(DEFAULT_RAW_COLUMNS)}>기본값 복원</button>
              <button className="primary-button" type="button" onClick={() => setIsMetricModalOpen(false)}>적용</button>
            </div>
          </div>
        </div>
      )}

      <button className="analyze-button" type="button" disabled={isLoading || !ready} onClick={onAnalyze}>
        <Zap size={18} />
        {isLoading ? loadingStep : 'Gemini로 분석 생성'}
      </button>
    </section>
  );
}
