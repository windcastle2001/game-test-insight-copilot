import { motion } from 'framer-motion';
import type { KpiCard, KpiStatus } from '../types/gameTest';

interface Props {
  kpiCards: KpiCard[];
}

const statusConfig: Record<KpiStatus, {
  label: string;
  bg: string;
  color: string;
  dotColor: string;
}> = {
  good:  { label: '양호', bg: '#f0fdf4', color: '#16a34a', dotColor: '#22c55e' },
  watch: { label: '주의', bg: '#fffbeb', color: '#d97706', dotColor: '#f59e0b' },
  risk:  { label: '위험', bg: '#fff1f2', color: '#dc2626', dotColor: '#ef4444' },
};

function KpiCardItem({ card, index }: { card: KpiCard; index: number }) {
  const sc = statusConfig[card.status];

  const displayValue =
    card.key === 'arpdau' || card.key === 'cpi'
      ? `$${card.value}`
      : card.unit
      ? `${card.value}${card.unit}`
      : String(card.value);

  return (
    <motion.div
      className="rounded-[14px] flex flex-col"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #E0E0E0',
        padding: 20,
        minHeight: 160,
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      {/* 상단: KPI명 + 상태 뱃지 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#888',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.name}
          </p>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#444',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.korName}
          </p>
        </div>
        {/* 상태 뱃지 */}
        <span
          className="flex items-center gap-1 flex-shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 100,
            backgroundColor: sc.bg,
            color: sc.color,
          }}
          role="status"
          aria-label={`${card.korName} 상태: ${sc.label}`}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: sc.dotColor,
            }}
          />
          {sc.label}
        </span>
      </div>

      {/* 값 */}
      <div style={{ marginBottom: 'auto' }}>
        <p
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: '#000',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayValue}
        </p>
      </div>

      {/* 해석 텍스트 — 2줄로 말줄임 */}
      <p
        style={{
          fontSize: 12,
          color: '#666',
          marginTop: 10,
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {card.korInterpretation}
      </p>
    </motion.div>
  );
}

export default function KpiHealthDashboard({ kpiCards }: Props) {
  const goodCount  = kpiCards.filter((c) => c.status === 'good').length;
  const watchCount = kpiCards.filter((c) => c.status === 'watch').length;
  const riskCount  = kpiCards.filter((c) => c.status === 'risk').length;

  return (
    <section className="max-w-6xl mx-auto px-6 mb-8">
      {/* 섹션 헤더 */}
      <div className="mb-4">
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
          KPI HEALTH CHECK
        </p>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000' }}>
            KPI 건강 대시보드 <span style={{ color: '#F5C300' }}>Dashboard</span>
          </h2>
          {/* 요약 카운터 */}
          <div className="flex gap-2">
            {[
              { count: goodCount,  label: '양호', color: '#16a34a', bg: '#f0fdf4' },
              { count: watchCount, label: '주의', color: '#d97706', bg: '#fffbeb' },
              { count: riskCount,  label: '위험', color: '#dc2626', bg: '#fff1f2' },
            ].map(({ count, label, color, bg }) => (
              <span
                key={label}
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: bg, color }}
                aria-label={`${label} ${count}개`}
              >
                {count} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI 카드 그리드 — sm:2열, lg:4열 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card, i) => (
          <KpiCardItem key={card.key} card={card} index={i} />
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: '#888' }}>
        * Prototype Benchmark 기준 (실제 업계 절대 기준과 다를 수 있습니다)
      </p>
    </section>
  );
}
