'use client';
import { useState, type ChangeEvent } from 'react';
import { Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { AnalysisSettings } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';

interface Props {
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
}

const THRESHOLD_META: {
  key: keyof AnalysisSettings['thresholds'];
  label: string;
  unit: string;
  step: number;
  reversed: boolean;
  goodHint: string;
}[] = [
  { key: 'cpi',          label: 'CPI (설치당 비용)',       unit: '$',   step: 0.01,  reversed: true,  goodHint: '낮을수록 좋음' },
  { key: 'ctr',          label: 'CTR (클릭률)',             unit: '%',   step: 0.1,   reversed: false, goodHint: '높을수록 좋음' },
  { key: 'ipm',          label: 'IPM (천회 노출당 설치)',   unit: '',    step: 1,     reversed: false, goodHint: '높을수록 좋음' },
  { key: 'd1Retention',  label: 'D1 잔존율',               unit: '%',   step: 0.5,   reversed: false, goodHint: '높을수록 좋음' },
  { key: 'd3Retention',  label: 'D3 잔존율',               unit: '%',   step: 0.5,   reversed: false, goodHint: '높을수록 좋음' },
  { key: 'd7Retention',  label: 'D7 잔존율',               unit: '%',   step: 0.5,   reversed: false, goodHint: '높을수록 좋음' },
  { key: 'arpdau',       label: 'ARPDAU (일 평균 수익)',   unit: '$',   step: 0.001, reversed: false, goodHint: '높을수록 좋음' },
  { key: 'day1Playtime', label: 'Day1 플레이 시간',         unit: '분',  step: 0.5,   reversed: false, goodHint: '높을수록 좋음' },
];

function NumInput({
  value,
  onChange,
  step,
  min,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  unit: string;
}) {
  return (
    <div className="relative">
      {unit === '$' && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: '#888' }}>$</span>
      )}
      <input
        type="number"
        value={value}
        step={step}
        min={min ?? 0}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        className="w-full rounded-[8px] text-sm font-semibold outline-none"
        style={{
          border: '1.5px solid #E0E0E0',
          backgroundColor: '#F5F5F5',
          color: '#000',
          padding: '6px 8px',
          paddingLeft: unit === '$' ? '1.5rem' : '8px',
          paddingRight: unit !== '' && unit !== '$' ? '1.75rem' : '8px',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#FF1FA8'; e.currentTarget.style.backgroundColor = '#fff'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
      />
      {unit !== '' && unit !== '$' && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#888' }}>{unit}</span>
      )}
    </div>
  );
}

export default function AnalysisSettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const updateThreshold = (
    key: keyof AnalysisSettings['thresholds'],
    field: 'good' | 'watch',
    value: number
  ) => {
    onChange({
      ...settings,
      thresholds: {
        ...settings.thresholds,
        [key]: { ...settings.thresholds[key], [field]: value },
      },
    });
  };

  const updateWeight = (key: keyof AnalysisSettings['weights'], value: number) => {
    onChange({ ...settings, weights: { ...settings.weights, [key]: value } });
  };

  const totalWeight =
    settings.weights.marketability + settings.weights.retention + settings.weights.monetization;
  const weightOk = totalWeight === 100;

  const handleReset = () => onChange(DEFAULT_SETTINGS);

  return (
    <div
      className="rounded-[14px] mb-4 overflow-hidden"
      style={{ border: '1px solid #E0E0E0', backgroundColor: '#fff' }}
    >
      {/* 토글 헤더 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        style={{ background: 'none', cursor: 'pointer' }}
        aria-label="분석 기준 설정 열기/닫기"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Settings size={16} style={{ color: '#5B2D8E' }} aria-hidden />
          <span className="text-sm font-bold" style={{ color: '#000' }}>분석 기준 설정</span>
          <span className="text-xs font-medium" style={{ color: '#888' }}>Analysis Settings</span>
        </div>
        {open ? (
          <ChevronUp size={16} style={{ color: '#888' }} aria-hidden />
        ) : (
          <ChevronDown size={16} style={{ color: '#888' }} aria-hidden />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* 구분선 */}
          <div style={{ height: 1, backgroundColor: '#E0E0E0', marginBottom: 20 }} />

          {/* KPI 임계값 */}
          <div className="mb-6">
            <p className="text-xs font-black mb-3" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
              KPI 임계값 <span style={{ color: '#888', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Thresholds</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THRESHOLD_META.map((meta) => (
                <div
                  key={meta.key}
                  className="rounded-[10px] p-3"
                  style={{ backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#444' }}>{meta.label}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#F5F5F5', color: '#888', fontSize: 10 }}
                    >
                      {meta.goodHint}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#16a34a', fontWeight: 700 }}>양호 기준</p>
                      <NumInput
                        value={settings.thresholds[meta.key].good}
                        onChange={(v) => updateThreshold(meta.key, 'good', v)}
                        step={meta.step}
                        unit={meta.unit}
                      />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#d97706', fontWeight: 700 }}>주의 기준</p>
                      <NumInput
                        value={settings.thresholds[meta.key].watch}
                        onChange={(v) => updateThreshold(meta.key, 'watch', v)}
                        step={meta.step}
                        unit={meta.unit}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 스코어 가중치 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-black" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
                스코어 가중치 <span style={{ color: '#888', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Score Weights</span>
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: weightOk ? '#dcfce7' : '#fee2e2',
                  color: weightOk ? '#16a34a' : '#dc2626',
                }}
              >
                합계 {totalWeight}% {weightOk ? '(OK)' : '(100% 맞춰주세요)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'marketability' as const, label: '시장성', color: '#FF1FA8' },
                { key: 'retention' as const, label: '리텐션', color: '#5B2D8E' },
                { key: 'monetization' as const, label: '수익화', color: '#F5C300' },
              ]).map((w) => (
                <div key={w.key}>
                  <p className="text-xs font-semibold mb-1" style={{ color: w.color }}>{w.label}</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.weights[w.key]}
                      min={0}
                      max={100}
                      step={5}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n >= 0 && n <= 100) updateWeight(w.key, n);
                      }}
                      className="w-full rounded-[8px] text-sm font-bold outline-none text-center"
                      style={{
                        border: `1.5px solid ${w.color}40`,
                        backgroundColor: '#FAFAFA',
                        color: w.color,
                        padding: '6px 24px 6px 8px',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = w.color; e.currentTarget.style.backgroundColor = '#fff'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = `${w.color}40`; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: w.color }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 커스텀 AI 지시사항 */}
          <div className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
              커스텀 AI 지시사항 <span style={{ color: '#888', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Custom Prompt</span>
            </p>
            <textarea
              value={settings.customPrompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ ...settings, customPrompt: e.target.value })
              }
              placeholder="AI 분석 시 추가로 고려할 사항을 입력하세요. 예: '이 게임의 타겟 국가는 동남아시아입니다. 해당 시장 CPI 기준으로 분석해주세요.'"
              rows={3}
              className="w-full rounded-[10px] text-sm outline-none resize-none"
              style={{
                border: '1.5px solid #E0E0E0',
                backgroundColor: '#FAFAFA',
                color: '#444',
                padding: '10px 12px',
                lineHeight: 1.6,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#5B2D8E'; e.currentTarget.style.backgroundColor = '#fff'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
            />
          </div>

          {/* 기본값 초기화 */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: '#888', background: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FF1FA8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
            aria-label="기본값으로 초기화"
          >
            <RotateCcw size={13} aria-hidden />
            기본값으로 초기화
          </button>
        </div>
      )}
    </div>
  );
}
