import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalysisResult } from '../types/gameTest';

interface Props {
  result: AnalysisResult;
  gameName: string;
}

export default function ChartSection({ result, gameName }: Props) {
  const retentionData = result.kpiCards
    .filter((card) => ['d1Retention', 'd3Retention', 'd7Retention'].includes(card.key))
    .map((card) => ({
      name: card.name.replace(' Retention', ''),
      actual: card.value,
      benchmark: card.key === 'd1Retention' ? 35 : card.key === 'd3Retention' ? 18 : 8,
    }));

  return (
    <section className="page-shell">
      <div className="section-heading compact">
        <p className="section-eyebrow">차트</p>
        <h2>리텐션과 의사결정 위치</h2>
        <p>
          시장성 x 리텐션 매트릭스는 광고로 유저를 싸게 데려올 수 있는지와 들어온 유저가 남는지를 함께 보는 도구입니다.
          오른쪽 위는 Scale 후보, 왼쪽 아래는 Kill 후보, 한쪽만 강하면 Iterate 후보로 해석합니다.
        </p>
      </div>
      <div className="chart-grid">
        <article className="chart-card">
          <strong>리텐션 벤치마크 비교</strong>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip />
              <Bar dataKey="actual" name="현재" fill="#FF1FA8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="benchmark" name="기준" fill="#E0E0E0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card">
          <strong>시장성 x 리텐션 매트릭스</strong>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 20, right: 22, bottom: 16, left: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} name="시장성" />
              <YAxis type="number" dataKey="y" domain={[0, 100]} name="리텐션" />
              <ReferenceLine x={70} stroke="#16a34a" strokeDasharray="4 4" label={{ value: 'Scale 기준', position: 'top', fill: '#16a34a', fontSize: 11 }} />
              <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="4 4" />
              <ReferenceLine x={40} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Kill 위험', position: 'bottom', fill: '#dc2626', fontSize: 11 }} />
              <ReferenceLine y={40} stroke="#dc2626" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name={gameName} data={[{ x: result.marketabilityScore, y: result.retentionScore }]} fill="#FF1FA8" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="matrix-legend">
            <span><b className="scale-dot" />Scale: 시장성 70+ / 리텐션 70+</span>
            <span><b className="risk-dot" />Kill 위험: 시장성 40- / 리텐션 40-</span>
            <span><b className="current-dot" />현재: M {result.marketabilityScore} / R {result.retentionScore}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
