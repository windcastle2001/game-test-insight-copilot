import { useState } from 'react';
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
import './index.css';

const loadingSteps = ['Raw data 검산 중', '동향 클러스터 반영 중', 'Gemini 분석 요청 중', '실행 계획 작성 중'];

export default function App() {
  const [inputData, setInputData] = useState<GameTestData | null>(null);
  const [settings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAnalyze = async () => {
    if (!inputData) return;
    setIsLoading(true);
    setResult(null);
    setErrorMessage('');
    try {
      for (const step of loadingSteps) {
        setLoadingStep(step);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      }
      const next = await analyzeGame(inputData, settings, trendData);
      setResult(next);
      window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : 'Gemini 분석 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <Header />
      <InputPanel
        data={inputData}
        onChange={setInputData}
        onTrendDataChange={setTrendData}
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
        loadingStep={loadingStep}
      />
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
        <div id="results" className="results-stack">
          <DecisionSummary result={result} />
          <KpiHealthDashboard kpiCards={result.kpiCards} />
          <ChartSection result={result} gameName={inputData?.gameName ?? '업로드 게임'} />
          <AiInsightSection insight={result.aiInsight} />
          <ExperimentPlan experiments={result.experimentPlan} />
          <MeetingSummary summaryKor={result.meetingSummaryKor} summaryEng={result.meetingSummary} />
        </div>
      ) : (
        <section className="page-shell">
          <div className="empty-panel strong">원본 지표 CSV를 업로드하면 분석 결과가 여기에 표시됩니다.</div>
        </section>
      )}
      <footer>Game Test Insight Copilot · Supercent AI Prototype</footer>
    </main>
  );
}
