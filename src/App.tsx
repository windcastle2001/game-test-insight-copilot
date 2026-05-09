import { useState } from 'react';
import './index.css';

import Header from './components/Header';
import InputPanel from './components/InputPanel';
import TrendAnalysis from './components/TrendAnalysis';
import DecisionSummary from './components/DecisionSummary';
import KpiHealthDashboard from './components/KpiHealthDashboard';
import ChartSection from './components/ChartSection';
import AiInsightSection from './components/AiInsightSection';
import ExperimentPlan from './components/ExperimentPlan';
import MeetingSummary from './components/MeetingSummary';

import type { GameTestData, AnalysisResult, AnalysisSettings, TrendAnalysisResult } from './types/gameTest';
import { DEFAULT_SETTINGS } from './types/gameTest';
import { analyzeGame } from './utils/analysisEngine';
import { sampleGames } from './data/sampleGames';

const LOADING_STEPS = [
  'KPI 데이터 분석 중...',
  '시장성 점수 계산 중...',
  '리텐션 곡선 분석 중...',
  'AI 인사이트 생성 중...',
  '실험 계획 수립 중...',
  '회의 요약문 작성 중...',
];

const defaultData: GameTestData = sampleGames[0].data;

function Divider() {
  return (
    <div className="max-w-6xl mx-auto px-6 my-2">
      <div style={{ height: '1px', backgroundColor: '#E0E0E0' }} />
    </div>
  );
}

export default function App() {
  const [inputData, setInputData]   = useState<GameTestData>(defaultData);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [settings, setSettings]     = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [trendData, setTrendData]   = useState<TrendAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResult(null);

    for (let i = 0; i < LOADING_STEPS.length; i++) {
      setLoadingStep(LOADING_STEPS[i]);
      await new Promise((r) => setTimeout(r, 380));
    }

    const analysisResult = await analyzeGame(inputData, settings, trendData);
    setResult(analysisResult);
    setIsLoading(false);

    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <Header />

      {/* 입력 패널 */}
      <InputPanel
        data={inputData}
        onChange={setInputData}
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
        loadingStep={loadingStep}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* 동향 분석 섹션 */}
      <TrendAnalysis onTrendDataChange={setTrendData} />

      {/* 결과 섹션 */}
      {result && (
        <div id="results">
          <Divider />

          <div className="pt-6">
            <DecisionSummary result={result} />
          </div>

          <Divider />

          <div className="pt-6">
            <KpiHealthDashboard kpiCards={result.kpiCards} />
          </div>

          <Divider />

          <div className="pt-6">
            <ChartSection result={result} gameName={inputData.gameName} />
          </div>

          <Divider />

          <div className="pt-6">
            <AiInsightSection insight={result.aiInsight} />
          </div>

          <Divider />

          <div className="pt-6">
            <ExperimentPlan experiments={result.experimentPlan} />
          </div>

          <Divider />

          <div className="pt-6">
            <MeetingSummary
              summaryKor={result.meetingSummaryKor}
              summaryEng={result.meetingSummary}
            />
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!result && !isLoading && (
        <div className="max-w-6xl mx-auto px-6 pb-16 text-center">
          <div
            className="rounded-[14px] p-10"
            style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
          >
            <p className="text-4xl mb-4" aria-hidden>📊</p>
            <p className="text-base font-bold mb-1" style={{ color: '#000000' }}>
              분석 결과가 여기에 표시됩니다
            </p>
            <p className="text-sm" style={{ color: '#888888' }}>
              위에서 샘플 게임을 선택하거나 KPI를 입력한 후
              <br />
              "AI 인사이트 생성" 버튼을 눌러주세요.
            </p>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer
        className="text-center py-6 text-xs mt-8"
        style={{ color: '#888888', borderTop: '1px solid #E0E0E0', backgroundColor: '#ffffff' }}
      >
        <p>Game Test Insight Copilot — Supercent AI Prototype</p>
        <p className="mt-1" style={{ color: '#CCCCCC' }}>
          * 본 프로토타입의 벤치마크 기준은 실제 업계 절대 기준과 다를 수 있습니다.
        </p>
      </footer>
    </div>
  );
}
