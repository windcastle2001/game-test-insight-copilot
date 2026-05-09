import type { KpiCard, KpiStatus } from '../types/gameTest';

interface Props {
  kpiCards: KpiCard[];
}

const statusLabel: Record<KpiStatus, string> = { good: '양호', watch: '주의', risk: '위험' };

export default function KpiHealthDashboard({ kpiCards }: Props) {
  return (
    <section className="page-shell">
      <div className="section-heading compact">
        <p className="section-eyebrow">KPI 건강도</p>
        <h2>지표별 판정</h2>
      </div>
      <div className="health-grid">
        {kpiCards.map((card) => (
          <article className={`health-card ${card.status}`} key={card.key}>
            <div>
              <span>{card.name}</span>
              <b>{statusLabel[card.status]}</b>
            </div>
            <strong>{card.unit === '$' ? `$${card.value}` : `${card.value}${card.unit}`}</strong>
            <p>{card.korInterpretation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
