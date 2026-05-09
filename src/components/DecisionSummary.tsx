import { RefreshCw, TrendingUp, XCircle } from 'lucide-react';
import type { AnalysisResult, Decision } from '../types/gameTest';

interface Props {
  result: AnalysisResult;
}

const config: Record<Decision, { label: string; kor: string; tone: string; Icon: typeof TrendingUp }> = {
  scale: { label: 'SCALE', kor: '확장', tone: 'good', Icon: TrendingUp },
  iterate: { label: 'ITERATE', kor: '개선 후 재검증', tone: 'watch', Icon: RefreshCw },
  kill: { label: 'KILL', kor: '중단', tone: 'risk', Icon: XCircle },
};

export default function DecisionSummary({ result }: Props) {
  const current = config[result.decision];
  const Icon = current.Icon;

  return (
    <section className="page-shell result-section">
      <div className="section-heading">
        <p className="section-eyebrow">분석 결론</p>
        <h2>퍼블리싱 의사결정</h2>
      </div>
      <div className={`decision-card ${current.tone}`}>
        <div className="decision-main">
          <Icon size={34} />
          <div>
            <span>{current.kor}</span>
            <strong>{current.label}</strong>
            <p>{result.korBottleneck}</p>
          </div>
        </div>
        <div className="confidence">
          <strong>{result.confidence}%</strong>
          <span>신뢰도</span>
        </div>
      </div>
      <div className="score-grid">
        {[
          ['시장성', result.marketabilityScore],
          ['리텐션', result.retentionScore],
          ['수익화', result.monetizationScore],
        ].map(([label, value]) => (
          <div className="score-card" key={label}>
            <span>{label}</span>
            <strong>{value}/100</strong>
            <div><i style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="reason-panel">
        <strong>왜 이 결정인가</strong>
        <p>{result.formulaSummary}</p>
        {result.decisionReasons.map((reason) => <span key={reason}>{reason}</span>)}
      </div>
    </section>
  );
}
