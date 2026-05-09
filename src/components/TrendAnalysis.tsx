import { useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Upload, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendAnalysisResult } from '../types/gameTest';
import { analyzeTrendData, parseTrendCsvRows, generateTrendCsvTemplate } from '../utils/trendEngine';
import { downloadCsv } from '../utils/rawDataEngine';
import { motion } from 'framer-motion';

interface Props {
  onTrendDataChange: (data: TrendAnalysisResult | null) => void;
}

function SentimentIcon({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  if (sentiment === 'positive') return <TrendingUp size={13} style={{ color: '#16a34a' }} aria-hidden />;
  if (sentiment === 'negative') return <TrendingDown size={13} style={{ color: '#dc2626' }} aria-hidden />;
  return <Minus size={13} style={{ color: '#888' }} aria-hidden />;
}

export default function TrendAnalysis({ onTrendDataChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<TrendAnalysisResult | null>(null);
  const [applyToAnalysis, setApplyToAnalysis] = useState(true);
  const [weightAdjustment, setWeightAdjustment] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const rows = parseTrendCsvRows(parsed.data as Record<string, string>[]);
        const analysisResult = analyzeTrendData(rows, weightAdjustment, applyToAnalysis);
        setResult(analysisResult);
        onTrendDataChange(analysisResult.applyToAnalysis ? analysisResult : null);
        setIsLoading(false);
      },
      error: () => {
        alert('CSV 파싱 오류가 발생했습니다. 파일 형식을 확인해주세요.');
        setIsLoading(false);
      },
    });
    e.target.value = '';
  };

  const handleApplyToggle = (checked: boolean) => {
    setApplyToAnalysis(checked);
    if (result) {
      const updated = { ...result, applyToAnalysis: checked, confidenceAdjustment: checked ? result.confidenceAdjustment : 0 };
      setResult(updated);
      onTrendDataChange(checked ? updated : null);
    }
  };

  const handleWeightChange = (v: number) => {
    setWeightAdjustment(v);
    if (result) {
      const updated = { ...result, weightAdjustment: v };
      setResult(updated);
      if (applyToAnalysis) onTrendDataChange(updated);
    }
  };

  const handleTemplateDownload = () => {
    downloadCsv(generateTrendCsvTemplate(), 'trend_template.csv');
  };

  const maxCount = result ? Math.max(...result.clusters.map((c) => c.count), 1) : 1;

  return (
    <section
      className="max-w-6xl mx-auto px-6 mb-6"
      aria-label="시장 동향 분석 섹션"
    >
      <div
        className="rounded-[14px] p-6"
        style={{ backgroundColor: '#fff', border: '1px solid #E0E0E0' }}
      >
        {/* 섹션 헤더 */}
        <div className="mb-5">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
            MARKET TREND ANALYSIS (Beta)
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>
            시장 동향 분석{' '}
            <span style={{ color: '#F5C300' }}>Trend Insights</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            앱스토어 리뷰, 경쟁사 데이터, 내부 분석 CSV를 업로드하면 자동으로 클러스터링합니다.
          </p>
        </div>

        {/* 업로드 영역 */}
        <div
          className="rounded-[10px] p-5 mb-5 flex flex-col sm:flex-row items-center gap-4"
          style={{ backgroundColor: '#FAFAFA', border: '1.5px dashed #E0E0E0' }}
        >
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-bold mb-1" style={{ color: '#444' }}>동향 데이터 CSV 업로드</p>
            <p className="text-xs" style={{ color: '#888' }}>
              지원 소스: 앱스토어 리뷰, Play스토어 리뷰, 내부 분석, 경쟁사 트렌드
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleTemplateDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[100px] text-xs font-semibold transition-all"
              style={{ border: '1.5px solid #E0E0E0', color: '#444', backgroundColor: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B2D8E'; e.currentTarget.style.color = '#5B2D8E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E0E0E0'; e.currentTarget.style.color = '#444'; }}
              aria-label="동향 CSV 템플릿 다운로드"
            >
              <Download size={13} aria-hidden />
              템플릿
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[100px] text-xs font-bold transition-all"
              style={{
                backgroundColor: isLoading ? '#cc1a86' : '#FF1FA8',
                color: '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              aria-label="동향 CSV 파일 업로드"
            >
              {isLoading ? (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : (
                <Upload size={13} aria-hidden />
              )}
              {isLoading ? '분석 중...' : 'CSV 업로드'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="동향 CSV 파일 선택"
            />
          </div>
        </div>

        {/* 결과 없을 때 빈 상태 */}
        {!result && (
          <div className="text-center py-6" style={{ color: '#CCCCCC' }}>
            <p className="text-sm">동향 CSV를 업로드하면 클러스터 분석이 여기에 표시됩니다.</p>
          </div>
        )}

        {/* 결과 영역 */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* 요약 통계 */}
            <div className="flex flex-wrap gap-3 mb-5">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#F5F5F5', color: '#444' }}
              >
                총 {result.totalCount}건
              </span>
              {result.dateRange.from && (
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#F5F5F5', color: '#444' }}
                >
                  {result.dateRange.from} ~ {result.dateRange.to}
                </span>
              )}
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                style={{
                  backgroundColor:
                    result.overallSentiment === 'positive' ? '#dcfce7'
                    : result.overallSentiment === 'negative' ? '#fee2e2'
                    : '#F5F5F5',
                  color:
                    result.overallSentiment === 'positive' ? '#16a34a'
                    : result.overallSentiment === 'negative' ? '#dc2626'
                    : '#888',
                }}
              >
                <SentimentIcon sentiment={result.overallSentiment} />
                전체 분위기:{' '}
                {result.overallSentiment === 'positive' ? '긍정 우세'
                  : result.overallSentiment === 'negative' ? '부정 우세'
                  : '중립'}
              </span>
            </div>

            {/* 클러스터 바 차트 */}
            <div className="mb-5">
              <p className="text-xs font-black mb-3" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
                클러스터별 분포
              </p>
              <div className="flex flex-col gap-2">
                {result.clusters.map((cluster) => (
                  <div key={cluster.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <SentimentIcon sentiment={cluster.sentiment} />
                        <span className="text-xs font-semibold" style={{ color: '#444' }}>{cluster.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: '#000' }}>{cluster.count}건</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: cluster.sentimentRatio >= 60 ? '#fee2e2' : cluster.sentimentRatio <= 30 ? '#dcfce7' : '#fffbeb',
                            color: cluster.sentimentRatio >= 60 ? '#dc2626' : cluster.sentimentRatio <= 30 ? '#16a34a' : '#d97706',
                            fontWeight: 700,
                          }}
                        >
                          부정 {cluster.sentimentRatio}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F5F5' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            cluster.sentimentRatio >= 60 ? '#FF1FA8'
                            : cluster.sentimentRatio <= 30 ? '#5B2D8E'
                            : '#F5C300',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(cluster.count / maxCount) * 100}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 인사이트 */}
            {result.topInsights.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-black mb-3" style={{ color: '#000', letterSpacing: 1, textTransform: 'uppercase' }}>
                  주요 인사이트
                </p>
                <div className="flex flex-col gap-2">
                  {result.topInsights.map((insight, i) => (
                    <div
                      key={i}
                      className="rounded-[8px] px-3 py-2.5 text-xs font-medium flex items-start gap-2"
                      style={{ backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0', color: '#444', lineHeight: 1.5 }}
                    >
                      <span style={{ color: '#FF1FA8', fontWeight: 900, flexShrink: 0 }}>•</span>
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최종 분석 반영 설정 */}
            <div
              className="rounded-[10px] p-4"
              style={{ backgroundColor: '#FAFAFA', border: '1px solid #E0E0E0' }}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer" htmlFor="apply-trend">
                  <input
                    id="apply-trend"
                    type="checkbox"
                    checked={applyToAnalysis}
                    onChange={(e) => handleApplyToggle(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#FF1FA8' }}
                  />
                  <span className="text-sm font-bold" style={{ color: '#000' }}>
                    최종 분석에 동향 데이터 반영
                  </span>
                </label>
                {result.confidenceAdjustment !== 0 && applyToAnalysis && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: result.confidenceAdjustment > 0 ? '#dcfce7' : '#fee2e2',
                      color: result.confidenceAdjustment > 0 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    Confidence {result.confidenceAdjustment > 0 ? '+' : ''}{result.confidenceAdjustment}%p 보정
                  </span>
                )}
              </div>
              {applyToAnalysis && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#444' }}>동향 가중치</span>
                    <span className="text-xs font-bold" style={{ color: '#5B2D8E' }}>{weightAdjustment}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={5}
                    value={weightAdjustment}
                    onChange={(e) => handleWeightChange(parseInt(e.target.value, 10))}
                    className="w-full h-2 rounded-full appearance-none"
                    style={{ accentColor: '#5B2D8E' }}
                    aria-label="동향 데이터 가중치"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: '#CCCCCC' }}>
                    <span>0%</span>
                    <span>30%</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
