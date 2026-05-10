import { useRef, useState } from 'react';
import { FileDown } from 'lucide-react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import DecisionSummary from './components/DecisionSummary';
import KpiHealthDashboard from './components/KpiHealthDashboard';
import ChartSection from './components/ChartSection';
import AiInsightSection from './components/AiInsightSection';
import ExperimentPlan from './components/ExperimentPlan';
import MeetingSummary from './components/MeetingSummary';
import type { AnalysisResult, AnalysisSettings, GameTestData, TrendAnalysisResult } from './types/gameTest';
import { DEFAULT_SETTINGS } from './types/gameTest';
import { analyzeGame } from './utils/analysisEngine';
import { generateGeminiTrendAnalysis } from './utils/aiEngine';
import { exportElementToPdf } from './utils/pdfExport';
import './index.css';

export default function App() {
  const [inputData, setInputData] = useState<GameTestData | null>(null);
  const [settings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!resultsRef.current || !result) return;
    setIsExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = (inputData?.gameName ?? 'game').replace(/[^a-zA-Z0-9가-힣_-]+/g, '_');
      await exportElementToPdf(resultsRef.current, `GameTestInsight_${safeName}_${stamp}.pdf`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? `PDF 생성 실패: ${error.message}` : 'PDF 생성 중 알 수 없는 오류');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputData) return;
    setIsLoading(true);
    setResult(null);
    setErrorMessage('');
    setLoadingStep('Raw data 검산 중');
    setLoadingProgress(5);
    try {
      const aiTrendData = await generateGeminiTrendAnalysis(trendData, (step, percent) => {
        setLoadingStep(step);
        setLoadingProgress(percent);
      });
      setTrendData(aiTrendData);
      setLoadingStep('Gemini 최종 의사결정 생성 중');
      setLoadingProgress(72);
      const next = await analyzeGame(inputData, settings, aiTrendData);
      setLoadingStep('실행 계획 정리 중');
      setLoadingProgress(95);
      setResult(next);
      setLoadingProgress(100);
      window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : 'Gemini 분석 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  return (
    <main>
      <Header />
      <InputPanel
        data={inputData}
        trendData={trendData}
        onChange={setInputData}
        onTrendDataChange={setTrendData}
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
        loadingStep={loadingStep}
      />
      {isLoading && (
        <div className="modal-backdrop">
          <div className="loading-modal">
            <p className="section-eyebrow">AI 분석 중</p>
            <h2>Gemini가 분석하고 있습니다</h2>
            <p className="loading-step-text">{loadingStep}</p>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }} />
              </div>
              <span className="progress-percent">{loadingProgress}%</span>
            </div>
            <p className="loading-hint">동향 데이터가 많을수록 분석에 시간이 걸립니다. 잠시 기다려 주세요.</p>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="modal-backdrop">
          <div className="error-modal">
            <div className="modal-head">
              <div>
                <p className="section-eyebrow">Gemini Error</p>
                <h2>AI 분석을 생성하지 못했습니다</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setErrorMessage('')}>×</button>
            </div>
            <p>{errorMessage}</p>
            <button className="primary-button" type="button" onClick={() => setErrorMessage('')}>확인</button>
          </div>
        </div>
      )}
      {result ? (
        <>
          <section className="page-shell pdf-action-bar">
            <button className="primary-button" type="button" onClick={handleDownloadPdf} disabled={isExporting}>
              <FileDown size={16} /> {isExporting ? 'PDF 생성 중...' : '분석 결과 PDF 다운로드'}
            </button>
            <span className="pdf-action-hint">회의/보고용으로 결과 전체를 PDF 한 파일로 저장합니다.</span>
          </section>
          <div id="results" ref={resultsRef} className="results-stack">
            <DecisionSummary result={result} />
            <KpiHealthDashboard kpiCards={result.kpiCards} />
            <ChartSection result={result} gameName={inputData?.gameName ?? '업로드 게임'} />
            <AiInsightSection insight={result.aiInsight} />
            <ExperimentPlan experiments={result.experimentPlan} />
            <MeetingSummary summaryKor={result.meetingSummaryKor} summaryEng={result.meetingSummary} />
          </div>
        </>
      ) : (
        <section className="page-shell">
          <div className="empty-panel strong">원본 지표 CSV를 업로드하면 분석 결과가 여기에 표시됩니다.</div>
        </section>
      )}
      <footer>Game Test Insight Copilot · Supercent AI Prototype</footer>
    </main>
  );
}
