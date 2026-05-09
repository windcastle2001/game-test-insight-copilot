import { useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import type { GameTestData, AnalysisSettings } from '../types/gameTest';
import { sampleGames } from '../data/sampleGames';
import { Upload, ChevronDown, Zap, Download, CheckCircle } from 'lucide-react';
import AnalysisSettingsPanel from './AnalysisSettings';
import { parseRawDataCsv, generateRawDataTemplate, generateKpiTemplate, downloadCsv } from '../utils/rawDataEngine';
import type { RawDataParseResult } from '../types/gameTest';

interface Props {
  data: GameTestData;
  onChange: (data: GameTestData) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  loadingStep: string;
  settings: AnalysisSettings;
  onSettingsChange: (s: AnalysisSettings) => void;
}

type InputMode = 'kpi' | 'raw';

interface FieldDef {
  key: keyof GameTestData;
  label: string;
  korLabel: string;
  unit: string;
  step: number;
  min: number;
  placeholder: string;
}

const adFields: FieldDef[] = [
  { key: 'cpi', label: 'CPI', korLabel: '설치당 비용', unit: '$', step: 0.01, min: 0, placeholder: '0.38' },
  { key: 'ctr', label: 'CTR', korLabel: '클릭률', unit: '%', step: 0.1, min: 0, placeholder: '2.8' },
  { key: 'ipm', label: 'IPM', korLabel: '천회 노출당 설치', unit: '', step: 1, min: 0, placeholder: '32' },
];

const retentionFields: FieldDef[] = [
  { key: 'd1Retention', label: 'D1 Retention', korLabel: 'Day 1 잔존율', unit: '%', step: 0.1, min: 0, placeholder: '38' },
  { key: 'd3Retention', label: 'D3 Retention', korLabel: 'Day 3 잔존율', unit: '%', step: 0.1, min: 0, placeholder: '12' },
  { key: 'd7Retention', label: 'D7 Retention', korLabel: 'Day 7 잔존율', unit: '%', step: 0.1, min: 0, placeholder: '5' },
];

const monetizationFields: FieldDef[] = [
  { key: 'arpdau', label: 'ARPDAU', korLabel: '일 평균 수익', unit: '$', step: 0.001, min: 0, placeholder: '0.022' },
  { key: 'day1Playtime', label: 'Day1 Playtime', korLabel: '첫날 플레이 시간', unit: '분', step: 0.1, min: 0, placeholder: '7.5' },
];

const RAW_COLUMNS = [
  { col: 'impressions',         desc: '광고 노출 횟수',         source: 'AppsFlyer/Adjust' },
  { col: 'clicks',              desc: '광고 클릭 수',            source: 'AppsFlyer/Adjust' },
  { col: 'installs',            desc: '설치 수',                source: 'MMP' },
  { col: 'spend_usd',           desc: '광고비 (달러)',           source: '광고 대시보드' },
  { col: 'dau',                 desc: '일간 활성 유저',          source: 'Firebase/GA' },
  { col: 'new_users',           desc: '신규 유저 수',            source: 'Firebase/GA' },
  { col: 'revenue_usd',         desc: '총 수익',               source: 'AdMob/ironSource+IAP' },
  { col: 'ad_revenue_usd',      desc: '광고 수익',              source: 'AdMob/ironSource' },
  { col: 'iap_revenue_usd',     desc: '인앱결제 수익',           source: '앱스토어/구글플레이' },
  { col: 'avg_session_minutes', desc: '평균 세션 시간(분)',       source: 'Firebase/GA' },
  { col: 'cohort_date',         desc: '코호트 기준일',           source: '분석 기준일' },
  { col: 'd1_active_users',     desc: '설치 다음날 활성 유저',    source: '코호트 분석' },
  { col: 'd3_active_users',     desc: '설치 3일후 활성 유저',    source: '코호트 분석' },
  { col: 'd7_active_users',     desc: '설치 7일후 활성 유저',    source: '코호트 분석' },
];

function FieldGroup({
  title,
  fields,
  data,
  onChange,
}: {
  title: string;
  fields: FieldDef[];
  data: GameTestData;
  onChange: (data: GameTestData) => void;
}) {
  const handleChange = (key: keyof GameTestData, raw: string) => {
    const num = parseFloat(raw);
    onChange({ ...data, [key]: isNaN(num) ? 0 : num });
  };

  return (
    <div
      className="rounded-[14px] p-5 mb-4"
      style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
    >
      <h3 className="text-sm font-bold mb-4" style={{ color: '#000000' }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#444444' }}>
              {f.korLabel}
              <span className="ml-1 font-normal" style={{ color: '#888888' }}>({f.label})</span>
            </label>
            <div className="relative">
              {f.unit && f.unit !== '%' && f.unit !== '분' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#888888' }}>
                  {f.unit}
                </span>
              )}
              <input
                type="number"
                value={data[f.key] as number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(f.key, e.target.value)}
                step={f.step}
                min={f.min}
                placeholder={f.placeholder}
                className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold outline-none transition-all"
                style={{
                  paddingLeft: f.unit === '$' ? '1.75rem' : '0.75rem',
                  paddingRight: f.unit === '%' || f.unit === '분' ? '2.5rem' : '0.75rem',
                  border: '1.5px solid #E0E0E0',
                  color: '#000000',
                  backgroundColor: '#F5F5F5',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FF1FA8'; e.currentTarget.style.backgroundColor = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
              />
              {(f.unit === '%' || f.unit === '분') && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#888888' }}>
                  {f.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiPreviewCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{ backgroundColor: '#FAFAFA', border: '1px solid #E0E0E0' }}
    >
      <p className="text-xs font-semibold mb-1" style={{ color: '#888' }}>{label}</p>
      <p className="text-base font-black" style={{ color: '#000' }}>
        {unit === '$' ? `$${value}` : `${value}${unit}`}
      </p>
    </div>
  );
}

export default function InputPanel({
  data,
  onChange,
  onAnalyze,
  isLoading,
  loadingStep,
  settings,
  onSettingsChange,
}: Props) {
  const kpiFileRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>('kpi');
  const [rawResult, setRawResult] = useState<RawDataParseResult | null>(null);

  const handleSampleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = sampleGames.find((g) => g.id === e.target.value);
    if (selected) onChange(selected.data);
  };

  const handleKpiCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const row = results.data[0] as Record<string, string>;
        if (!row) return;
        onChange({
          gameName: row.game_name ?? 'Custom Game',
          gameGenre: '하이브리드캐주얼',
          testPeriod: new Date().toLocaleDateString('ko-KR'),
          cpi: parseFloat(row.cpi) || 0,
          ctr: parseFloat(row.ctr) || 0,
          ipm: parseFloat(row.ipm) || 0,
          d1Retention: parseFloat(row.d1_retention) || 0,
          d3Retention: parseFloat(row.d3_retention) || 0,
          d7Retention: parseFloat(row.d7_retention) || 0,
          arpdau: parseFloat(row.arpdau) || 0,
          day1Playtime: parseFloat(row.day1_playtime) || 0,
        });
      },
      error: () => { alert('CSV 파싱 오류가 발생했습니다.'); },
    });
    e.target.value = '';
  };

  const handleRawDataUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseRawDataCsv(results.data as Record<string, string>[]);
        setRawResult(parsed);
      },
      error: () => { alert('Raw Data CSV 파싱 오류가 발생했습니다.'); },
    });
    e.target.value = '';
  };

  const applyRawKpis = () => {
    if (!rawResult) return;
    const kpis = rawResult.calculatedKpis;
    onChange({
      ...data,
      cpi: kpis.cpi,
      ctr: kpis.ctr,
      ipm: kpis.ipm,
      d1Retention: kpis.d1Retention,
      d3Retention: kpis.d3Retention,
      d7Retention: kpis.d7Retention,
      arpdau: kpis.arpdau,
      day1Playtime: kpis.day1Playtime,
    });
    setMode('kpi');
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      {/* 섹션 헤더 */}
      <div className="mb-5">
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
          GAME DATA INPUT
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000' }}>
          게임 데이터 입력 <span style={{ color: '#FF1FA8' }}>KPI</span>
        </h2>
      </div>

      {/* 샘플 선택 */}
      <div className="relative mb-5">
        <select
          onChange={handleSampleSelect}
          defaultValue=""
          className="w-full rounded-[100px] px-5 py-3 pr-10 text-sm font-semibold appearance-none outline-none cursor-pointer"
          style={{ border: '1.5px solid #E0E0E0', color: '#444444', backgroundColor: '#ffffff' }}
          aria-label="샘플 게임 선택"
        >
          <option value="" disabled>샘플 게임 선택 (즉시 입력 자동완성)</option>
          {sampleGames.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label} — 예상: {g.expectedDecision} ({g.description})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" size={16} style={{ color: '#888888' }} aria-hidden />
      </div>

      {/* 입력 모드 탭 */}
      <div
        className="flex rounded-[100px] p-1 mb-5"
        style={{ backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0' }}
        role="tablist"
        aria-label="데이터 입력 방식 선택"
      >
        {(['kpi', 'raw'] as InputMode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 text-sm font-bold rounded-[100px] transition-all"
            style={{
              backgroundColor: mode === m ? '#fff' : 'transparent',
              color: mode === m ? '#000' : '#888',
              border: mode === m ? '1px solid #E0E0E0' : 'none',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {m === 'kpi' ? 'KPI 직접 입력' : 'Raw Data 업로드'}
          </button>
        ))}
      </div>

      {/* KPI 직접 입력 모드 */}
      {mode === 'kpi' && (
        <>
          {/* CSV 업로드 + 템플릿 다운로드 */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              onClick={() => kpiFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[100px] text-sm font-semibold transition-all"
              style={{ border: '1.5px solid #E0E0E0', color: '#444', backgroundColor: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF1FA8'; e.currentTarget.style.color = '#FF1FA8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#444'; }}
              aria-label="KPI CSV 업로드"
            >
              <Upload size={14} aria-hidden />
              KPI CSV 업로드
            </button>
            <button
              onClick={() => downloadCsv(generateKpiTemplate(), 'kpi_template.csv')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[100px] text-sm font-semibold transition-all"
              style={{ border: '1.5px solid #E0E0E0', color: '#444', backgroundColor: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B2D8E'; e.currentTarget.style.color = '#5B2D8E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#444'; }}
              aria-label="KPI 템플릿 CSV 다운로드"
            >
              <Download size={14} aria-hidden />
              KPI 템플릿 다운로드
            </button>
            <input ref={kpiFileRef} type="file" accept=".csv" onChange={handleKpiCsvUpload} className="hidden" aria-label="KPI CSV 파일 선택" />
          </div>

          {/* 게임 기본 정보 */}
          <div className="rounded-[14px] p-5 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #E0E0E0' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#000' }}>게임 기본 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#444' }}>게임명</label>
                <input
                  type="text"
                  value={data.gameName}
                  onChange={(e) => onChange({ ...data, gameName: e.target.value })}
                  placeholder="게임 이름 입력"
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold outline-none"
                  style={{ border: '1.5px solid #E0E0E0', color: '#000', backgroundColor: '#F5F5F5' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#FF1FA8'; e.currentTarget.style.backgroundColor = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#444' }}>장르</label>
                <select
                  value={data.gameGenre}
                  onChange={(e) => onChange({ ...data, gameGenre: e.target.value as GameTestData['gameGenre'] })}
                  className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold outline-none"
                  style={{ border: '1.5px solid #E0E0E0', color: '#000', backgroundColor: '#F5F5F5' }}
                  aria-label="게임 장르 선택"
                >
                  <option value="하이퍼캐주얼">하이퍼캐주얼</option>
                  <option value="하이브리드캐주얼">하이브리드캐주얼</option>
                  <option value="캐주얼">캐주얼</option>
                </select>
              </div>
            </div>
          </div>

          <FieldGroup title="광고 성과 지표 (Ad Performance)" fields={adFields} data={data} onChange={onChange} />
          <FieldGroup title="리텐션 지표 (Retention)" fields={retentionFields} data={data} onChange={onChange} />
          <FieldGroup title="수익화 지표 (Monetization)" fields={monetizationFields} data={data} onChange={onChange} />
        </>
      )}

      {/* Raw Data 업로드 모드 */}
      {mode === 'raw' && (
        <div>
          {/* 업로드 / 템플릿 버튼 */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              onClick={() => rawFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[100px] text-sm font-bold transition-all"
              style={{ backgroundColor: '#FF1FA8', color: '#fff' }}
              aria-label="Raw Data CSV 업로드"
            >
              <Upload size={14} aria-hidden />
              Raw Data CSV 업로드
            </button>
            <button
              onClick={() => downloadCsv(generateRawDataTemplate(), 'raw_data_template.csv')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[100px] text-sm font-semibold transition-all"
              style={{ border: '1.5px solid #E0E0E0', color: '#444', backgroundColor: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B2D8E'; e.currentTarget.style.color = '#5B2D8E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#444'; }}
              aria-label="Raw Data 템플릿 CSV 다운로드"
            >
              <Download size={14} aria-hidden />
              Raw Data 템플릿 다운로드
            </button>
            <input ref={rawFileRef} type="file" accept=".csv" onChange={handleRawDataUpload} className="hidden" aria-label="Raw Data CSV 파일 선택" />
          </div>

          {/* 파싱 결과 */}
          {rawResult ? (
            <div className="rounded-[14px] p-5 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #E0E0E0' }}>
              {/* 파싱 성공 배지 */}
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} style={{ color: '#16a34a' }} aria-hidden />
                <span className="text-sm font-bold" style={{ color: '#000' }}>
                  Raw Data 파싱 완료 — {rawResult.rowCount}행, {rawResult.campaigns.length}개 캠페인
                </span>
              </div>
              {rawResult.campaigns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {rawResult.campaigns.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 text-xs font-semibold rounded-full"
                      style={{ backgroundColor: '#F5F5F5', color: '#444' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* 계산된 KPI 미리보기 */}
              <p className="text-xs font-black mb-3" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
                계산된 KPI 미리보기
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <KpiPreviewCard label="CPI" value={rawResult.calculatedKpis.cpi} unit="$" />
                <KpiPreviewCard label="CTR" value={rawResult.calculatedKpis.ctr} unit="%" />
                <KpiPreviewCard label="IPM" value={rawResult.calculatedKpis.ipm} unit="" />
                <KpiPreviewCard label="D1 Retention" value={rawResult.calculatedKpis.d1Retention} unit="%" />
                <KpiPreviewCard label="D3 Retention" value={rawResult.calculatedKpis.d3Retention} unit="%" />
                <KpiPreviewCard label="D7 Retention" value={rawResult.calculatedKpis.d7Retention} unit="%" />
                <KpiPreviewCard label="ARPDAU" value={rawResult.calculatedKpis.arpdau} unit="$" />
                <KpiPreviewCard label="Day1 Playtime" value={rawResult.calculatedKpis.day1Playtime} unit="분" />
              </div>

              <button
                onClick={applyRawKpis}
                className="w-full py-3 text-white text-sm font-bold rounded-[100px] transition-all"
                style={{ backgroundColor: '#5B2D8E' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4a2275'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#5B2D8E'; }}
                aria-label="계산된 KPI로 분석 실행"
              >
                이 KPI로 분석하기 (KPI 입력 탭으로 이동)
              </button>
            </div>
          ) : (
            /* 빈 상태 */
            <div
              className="rounded-[14px] p-8 text-center"
              style={{ backgroundColor: '#FAFAFA', border: '1.5px dashed #E0E0E0' }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: '#444' }}>
                Raw Data CSV를 업로드하면 KPI가 자동 계산됩니다.
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                impressions, clicks, installs, spend_usd, dau, new_users,<br />
                revenue_usd, avg_session_minutes, cohort_date, d1/d3/d7_active_users
              </p>
            </div>
          )}

          {/* 컬럼 설명 테이블 */}
          <div
            className="rounded-[14px] p-4 mb-4 overflow-x-auto"
            style={{ backgroundColor: '#fff', border: '1px solid #E0E0E0' }}
          >
            <p className="text-xs font-black mb-3" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
              Raw Data 컬럼 가이드
            </p>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <th className="text-left py-1.5 pr-3 font-bold" style={{ color: '#000', whiteSpace: 'nowrap' }}>컬럼</th>
                  <th className="text-left py-1.5 pr-3 font-bold" style={{ color: '#000' }}>설명</th>
                  <th className="text-left py-1.5 font-bold" style={{ color: '#000', whiteSpace: 'nowrap' }}>출처</th>
                </tr>
              </thead>
              <tbody>
                {RAW_COLUMNS.map((col) => (
                  <tr key={col.col} style={{ borderBottom: '1px solid #F5F5F5' }}>
                    <td className="py-1.5 pr-3 font-mono" style={{ color: '#5B2D8E', whiteSpace: 'nowrap' }}>{col.col}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#444' }}>{col.desc}</td>
                    <td className="py-1.5" style={{ color: '#888', whiteSpace: 'nowrap' }}>{col.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 분석 기준 설정 */}
      <AnalysisSettingsPanel settings={settings} onChange={onSettingsChange} />

      {/* CTA 버튼 */}
      <button
        onClick={onAnalyze}
        disabled={isLoading}
        className="w-full py-4 text-white text-base font-black transition-all mt-2 flex items-center justify-center gap-2"
        style={{
          backgroundColor: isLoading ? '#cc1a86' : '#FF1FA8',
          borderRadius: '100px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          letterSpacing: '-0.3px',
        }}
        aria-label="AI 인사이트 생성"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
            {loadingStep}
          </>
        ) : (
          <>
            <Zap size={18} aria-hidden />
            AI 인사이트 생성
          </>
        )}
      </button>
    </section>
  );
}
