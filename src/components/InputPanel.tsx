import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import Papa from 'papaparse';
import type { GameTestData } from '../types/gameTest';
import { sampleGames } from '../data/sampleGames';
import { Upload, ChevronDown, Zap } from 'lucide-react';

interface Props {
  data: GameTestData;
  onChange: (data: GameTestData) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  loadingStep: string;
}

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
      <h3 className="text-sm font-bold mb-4" style={{ color: '#000000' }}>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#444444' }}>
              {f.korLabel}
              <span className="ml-1 font-normal" style={{ color: '#888888' }}>
                ({f.label})
              </span>
            </label>
            <div className="relative">
              {f.unit && f.unit !== '%' && f.unit !== '분' && (
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: '#888888' }}
                >
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
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF1FA8';
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                }}
              />
              {(f.unit === '%' || f.unit === '분') && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: '#888888' }}
                >
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

export default function InputPanel({ data, onChange, onAnalyze, isLoading, loadingStep }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSampleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = sampleGames.find((g) => g.id === e.target.value);
    if (selected) onChange(selected.data);
  };

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const row = results.data[0] as Record<string, string>;
        if (!row) return;

        const parsed: GameTestData = {
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
        };
        onChange(parsed);
      },
      error: () => {
        alert('CSV 파싱 오류가 발생했습니다. 파일 형식을 확인해주세요.');
      },
    });
    // 같은 파일 재업로드 허용
    e.target.value = '';
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-8">
      {/* 상단 컨트롤: 샘플 선택 + CSV 업로드 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <select
            onChange={handleSampleSelect}
            defaultValue=""
            className="w-full rounded-[100px] px-5 py-3 pr-10 text-sm font-semibold appearance-none outline-none cursor-pointer"
            style={{
              border: '1.5px solid #E0E0E0',
              color: '#444444',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="" disabled>
              샘플 게임 선택 (즉시 입력 자동완성)
            </option>
            {sampleGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} — 예상: {g.expectedDecision} ({g.description})
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            size={16}
            style={{ color: '#888888' }}
          />
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-5 py-3 rounded-[100px] text-sm font-semibold transition-all"
          style={{
            border: '1.5px solid #E0E0E0',
            color: '#444444',
            backgroundColor: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF1FA8';
            e.currentTarget.style.color = '#FF1FA8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.color = '#444444';
          }}
        >
          <Upload size={15} />
          CSV 업로드
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="hidden"
          aria-label="CSV 파일 업로드"
        />
      </div>

      {/* 게임 기본 정보 */}
      <div
        className="rounded-[14px] p-5 mb-4"
        style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: '#000000' }}>
          게임 기본 정보
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#444444' }}>
              게임명
            </label>
            <input
              type="text"
              value={data.gameName}
              onChange={(e) => onChange({ ...data, gameName: e.target.value })}
              placeholder="게임 이름 입력"
              className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold outline-none"
              style={{ border: '1.5px solid #E0E0E0', color: '#000000', backgroundColor: '#F5F5F5' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#FF1FA8'; e.currentTarget.style.backgroundColor = '#fff'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#444444' }}>
              장르
            </label>
            <select
              value={data.gameGenre}
              onChange={(e) => onChange({ ...data, gameGenre: e.target.value as GameTestData['gameGenre'] })}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold outline-none"
              style={{ border: '1.5px solid #E0E0E0', color: '#000000', backgroundColor: '#F5F5F5' }}
            >
              <option value="하이퍼캐주얼">하이퍼캐주얼</option>
              <option value="하이브리드캐주얼">하이브리드캐주얼</option>
              <option value="캐주얼">캐주얼</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI 입력 그룹 */}
      <FieldGroup title="광고 성과 지표 (Ad Performance)" fields={adFields} data={data} onChange={onChange} />
      <FieldGroup title="리텐션 지표 (Retention)" fields={retentionFields} data={data} onChange={onChange} />
      <FieldGroup title="수익화 지표 (Monetization)" fields={monetizationFields} data={data} onChange={onChange} />

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
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {loadingStep}
          </>
        ) : (
          <>
            <Zap size={18} />
            AI 인사이트 생성
          </>
        )}
      </button>

      {/* CSV 포맷 안내 */}
      <p className="text-center mt-3 text-xs" style={{ color: '#888888' }}>
        CSV 형식:{' '}
        <code className="font-mono" style={{ color: '#5B2D8E' }}>
          game_name, cpi, ctr, ipm, d1_retention, d3_retention, d7_retention, arpdau, day1_playtime
        </code>
      </p>
    </section>
  );
}
