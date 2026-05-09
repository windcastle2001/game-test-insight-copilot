import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Label,
} from 'recharts';
import type { AnalysisResult } from '../types/gameTest';

interface Props {
  result: AnalysisResult;
  gameName: string;
}

const RETENTION_BENCHMARKS = [
  { day: 'D1', value: 35, fill: '#FF1FA8' },
  { day: 'D3', value: 18, fill: '#5B2D8E' },
  { day: 'D7', value: 8, fill: '#F5C300' },
];

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] px-3 py-2 text-xs font-semibold shadow-lg"
      style={{ backgroundColor: '#000', color: '#fff' }}>
      <p>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

interface ScatterPoint {
  x: number;
  y: number;
  name: string;
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}

function CustomScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[10px] px-3 py-2 text-xs font-semibold shadow-lg"
      style={{ backgroundColor: '#000', color: '#fff' }}>
      <p className="font-bold mb-1">{d.name}</p>
      <p>시장성: {d.x}/100</p>
      <p>리텐션: {d.y}/100</p>
    </div>
  );
}

export default function ChartSection({ result, gameName }: Props) {
  // Retention Bar Chart 데이터
  const retentionData = result.kpiCards
    .filter((c) => ['d1Retention', 'd3Retention', 'd7Retention'].includes(c.key))
    .map((c, i) => ({
      day: ['D1', 'D3', 'D7'][i],
      실제: c.value,
      벤치마크: RETENTION_BENCHMARKS[i].value,
    }));

  // Scatter Plot 데이터 (현재 게임만)
  const scatterData: ScatterPoint[] = [
    {
      x: result.marketabilityScore,
      y: result.retentionScore,
      name: gameName,
    },
  ];

  return (
    <motion.section
      className="max-w-6xl mx-auto px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-lg font-black mb-4" style={{ color: '#000000' }}>
        분석 차트
        <span className="ml-2 text-sm font-normal" style={{ color: '#888888' }}>
          Chart Analysis
        </span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Retention Trend Bar Chart */}
        <div
          className="rounded-[14px] p-5"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
        >
          <h3 className="text-sm font-bold mb-1" style={{ color: '#000000' }}>
            리텐션 곡선
          </h3>
          <p className="text-xs mb-4" style={{ color: '#888888' }}>
            실제값 vs 프로토타입 벤치마크
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={retentionData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fontWeight: 700, fill: '#444' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 55]}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="실제" fill="#FF1FA8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="벤치마크" fill="#E0E0E0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[{ label: '실제값', color: '#FF1FA8' }, { label: '벤치마크', color: '#E0E0E0' }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-xs font-semibold" style={{ color: '#444444' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marketability vs Retention Matrix */}
        <div
          className="rounded-[14px] p-5"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
        >
          <h3 className="text-sm font-bold mb-1" style={{ color: '#000000' }}>
            시장성 × 리텐션 매트릭스
          </h3>
          <p className="text-xs mb-4" style={{ color: '#888888' }}>
            각 영역별 퍼블리싱 결정 구역
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                type="number"
                dataKey="x"
                name="시장성"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              >
                <Label value="Marketability" offset={-5} position="insideBottom" style={{ fontSize: 10, fill: '#888' }} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                name="리텐션"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              >
                <Label value="Retention" angle={-90} position="insideLeft" style={{ fontSize: 10, fill: '#888' }} />
              </YAxis>
              {/* 구역 구분선 */}
              <ReferenceLine x={70} stroke="#E0E0E0" strokeDasharray="4 4" />
              <ReferenceLine y={70} stroke="#E0E0E0" strokeDasharray="4 4" />
              <ReferenceLine x={40} stroke="#F0F0F0" strokeDasharray="2 4" />
              <ReferenceLine y={40} stroke="#F0F0F0" strokeDasharray="2 4" />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter
                data={scatterData}
                fill="#FF1FA8"
                name={gameName}
                shape={(props: unknown) => {
                  const p = props as { cx?: number; cy?: number };
                  const cx = p.cx ?? 0;
                  const cy = p.cy ?? 0;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={10} fill="#FF1FA8" fillOpacity={0.2} />
                      <circle cx={cx} cy={cy} r={6} fill="#FF1FA8" />
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          {/* 구역 라벨 */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'Scale Zone', sub: '시장성 70+ / 리텐션 70+', color: '#16a34a' },
              { label: 'Iterate Zone', sub: '한쪽만 강함', color: '#d97706' },
              { label: 'Kill Zone', sub: '시장성 40- / 리텐션 40-', color: '#dc2626' },
              { label: 'Current', sub: `M:${result.marketabilityScore} / R:${result.retentionScore}`, color: '#FF1FA8' },
            ].map((z) => (
              <div key={z.label} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                <span className="text-xs" style={{ color: '#444444' }}>
                  <strong>{z.label}</strong>{' '}
                  <span style={{ color: '#888888' }}>{z.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
