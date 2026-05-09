import { motion } from 'framer-motion';
import type { ExperimentItem } from '../types/gameTest';
import { Beaker, Target, TrendingUp, User } from 'lucide-react';

interface Props {
  experiments: ExperimentItem[];
}

export default function ExperimentPlan({ experiments }: Props) {
  return (
    <motion.section
      className="max-w-6xl mx-auto px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h2 className="text-lg font-black mb-4" style={{ color: '#000000' }}>
        다음 실험 계획
        <span className="ml-2 text-sm font-normal" style={{ color: '#888888' }}>
          Next Experiment Plan
        </span>
      </h2>

      <div className="flex flex-col gap-3">
        {experiments.map((exp, i) => {
          const isPriority1 = exp.priority === 1;
          return (
            <motion.div
              key={exp.priority}
              className="rounded-[14px] p-5"
              style={{
                backgroundColor: isPriority1 ? '#fff0f8' : '#ffffff',
                border: isPriority1 ? '1.5px solid #FF1FA8' : '1px solid #E0E0E0',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
            >
              <div className="flex items-start gap-4">
                {/* Priority 뱃지 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{
                    backgroundColor: isPriority1 ? '#FF1FA8' : '#F5F5F5',
                    color: isPriority1 ? '#ffffff' : '#888888',
                  }}
                >
                  P{exp.priority}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 실험 제목 */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Beaker size={14} style={{ color: isPriority1 ? '#FF1FA8' : '#888888' }} />
                    <span className="text-sm font-black" style={{ color: '#000000' }}>
                      {exp.experimentKor}
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#888888' }}>
                      {exp.experiment}
                    </span>
                  </div>

                  {/* 메타 정보 그리드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <div className="flex items-start gap-2">
                      <Target size={13} style={{ color: '#5B2D8E', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#888888' }}>Target KPI</p>
                        <p className="text-xs font-semibold" style={{ color: '#444444' }}>{exp.targetKpi}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp size={13} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#888888' }}>기대 효과</p>
                        <p className="text-xs font-semibold" style={{ color: '#444444' }}>{exp.expectedImpactKor}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#888888' }}>담당</p>
                        <p className="text-xs font-semibold" style={{ color: '#444444' }}>{exp.ownerKor}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
