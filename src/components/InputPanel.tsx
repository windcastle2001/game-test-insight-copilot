import { useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Download, Upload, Zap } from 'lucide-react';
import type { AnalysisSettings, GameTestData, RawDataParseResult } from '../types/gameTest';
import { sampleGames } from '../data/sampleGames';
import { downloadCsv, generateKpiTemplate, generateRawDataTemplate, parseRawDataCsv } from '../utils/rawDataEngine';
import AnalysisSettingsPanel from './AnalysisSettings';

interface Props {
  data: GameTestData;
  onChange: (data: GameTestData) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  loadingStep: string;
  settings: AnalysisSettings;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

const fields: Array<{ key: keyof GameTestData; label: string; unit: string; step: number }> = [
  { key: 'cpi', label: 'CPI', unit: '$', step: 0.01 },
  { key: 'ctr', label: 'CTR', unit: '%', step: 0.1 },
  { key: 'ipm', label: 'IPM', unit: '', step: 1 },
  { key: 'd1Retention', label: 'D1 잔존율', unit: '%', step: 0.1 },
  { key: 'd3Retention', label: 'D3 잔존율', unit: '%', step: 0.1 },
  { key: 'd7Retention', label: 'D7 잔존율', unit: '%', step: 0.1 },
  { key: 'arpdau', label: 'ARPDAU', unit: '$', step: 0.001 },
  { key: 'day1Playtime', label: '첫날 플레이', unit: '분', step: 0.1 },
];

const kpiColumns = ['game_name', 'cpi', 'ctr', 'ipm', 'd1_retention', 'd3_retention', 'd7_retention', 'arpdau', 'day1_playtime'];

function normalizeRow(row: Record<string, string>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? '']));
}

export default function InputPanel({ data, onChange, onAnalyze, isLoading, loadingStep, settings, onSettingsChange }: Props) {
  const kpiFileRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'kpi' | 'raw'>('kpi');
  const [rawResult, setRawResult] = useState<RawDataParseResult | null>(null);
  const [kpiWarnings, setKpiWarnings] = useState<string[]>([]);

  const setNumber = (key: keyof GameTestData, value: string) => onChange({ ...data, [key]: Number.parseFloat(value) || 0 });

  const uploadKpi = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        const row = normalizeRow((rows[0] as Record<string, string>) ?? {});
        const warnings: string[] = [];
        kpiColumns.forEach((column) => {
          if (!(column in row)) warnings.push(`필수 컬럼 누락: ${column}`);
        });
        kpiColumns.filter((column) => column !== 'game_name').forEach((column) => {
          if (row[column] !== undefined && row[column] !== '' && !Number.isFinite(Number(row[column]))) warnings.push(`${column} 숫자 파싱 실패: ${row[column]}`);
        });
        setKpiWarnings(warnings);
        onChange({
          ...data,
          gameName: row.game_name || data.gameName,
          cpi: Number(row.cpi) || 0,
          ctr: Number(row.ctr) || 0,
          ipm: Number(row.ipm) || 0,
          d1Retention: Number(row.d1_retention) || 0,
          d3Retention: Number(row.d3_retention) || 0,
          d7Retention: Number(row.d7_retention) || 0,
          arpdau: Number(row.arpdau) || 0,
          day1Playtime: Number(row.day1_playtime) || 0,
        });
      },
    });
    event.target.value = '';
  };

  const uploadRaw = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => setRawResult(parseRawDataCsv(rows as Record<string, string>[])),
    });
    event.target.value = '';
  };

  const applyRaw = () => {
    if (!rawResult) return;
    onChange({ ...data, ...rawResult.calculatedKpis });
    setMode('kpi');
  };

  return (
    <section className="page-shell input-section">
      <div className="section-heading">
        <p className="section-eyebrow">게임 데이터 입력</p>
        <h2>KPI를 넣고 의사결정 결과를 확인하세요</h2>
      </div>

      <div className="control-row">
        <select className="select-input" defaultValue="" onChange={(event) => {
          const sample = sampleGames.find((item) => item.id === event.target.value);
          if (sample) onChange(sample.data);
        }}>
          <option value="" disabled>샘플 게임 선택</option>
          {sampleGames.map((sample) => <option key={sample.id} value={sample.id}>{sample.label} - 예상 {sample.expectedDecision}</option>)}
        </select>
        <AnalysisSettingsPanel settings={settings} onChange={onSettingsChange} />
      </div>

      <div className="segmented">
        <button className={mode === 'kpi' ? 'active' : ''} onClick={() => setMode('kpi')} type="button">KPI 직접 입력</button>
        <button className={mode === 'raw' ? 'active' : ''} onClick={() => setMode('raw')} type="button">Raw Data 업로드</button>
      </div>

      {mode === 'kpi' ? (
        <>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={() => kpiFileRef.current?.click()}><Upload size={15} /> KPI CSV 업로드</button>
            <button className="outline-button" type="button" onClick={() => downloadCsv(generateKpiTemplate(), 'kpi_template.csv')}><Download size={15} /> 빈 KPI 양식 다운로드</button>
            <input ref={kpiFileRef} type="file" accept=".csv" onChange={uploadKpi} hidden />
          </div>
          {kpiWarnings.length > 0 && <div className="warning-box">{kpiWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}

          <div className="form-card">
            <label>게임명<input value={data.gameName} onChange={(event) => onChange({ ...data, gameName: event.target.value })} /></label>
            <label>장르<select value={data.gameGenre} onChange={(event) => onChange({ ...data, gameGenre: event.target.value as GameTestData['gameGenre'] })}>
              <option>하이퍼캐주얼</option>
              <option>하이브리드캐주얼</option>
              <option>캐주얼</option>
            </select></label>
          </div>

          <div className="kpi-grid">
            {fields.map((field) => (
              <label className="metric-input" key={field.key}>
                <span>{field.label}</span>
                <div>
                  {field.unit === '$' && <em>$</em>}
                  <input type="number" value={data[field.key] as number} step={field.step} onChange={(event) => setNumber(field.key, event.target.value)} />
                  {field.unit && field.unit !== '$' && <em>{field.unit}</em>}
                </div>
              </label>
            ))}
          </div>
        </>
      ) : (
        <div className="raw-card">
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => rawFileRef.current?.click()}><Upload size={15} /> Raw Data CSV 업로드</button>
            <button className="outline-button" type="button" onClick={() => downloadCsv(generateRawDataTemplate(), 'raw_data_template.csv')}><Download size={15} /> 빈 Raw Data 양식 다운로드</button>
            <input ref={rawFileRef} type="file" accept=".csv" onChange={uploadRaw} hidden />
          </div>
          {rawResult ? (
            <div className="raw-preview">
              <strong>{rawResult.rowCount}개 행, {rawResult.campaigns.length}개 캠페인 파싱 완료</strong>
              {rawResult.warnings.length > 0 && <div className="warning-box">{rawResult.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
              <button className="primary-button" type="button" onClick={applyRaw}>계산된 KPI 적용</button>
            </div>
          ) : (
            <p>광고 노출, 클릭, 설치, 비용, DAU, 매출, 코호트 잔존 데이터를 업로드하면 KPI를 자동 계산합니다.</p>
          )}
        </div>
      )}

      <button className="analyze-button" type="button" disabled={isLoading} onClick={onAnalyze}>
        <Zap size={18} />
        {isLoading ? loadingStep : 'AI 인사이트 생성'}
      </button>
    </section>
  );
}
