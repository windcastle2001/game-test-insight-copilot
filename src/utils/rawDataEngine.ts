import type { GameGenre, GameTestData, RawDataParseResult, RawDataRow } from '../types/gameTest';

function parseNum(value: string | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) ? n : 0;
}

function maybePercent(numerator: number, denominator: number): number | undefined {
  if (denominator <= 0) return undefined;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function maybeMoney(numerator: number, denominator: number): number | undefined {
  if (denominator <= 0) return undefined;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? '']));
}

function validateRawRows(rows: Record<string, string>[]): string[] {
  const warnings: string[] = [];
  const required = ['date', 'campaign_name', 'impressions', 'clicks', 'installs', 'spend_usd', 'dau', 'new_users', 'revenue_usd', 'cohort_date', 'd1_active_users', 'd3_active_users', 'd7_active_users'];
  const optionalNumeric = ['d14_active_users', 'd30_active_users', 'tutorial_starts', 'tutorial_completes', 'first_session_users', 'first_session_exits', 'ad_starts', 'ad_completes', 'store_page_views', 'store_installs'];
  if (rows.length === 0) return ['Raw Data CSV에 분석할 행이 없습니다.'];
  const headers = Object.keys(normalizeRow(rows[0]));
  required.forEach((field) => {
    if (!headers.includes(field)) warnings.push(`필수 컬럼 누락: ${field}`);
  });

  const seenCohorts = new Set<string>();
  rows.map(normalizeRow).forEach((row, index) => {
    [...required, ...optionalNumeric, 'ad_revenue_usd', 'iap_revenue_usd', 'avg_session_minutes'].forEach((field) => {
      if (row[field] !== undefined && row[field] !== '' && !Number.isFinite(Number.parseFloat(row[field]))) {
        warnings.push(`${index + 1}행: ${field} 숫자 파싱 실패 (${row[field]})`);
      }
    });
    const cohortKey = `${row.date}|${row.campaign_name}|${row.cohort_date}`;
    if (seenCohorts.has(cohortKey)) warnings.push(`${index + 1}행: 같은 date/campaign/cohort 조합이 중복되었습니다.`);
    seenCohorts.add(cohortKey);
  });
  return warnings.slice(0, 14);
}

function firstText(rows: Record<string, string>[], key: string): string {
  return rows.map(normalizeRow).map((row) => row[key]?.trim()).find(Boolean) ?? '';
}

function parseGenre(value: string): GameGenre | undefined {
  if (value === '하이퍼캐주얼' || value === '하이브리드캐주얼' || value === '캐주얼') return value;
  const lower = value.toLowerCase();
  if (lower.includes('hybrid')) return '하이브리드캐주얼';
  if (lower.includes('hyper')) return '하이퍼캐주얼';
  if (lower.includes('casual')) return '캐주얼';
  return undefined;
}

export function parseRawDataCsv(rows: Record<string, string>[]): RawDataParseResult {
  const warnings = validateRawRows(rows);
  const parsed: RawDataRow[] = rows.map(normalizeRow).map((row) => ({
    game_name: row.game_name ?? '',
    game_genre: row.game_genre ?? '',
    test_period: row.test_period ?? '',
    date: row.date ?? '',
    campaign_name: row.campaign_name ?? '',
    impressions: parseNum(row.impressions),
    clicks: parseNum(row.clicks),
    installs: parseNum(row.installs),
    spend_usd: parseNum(row.spend_usd),
    dau: parseNum(row.dau),
    new_users: parseNum(row.new_users),
    revenue_usd: parseNum(row.revenue_usd),
    ad_revenue_usd: parseNum(row.ad_revenue_usd),
    iap_revenue_usd: parseNum(row.iap_revenue_usd),
    avg_session_minutes: parseNum(row.avg_session_minutes),
    cohort_date: row.cohort_date ?? '',
    d1_active_users: parseNum(row.d1_active_users),
    d3_active_users: parseNum(row.d3_active_users),
    d7_active_users: parseNum(row.d7_active_users),
    d14_active_users: parseNum(row.d14_active_users),
    d30_active_users: parseNum(row.d30_active_users),
    tutorial_starts: parseNum(row.tutorial_starts),
    tutorial_completes: parseNum(row.tutorial_completes),
    first_session_users: parseNum(row.first_session_users),
    first_session_exits: parseNum(row.first_session_exits),
    ad_starts: parseNum(row.ad_starts),
    ad_completes: parseNum(row.ad_completes),
    store_page_views: parseNum(row.store_page_views),
    store_installs: parseNum(row.store_installs),
    trend_source: row.trend_source ?? row.source ?? '',
    trend_title: row.trend_title ?? row.title ?? '',
    trend_content: row.trend_content ?? row.content ?? row.review_content ?? '',
    trend_category: row.trend_category ?? row.category ?? '',
  }));

  const sum = (key: keyof RawDataRow) => parsed.reduce((total, row) => total + Number(row[key] || 0), 0);
  const impressions = sum('impressions');
  const clicks = sum('clicks');
  const installs = sum('installs');
  const spend = sum('spend_usd');
  const dau = sum('dau');
  const newUsers = sum('new_users');
  const revenue = sum('revenue_usd');
  const day1Rows = parsed.filter((row) => row.date && row.date === row.cohort_date);
  const playtimeRows = day1Rows.length > 0 ? day1Rows : parsed;
  const avgPlaytime = playtimeRows.reduce((total, row) => total + row.avg_session_minutes, 0) / Math.max(playtimeRows.length, 1);

  const optional: Partial<GameTestData> = {
    d0TutorialCompletion: maybePercent(sum('tutorial_completes'), sum('tutorial_starts')),
    firstSessionDropoff: maybePercent(sum('first_session_exits'), sum('first_session_users')),
    adWatchCompletion: maybePercent(sum('ad_completes'), sum('ad_starts')),
    storeConversion: maybePercent(sum('store_installs'), sum('store_page_views')),
    d14Retention: maybePercent(sum('d14_active_users'), newUsers),
    d30Retention: maybePercent(sum('d30_active_users'), newUsers),
    roas: maybePercent(revenue, spend),
    ltv: maybeMoney(revenue, newUsers),
  };
  Object.keys(optional).forEach((key) => {
    if (optional[key as keyof GameTestData] === undefined) delete optional[key as keyof GameTestData];
  });

  return {
    rows: parsed,
    rowCount: parsed.length,
    campaigns: [...new Set(parsed.map((row) => row.campaign_name).filter(Boolean))],
    gameName: firstText(rows, 'game_name'),
    gameGenre: parseGenre(firstText(rows, 'game_genre')),
    testPeriod: firstText(rows, 'test_period'),
    calculatedKpis: {
      cpi: installs > 0 ? Math.round((spend / installs) * 1000) / 1000 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      ipm: impressions > 0 ? Math.round((installs / (impressions / 1000)) * 10) / 10 : 0,
      d1Retention: maybePercent(sum('d1_active_users'), newUsers) ?? 0,
      d3Retention: maybePercent(sum('d3_active_users'), newUsers) ?? 0,
      d7Retention: maybePercent(sum('d7_active_users'), newUsers) ?? 0,
      arpdau: dau > 0 ? Math.round((revenue / dau) * 10000) / 10000 : 0,
      day1Playtime: Math.round(avgPlaytime * 10) / 10,
      ...optional,
    },
    warnings,
  };
}

export function generateRawDataTemplate(): string {
  return [
    'game_name,game_genre,test_period,date,campaign_name,impressions,clicks,installs,spend_usd,dau,new_users,revenue_usd,ad_revenue_usd,iap_revenue_usd,avg_session_minutes,cohort_date,d1_active_users,d3_active_users,d7_active_users,d14_active_users,d30_active_users,tutorial_starts,tutorial_completes,first_session_users,first_session_exits,ad_starts,ad_completes,store_page_views,store_installs,trend_source,trend_title,trend_content,trend_category',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
  ].join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
