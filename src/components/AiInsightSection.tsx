import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AnalysisResult } from '../types/gameTest';
import { Lightbulb, CheckCircle, AlertOctagon, HelpCircle, Compass } from 'lucide-react';

interface Props {
  insight: AnalysisResult['aiInsight'];
}

type Lang = 'kor' | 'eng';

interface InsightItem {
  key: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  titleKor: string;
  titleEng: string;
  kor: string;
  eng: string;
  accentColor: string;
}

export default function AiInsightSection({ insight }: Props) {
  const [lang, setLang] = useState<Lang>('kor');

  const items: InsightItem[] = [
    {
      key: 'executive',
      icon: Lightbulb,
      titleKor: '종합 요약',
      titleEng: 'Executive Summary',
      kor: insight.executiveSummaryKor,
      eng: insight.executiveSummary,
      accentColor: '#F5C300',
    },
    {
      key: 'working',
      icon: CheckCircle,
      titleKor: '잘 작동하고 있는 것',
      titleEng: 'What Is Working',
      kor: insight.whatIsWorkingKor,
      eng: insight.whatIsWorking,
      accentColor: '#16a34a',
    },
    {
      key: 'risk',
      icon: AlertOctagon,
      titleKor: '핵심 리스크',
      titleEng: 'Key Risk',
      kor: insight.keyRiskKor,
      eng: insight.keyRisk,
      accentColor: '#dc2626',
    },
    {
      key: 'why',
      icon: HelpCircle,
      titleKor: '왜 중요한가',
      titleEng: 'Why It Matters',
      kor: insight.whyItMattersKor,
      eng: insight.whyItMatters,
      accentColor: '#5B2D8E',
    },
    {
      key: 'direction',
      icon: Compass,
      titleKor: '권장 방향',
      titleEng: 'Recommended Direction',
      kor: insight.recommendedDirectionKor,
      eng: insight.recommendedDirection,
      accentColor: '#FF1FA8',
    },
  ];

  return (
    <motion.section
      className="max-w-5xl mx-auto px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* 헤더 + 언어 탭 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black" style={{ color: '#000000' }}>
          <span style={{ color: '#F5C300' }}>AI</span> 인사이트
          <span className="ml-2 text-sm font-normal" style={{ color: '#888888' }}>
            AI Insight
          </span>
        </h2>
        {/* 언어 탭 */}
        <div
          className="flex rounded-full p-0.5 gap-0.5"
          style={{ backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0' }}
        >
          {(['kor', 'eng'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="text-xs font-bold px-4 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: lang === l ? '#000000' : 'transparent',
                color: lang === l ? '#ffffff' : '#888888',
              }}
              aria-label={l === 'kor' ? '한국어 보기' : 'View in English'}
            >
              {l === 'kor' ? '한국어' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => {
          const { icon: Icon } = item;
          return (
            <motion.div
              key={item.key}
              className="rounded-[14px] p-5"
              style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${item.accentColor}15` }}
                >
                  <Icon size={18} style={{ color: item.accentColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-black" style={{ color: '#000000' }}>
                      {lang === 'kor' ? item.titleKor : item.titleEng}
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#888888' }}>
                      {lang === 'kor' ? item.titleEng : item.titleKor}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: '#444444',
                      lineHeight: '1.7',
                      fontSize: '15px',
                    }}
                  >
                    {lang === 'kor' ? item.kor : item.eng}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
