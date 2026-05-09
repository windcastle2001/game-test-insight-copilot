import type { ExperimentItem } from '../types/gameTest';

interface Props {
  experiments: ExperimentItem[];
}

export default function ExperimentPlan({ experiments }: Props) {
  return (
    <section className="page-shell">
      <div className="section-heading compact">
        <p className="section-eyebrow">다음 실험</p>
        <h2>우선순위 액션 플랜</h2>
      </div>
      <div className="experiment-list">
        {experiments.map((item) => (
          <article className="experiment-row" key={item.priority}>
            <span>P{item.priority}</span>
            <div>
              <strong>{item.experimentKor}</strong>
              <p>{item.targetKpi} · {item.expectedImpactKor} · {item.ownerKor}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
