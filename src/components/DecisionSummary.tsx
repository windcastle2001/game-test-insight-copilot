import { motion } from 'framer-motion';
import type { AnalysisResult, Decision } from '../types/gameTest';
import { TrendingUp, RefreshCw, XCircle, Target, AlertTriangle } from 'lucide-react';

interface Props {
  result: AnalysisResult;
}

const decisionConfig: Record<Decision, {
  label: string;
  korLabel: string;
  description: string;
  bg: string;
  border: string;
  color: string;
  badgeBg: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}> = {
  scale: {
    label: 'SCALE',
    korLabel: '확장',
    description: 'UA 예산을 확대하여 본격 스케일업',
    bg: '#f0fdf4',
    border: '#86efac',
    color: '#16a34a',
    badgeBg: '#dcfce7',
    Icon: TrendingUp,
  },
  iterate: {
    label: 'ITERATE',
    korLabel: '반복개선',
    description: '핵심 지표 개선 후 재테스트 권장',
    bg: '#fffbeb',
    border: '#fcd34d',
    color: '#d97706',
    badgeBg: '#fef3c7',
    Icon: RefreshCw,
  },
  kill: {
    label: 'KILL',
    korLabel: '중단',
    description: '현재 방향으로는 확장 ROI 확보 불가',
    bg: '#fff1f2',
    border: '#fca5a5',
    color: '#dc2626',
    badgeBg: '#fee2e2',
    Icon: XCircle,
  },
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold" style={{ color: '#444444' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E0E0E0' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

export default function DecisionSummary({ result }: Props) {
  const cfg = decisionConfig[result.decision];
  const { Icon } = cfg;

  return (
    <motion.section
      className="max-w-5xl mx-auto px-6 mb-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="rounded-[14px] p-6"
        style={{ backgroundColor: cfg.bg, border: `2px solid ${cfg.border}` }}
      >
        {/* 상단 결정 배지 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-[14px] flex items-center justify-center"
              style={{ backgroundColor: cfg.badgeBg }}
            >
              <Icon size={28} style={{ color: cfg.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl tracking-tight"
                  style={{ fontWeight: 900, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                <span
                  className="text-sm font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: cfg.badgeBg, color: cfg.color }}
                >
                  {cfg.korLabel}
                </span>
              </div>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#444444' }}>
                {cfg.description}
              </p>
            </div>
          </div>

          {/* Confidence */}
          <div className="sm:ml-auto text-center sm:text-right">
            <div className="text-4xl font-black" style={{ color: cfg.color }}>
              {result.confidence}%
            </div>
            <div className="text-xs font-semibold" style={{ color: '#888888' }}>
              신뢰도 (Confidence)
            </div>
          </div>
        </div>

        {/* 점수 바 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ScoreBar label="광고 시장성 (Marketability)" value={result.marketabilityScore} color="#FF1FA8" />
          <ScoreBar label="리텐션 (Retention)" value={result.retentionScore} color="#5B2D8E" />
          <ScoreBar label="수익화 (Monetization)" value={result.monetizationScore} color="#F5C300" />
        </div>

        {/* 병목 + 추천 포커스 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="rounded-[10px] p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: cfg.color }} />
              <span className="text-xs font-bold" style={{ color: '#888888' }}>핵심 병목 (Main Bottleneck)</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#000000' }}>
              {result.korBottleneck}
            </p>
          </div>
          <div
            className="rounded-[10px] p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} style={{ color: cfg.color }} />
              <span className="text-xs font-bold" style={{ color: '#888888' }}>권장 포커스 (Recommended Focus)</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#000000' }}>
              {result.korFocus}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
