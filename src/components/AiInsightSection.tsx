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
        <p>Scale/Iterate/Kill 결정은 입력 KPI와 기준값을 쓰는 로컬 점수 엔진이 계산합니다. Gemini API 키가 설정된 경우에는 이 결과와 동향 요약을 바탕으로 인사이트 문장을 보강합니다.</p>
      </div>
      <div className="insight-grid">
        {items.map(([title, body]) => (
          <article className="insight-card" key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="metric-suggestion">
        <strong>정확도를 더 높일 때 추가하면 좋은 지표</strong>
        <span>D0 튜토리얼 완료율</span>
        <span>첫 세션 이탈률</span>
        <span>광고 시청 완료율</span>
        <span>스토어 전환율</span>
        <span>D14/D30 잔존율</span>
        <span>ROAS/LTV</span>
      </div>
    </section>
  );
}
