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
  color: string;
  badgeBg: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}> = {
  scale: {
    label: 'SCALE',
    korLabel: '확장',
    description: 'UA 예산을 확대하여 본격 스케일업',
    bg: '#f0fdf4',
    color: '#166534',
    badgeBg: '#dcfce7',
    Icon: TrendingUp,
  },
  iterate: {
    label: 'ITERATE',
    korLabel: '반복개선',
    description: '핵심 지표 개선 후 재테스트 권장',
    bg: '#fffbeb',
    color: '#92400e',
    badgeBg: '#fef3c7',
    Icon: RefreshCw,
  },
  kill: {
    label: 'KILL',
    korLabel: '중단',
    description: '현재 방향으로는 확장 ROI 확보 불가',
    bg: '#fff1f2',
    color: '#9f1239',
    badgeBg: '#ffe4e6',
    Icon: XCircle,
  },
};

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
}

function ScoreBar({ label, value, color }: ScoreBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold" style={{ color: '#444444' }}>{label}</span>
        <span className="text-sm font-black" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F5F5' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
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
      className="max-w-6xl mx-auto px-6 mb-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 섹션 레이블 */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>
        ANALYSIS RESULT
      </p>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000', marginBottom: 16 }}>
        분석 결론 <span style={{ color: '#FF1FA8' }}>Decision</span>
      </h2>

      <div
        className="rounded-[14px] p-6"
        style={{ backgroundColor: cfg.bg, border: `1px solid #E0E0E0` }}
      >
        {/* 상단 결정 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6">
          {/* 결정 배지 + 텍스트 */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-[14px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.badgeBg }}
            >
              <Icon size={32} style={{ color: cfg.color }} aria-hidden />
            </div>
            <div>
              {/* 결정 레이블 뱃지 */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-2"
                style={{ backgroundColor: cfg.badgeBg, color: cfg.color }}
                role="status"
              >
                {cfg.korLabel}
              </span>
              {/* 대형 결정 텍스트 */}
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: cfg.color,
                  lineHeight: 1,
                  letterSpacing: '-1px',
                }}
                aria-label={`결정: ${cfg.label}`}
              >
                {cfg.label}
              </div>
              <p className="text-sm font-medium mt-1" style={{ color: '#444' }}>
                {cfg.description}
              </p>
            </div>
          </div>

          {/* Confidence */}
          <div className="sm:ml-auto flex flex-col items-center sm:items-end">
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: '#FF1FA8',
                lineHeight: 1,
              }}
              aria-label={`신뢰도 ${result.confidence}%`}
            >
              {result.confidence}%
            </div>
            <div className="text-xs font-bold mt-1" style={{ color: '#888' }}>
              신뢰도 (Confidence)
            </div>
          </div>
        </div>

        {/* 스코어 바 3개 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ScoreBar label="광고 시장성 (Marketability)" value={result.marketabilityScore} color="#FF1FA8" />
          <ScoreBar label="리텐션 (Retention)" value={result.retentionScore} color="#5B2D8E" />
          <ScoreBar label="수익화 (Monetization)" value={result.monetizationScore} color="#F5C300" />
        </div>

        {/* 병목 + 권장 포커스 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-[10px] p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} style={{ color: cfg.color }} aria-hidden />
              <span className="text-xs font-black" style={{ color: '#888', letterSpacing: 0.5 }}>
                MAIN BOTTLENECK
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#000' }}>
              {result.korBottleneck}
            </p>
          </div>
          <div
            className="rounded-[10px] p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} style={{ color: cfg.color }} aria-hidden />
              <span className="text-xs font-black" style={{ color: '#888', letterSpacing: 0.5 }}>
                RECOMMENDED FOCUS
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#000' }}>
              {result.korFocus}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
