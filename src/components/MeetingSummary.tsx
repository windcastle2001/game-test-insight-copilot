import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  summaryKor: string;
  summaryEng: string;
}

export default function MeetingSummary({ summaryKor }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(summaryKor);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="page-shell">
      <div className="section-heading compact">
        <p className="section-eyebrow">회의 요약문</p>
        <h2>공유용 리포트</h2>
      </div>
      <button className="copy-button" onClick={copy} type="button">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '복사됨' : '복사'}</button>
      <pre className="summary-box">{summaryKor}</pre>
    </section>
  );
}
