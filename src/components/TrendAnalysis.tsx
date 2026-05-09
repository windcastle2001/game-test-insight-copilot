import { useRef, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Download, Upload } from 'lucide-react';
import type { TrendAnalysisResult } from '../types/gameTest';
import { downloadCsv } from '../utils/rawDataEngine';
import { analyzeTrendData, generateTrendCsvTemplate, generateTrendSampleCsv, parseTrendCsvRows } from '../utils/trendEngine';

interface Props {
  onTrendDataChange: (data: TrendAnalysisResult | null) => void;
}

export default function TrendAnalysis({ onTrendDataChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<TrendAnalysisResult | null>(null);
  const [applyToAnalysis, setApplyToAnalysis] = useState(true);
  const [weight, setWeight] = useState(15);
  const [uploadedRows, setUploadedRows] = useState<Record<string, string>[] | null>(null);

  const runAnalysis = (rows: Record<string, string>[], nextWeight = weight, nextApply = applyToAnalysis) => {
    const parsed = parseTrendCsvRows(rows);
    const next = analyzeTrendData(parsed.rows, nextWeight, nextApply, parsed.warnings);
    setResult(next);
    onTrendDataChange(next.applyToAnalysis ? next : null);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        const nextRows = rows as Record<string, string>[];
        setUploadedRows(nextRows);
        runAnalysis(nextRows);
      },
    });
    event.target.value = '';
  };

  const updateApply = (checked: boolean) => {
    setApplyToAnalysis(checked);
    if (uploadedRows) runAnalysis(uploadedRows, weight, checked);
    else if (result) onTrendDataChange(checked ? result : null);
  };

  const updateWeight = (nextWeight: number) => {
    setWeight(nextWeight);
    if (uploadedRows) runAnalysis(uploadedRows, nextWeight, applyToAnalysis);
  };

  return (
    <section className="page-shell trend-section">
      <div className="section-heading">
        <p className="section-eyebrow">동향 분석</p>
        <h2>정돈되지 않은 리뷰도 유사 반응으로 묶기</h2>
        <p>샘플을 넣자마자 결과가 나오는 이유는 AI API 호출이 아니라 브라우저 내부의 로컬 텍스트 벡터 계산이기 때문입니다.</p>
      </div>

      <div className="trend-upload">
        <div>
          <strong>동향 CSV</strong>
          <p>필수 컬럼: date, source, title, content, category</p>
        </div>
        <div className="button-row">
          <button className="outline-button" type="button" onClick={() => downloadCsv(generateTrendCsvTemplate(), 'trend_template.csv')}><Download size={15} /> 빈 양식</button>
          <button className="outline-button" type="button" onClick={() => downloadCsv(generateTrendSampleCsv(), 'trend_sample_50.csv')}><Download size={15} /> 날것 리뷰 50건</button>
          <button className="primary-button" type="button" onClick={() => fileRef.current?.click()}><Upload size={15} /> CSV 업로드</button>
          <input ref={fileRef} type="file" accept=".csv" onChange={upload} hidden />
        </div>
      </div>

      {result ? (
        <div className="trend-result">
          <div className="trend-summary">
            <strong>총 {result.totalCount}건</strong>
            <span>{result.dateRange.from} ~ {result.dateRange.to}</span>
            <span>신뢰도 보정 {result.confidenceAdjustment > 0 ? '+' : ''}{result.confidenceAdjustment}%p</span>
          </div>
          <p className="method-note">{result.methodDescription}</p>
          {result.warnings.length > 0 && (
            <div className="warning-box">
              {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
          <div className="tag-cloud">
            {result.tagSummary.slice(0, 8).map((item) => <span key={item.tag}>{item.tag} {item.count}</span>)}
          </div>
          <div className="cluster-list">
            {result.clusters.map((cluster) => (
              <div className="cluster-row" key={cluster.name}>
                <div>
                  <strong>{cluster.name}</strong>
                  <span>{cluster.count}건 · 부정 {cluster.sentimentRatio}% · 유사도 {cluster.averageSimilarity}%</span>
                  <small>{cluster.tags.join(', ')}</small>
                </div>
                <div className="cluster-bar"><span style={{ width: `${Math.min(cluster.sentimentRatio, 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="insight-list">
            {result.topInsights.map((item) => <p key={item}>{item}</p>)}
          </div>
          <div className="trend-controls">
            <label><input type="checkbox" checked={applyToAnalysis} onChange={(event) => updateApply(event.target.checked)} /> 최종 분석 신뢰도와 AI 인사이트에 반영</label>
            <label>반영 강도 {weight}%<input type="range" min={0} max={30} step={5} value={weight} onChange={(event) => updateWeight(Number(event.target.value))} /></label>
          </div>
        </div>
      ) : (
        <div className="empty-panel">동향 CSV를 업로드하면 유사 반응 클러스터와 다중 이슈 태그가 여기에 표시됩니다.</div>
      )}
    </section>
  );
}
