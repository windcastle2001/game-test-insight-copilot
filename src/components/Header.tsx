export default function Header() {
  return (
    <header style={{ backgroundColor: '#000000' }} className="w-full px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src="/슈퍼센트 로고.jpg"
            alt="Supercent 로고"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <h1
              className="text-white text-2xl leading-tight"
              style={{ fontWeight: 900 }}
            >
              Game Test Insight Copilot
            </h1>
            <p style={{ color: '#FF1FA8' }} className="text-sm font-semibold mt-0.5">
              by Supercent
            </p>
          </div>
        </div>

        {/* 메인 카피 */}
        <div className="mb-6">
          <p className="text-white text-xl font-bold leading-snug mb-2">
            Turn soft launch metrics into clear publishing decisions.
          </p>
          <p style={{ color: '#888888' }} className="text-sm leading-relaxed">
            게임 테스트 데이터를 입력하면 AI가 KPI를 해석하고, 다음 액션까지 제안합니다.
          </p>
        </div>

        {/* 태그 배지 */}
        <div className="flex flex-wrap gap-2">
          {['AI Product Prototype', 'Soft Launch Analysis', 'Publishing Decision Support'].map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold px-3 py-1 rounded-full border"
              style={{
                color: '#F5C300',
                borderColor: 'rgba(245, 195, 0, 0.4)',
                backgroundColor: 'rgba(245, 195, 0, 0.08)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
