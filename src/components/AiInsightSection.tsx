import type { AnalysisResult } from '../types/gameTest';

interface Props {
  insight: AnalysisResult['aiInsight'];
}

export default function AiInsightSection({ insight }: Props) {
  const items = [
    ['종합 요약', insight.executiveSummaryKor],
    ['작동하는 부분', insight.whatIsWorkingKor],
    ['핵심 리스크', insight.keyRiskKor],
    ['왜 중요한가', insight.whyItMattersKor],
    ['권장 방향', insight.recommendedDirectionKor],
  ];

  return (
    <section className="page-shell">
      <div className="section-heading compact">
        <p className="section-eyebrow">AI 인사이트</p>
        <h2>해석과 다음 방향</h2>
        <p>업로드된 raw data에서 계산한 KPI와 동향 클러스터를 함께 검토해 의사결정과 다음 액션을 생성합니다.</p>
      </div>
      <div className="insight-grid">
        {items.map(([title, body]) => (
          <article className="insight-card" key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
