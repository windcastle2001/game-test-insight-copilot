import { motion } from 'framer-motion';
import type { KpiCard, KpiStatus } from '../types/gameTest';

interface Props {
  kpiCards: KpiCard[];
}

const statusConfig: Record<KpiStatus, { label: string; korLabel: string; bg: string; border: string; color: string; dotColor: string }> = {
  good: { label: 'Good', korLabel: '양호', bg: '#f0fdf4', border: '#86efac', color: '#16a34a', dotColor: '#22c55e' },
  watch: { label: 'Watch', korLabel: '주의', bg: '#fffbeb', border: '#fcd34d', color: '#d97706', dotColor: '#f59e0b' },
  risk: { label: 'Risk', korLabel: '위험', bg: '#fff1f2', border: '#fca5a5', color: '#dc2626', dotColor: '#ef4444' },
};

function KpiCardItem({ card, index }: { card: KpiCard; index: number }) {
  const sc = statusConfig[card.status];
  const displayValue =
    card.key === 'arpdau'
      ? `$${card.value}`
      : card.key === 'cpi'
      ? `$${card.value}`
      : `${card.value}${card.unit}`;

  return (
    <motion.div
      className="rounded-[14px] p-4"
      style={{ backgroundColor: '#ffffff', border: `1.5px solid ${sc.border}` }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      {/* 상태 배지 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold" style={{ color: '#888888' }}>
          {card.name}
        </span>
        <span
          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: sc.bg, color: sc.color }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: sc.dotColor }}
          />
          {sc.korLabel}
        </span>
      </div>

      {/* 값 */}
      <div className="mb-1">
        <span className="text-2xl font-black" style={{ color: '#000000' }}>
          {displayValue}
        </span>
      </div>
      <p className="text-xs font-medium" style={{ color: '#444444' }}>
        {card.korName}
      </p>

      {/* 해석 */}
      <p className="text-xs mt-3 leading-relaxed" style={{ color: '#888888' }}>
        {card.korInterpretation}
      </p>
    </motion.div>
  );
}

export default function KpiHealthDashboard({ kpiCards }: Props) {
  const goodCount = kpiCards.filter((c) => c.status === 'good').length;
  const watchCount = kpiCards.filter((c) => c.status === 'watch').length;
  const riskCount = kpiCards.filter((c) => c.status === 'risk').length;

  return (
    <section className="max-w-5xl mx-auto px-6 mb-8">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black" style={{ color: '#000000' }}>
          KPI 건강 대시보드
          <span className="ml-2 text-sm font-normal" style={{ color: '#888888' }}>
            KPI Health Dashboard
          </span>
        </h2>
        {/* 요약 카운터 */}
        <div className="flex gap-2">
          {[
            { count: goodCount, label: '양호', color: '#16a34a', bg: '#f0fdf4' },
            { count: watchCount, label: '주의', color: '#d97706', bg: '#fffbeb' },
            { count: riskCount, label: '위험', color: '#dc2626', bg: '#fff1f2' },
          ].map(({ count, label, color, bg }) => (
            <span
              key={label}
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: bg, color }}
            >
              {count} {label}
            </span>
          ))}
        </div>
      </div>

      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpiCards.map((card, i) => (
          <KpiCardItem key={card.key} card={card} index={i} />
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: '#888888' }}>
        * Prototype Benchmark 기준 (실제 업계 절대 기준과 다를 수 있습니다)
      </p>
    </section>
  );
}
