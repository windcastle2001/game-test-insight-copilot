import { useState, type ChangeEvent } from 'react';
import { RotateCcw, Settings, X } from 'lucide-react';
import type { AnalysisSettings } from '../types/gameTest';
import { DEFAULT_SETTINGS } from '../types/gameTest';
import { benchmarkPresets } from '../data/benchmarkPresets';

interface Props {
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
}

const rows: Array<{ key: keyof AnalysisSettings['thresholds']; label: string; unit: string; step: number; hint: string }> = [
  { key: 'cpi', label: 'CPI', unit: '$', step: 0.01, hint: '낮을수록 좋음' },
  { key: 'ctr', label: 'CTR', unit: '%', step: 0.1, hint: '높을수록 좋음' },
  { key: 'ipm', label: 'IPM', unit: '', step: 1, hint: '높을수록 좋음' },
  { key: 'd1Retention', label: 'D1 잔존율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'd3Retention', label: 'D3 잔존율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'd7Retention', label: 'D7 잔존율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'arpdau', label: 'ARPDAU', unit: '$', step: 0.001, hint: '높을수록 좋음' },
  { key: 'day1Playtime', label: '첫날 플레이', unit: '분', step: 0.5, hint: '높을수록 좋음' },
  { key: 'd0TutorialCompletion', label: '튜토리얼 완료율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'firstSessionDropoff', label: '첫 세션 이탈률', unit: '%', step: 0.5, hint: '낮을수록 좋음' },
  { key: 'adWatchCompletion', label: '광고 시청 완료율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'storeConversion', label: '스토어 전환율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'd14Retention', label: 'D14 잔존율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'd30Retention', label: 'D30 잔존율', unit: '%', step: 0.5, hint: '높을수록 좋음' },
  { key: 'roas', label: 'ROAS', unit: '%', step: 1, hint: '높을수록 좋음' },
  { key: 'ltv', label: 'LTV', unit: '$', step: 0.001, hint: '높을수록 좋음' },
];

export default function AnalysisSettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const total = settings.weights.marketability + settings.weights.retention + settings.weights.monetization;

  const updateThreshold = (key: keyof AnalysisSettings['thresholds'], field: 'good' | 'watch', value: number) => {
    onChange({ ...settings, thresholds: { ...settings.thresholds, [key]: { ...settings.thresholds[key], [field]: value } } });
  };

  const updateWeight = (key: keyof AnalysisSettings['weights'], value: number) => {
    onChange({ ...settings, weights: { ...settings.weights, [key]: value } });
  };

  return (
    <>
      <button type="button" className="settings-cta" onClick={() => setOpen(true)}>
        <Settings size={18} />
        분석 기준값 세팅
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-label="분석 기준값 세팅" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="section-eyebrow">판정 기준</p>
                <h2>분석 기준값 세팅</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <div className="preset-panel">
              <strong>장르/시장/플랫폼 프리셋</strong>
              <p>외부 게임의 실제 CPI, 리텐션, ARPDAU 원자료는 보통 비공개라서 공신력 있는 사이트에서 자동 수집하기 어렵습니다. 대신 제출용으로는 내부 프로토타입 프리셋을 명확히 표시합니다.</p>
              <div className="preset-grid">
                {benchmarkPresets.map((preset) => (
                  <button key={preset.id} type="button" className="preset-button" onClick={() => onChange(preset.settings)}>
                    <b>{preset.label}</b>
                    <span>{preset.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="threshold-grid">
              {rows.map((row) => (
                <div className="threshold-card" key={row.key}>
                  <div className="threshold-title">
                    <strong>{row.label}</strong>
                    <span>{row.hint}</span>
                  </div>
                  <label>
                    양호 기준
                    <input type="number" value={settings.thresholds[row.key].good} step={row.step} onChange={(event: ChangeEvent<HTMLInputElement>) => updateThreshold(row.key, 'good', Number(event.target.value))} />
                    <span>{row.unit}</span>
                  </label>
                  <label>
                    주의 기준
                    <input type="number" value={settings.thresholds[row.key].watch} step={row.step} onChange={(event: ChangeEvent<HTMLInputElement>) => updateThreshold(row.key, 'watch', Number(event.target.value))} />
                    <span>{row.unit}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="weight-panel">
              <div className="threshold-title">
                <strong>종합 점수 가중치</strong>
                <span className={total === 100 ? 'ok' : 'risk'}>합계 {total}%</span>
              </div>
              {[
                ['marketability', '시장성'] as const,
                ['retention', '리텐션'] as const,
                ['monetization', '수익화'] as const,
              ].map(([key, label]) => (
                <label className="range-row" key={key}>
                  {label}
                  <input type="range" min={0} max={100} step={5} value={settings.weights[key]} onChange={(event) => updateWeight(key, Number(event.target.value))} />
                  <strong>{settings.weights[key]}%</strong>
                </label>
              ))}
            </div>

            <textarea
              className="prompt-box"
              rows={3}
              value={settings.customPrompt}
              onChange={(event) => onChange({ ...settings, customPrompt: event.target.value })}
              placeholder="추가로 고려할 시장, 장르, 내부 기준이 있으면 입력하세요."
            />

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => onChange(DEFAULT_SETTINGS)}>
                <RotateCcw size={15} />
                기본값 복원
              </button>
              <button type="button" className="primary-button" onClick={() => setOpen(false)}>
                적용하기
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
