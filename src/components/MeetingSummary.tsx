import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface Props {
  summaryKor: string;
  summaryEng: string;
}

type Lang = 'kor' | 'eng';

export default function MeetingSummary({ summaryKor, summaryEng }: Props) {
  const [lang, setLang] = useState<Lang>('kor');
  const [copied, setCopied] = useState(false);

  const currentText = lang === 'kor' ? summaryKor : summaryEng;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = currentText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.section
      className="max-w-6xl mx-auto px-6 mb-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black" style={{ color: '#000000' }}>
          회의 요약문
          <span className="ml-2 text-sm font-normal" style={{ color: '#888888' }}>
            Meeting Summary
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {/* 언어 탭 */}
          <div
            className="flex rounded-full p-0.5 gap-0.5"
            style={{ backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0' }}
          >
            {(['kor', 'eng'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
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

          {/* 복사 버튼 */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              backgroundColor: copied ? '#f0fdf4' : '#000000',
              color: copied ? '#16a34a' : '#ffffff',
              border: copied ? '1.5px solid #86efac' : '1.5px solid transparent',
            }}
            aria-label="회의 요약문 클립보드 복사"
          >
            {copied ? (
              <>
                <Check size={13} />
                복사됨
              </>
            ) : (
              <>
                <Copy size={13} />
                복사
              </>
            )}
          </button>
        </div>
      </div>

      {/* 요약문 박스 */}
      <div
        className="rounded-[14px] p-6"
        style={{ backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}
      >
        <pre
          className="text-sm font-medium whitespace-pre-wrap leading-relaxed"
          style={{
            color: '#444444',
            fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
            lineHeight: '1.8',
          }}
        >
          {currentText}
        </pre>
      </div>

      <p className="text-xs mt-3 text-center" style={{ color: '#888888' }}>
        Slack, Notion, Google Docs에 붙여넣어 바로 사용하세요.
      </p>
    </motion.section>
  );
}
