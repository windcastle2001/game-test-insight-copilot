import type { RawDataParseResult, RawDataRow } from '../types/gameTest';

function parseNum(value: string | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value ?? '']));
}

function validateRawRows(rows: Record<string, string>[]): string[] {
  const warnings: string[] = [];
  const required = [
    'date',
    'campaign_name',
    'impressions',
    'clicks',
    'installs',
    'spend_usd',
    'dau',
    'new_users',
    'revenue_usd',
    'cohort_date',
    'd1_active_users',
    'd3_active_users',
    'd7_active_users',
  ];
  if (rows.length === 0) return ['Raw Data CSV에 분석할 행이 없습니다.'];
  const headers = Object.keys(normalizeRow(rows[0]));
  required.forEach((field) => {
    if (!headers.includes(field)) warnings.push(`필수 컬럼 누락: ${field}`);
  });

  const seenCohorts = new Set<string>();
  rows.map(normalizeRow).forEach((row, index) => {
    ['impressions', 'clicks', 'installs', 'spend_usd', 'dau', 'new_users', 'revenue_usd', 'd1_active_users', 'd3_active_users', 'd7_active_users'].forEach((field) => {
      if (row[field] !== undefined && row[field] !== '' && !Number.isFinite(Number.parseFloat(row[field]))) {
        warnings.push(`${index + 1}행: ${field} 숫자 파싱 실패 (${row[field]})`);
      }
    });
    const cohortKey = `${row.date}|${row.campaign_name}|${row.cohort_date}`;
    if (seenCohorts.has(cohortKey)) warnings.push(`${index + 1}행: 같은 date/campaign/cohort 조합이 중복되었습니다.`);
    seenCohorts.add(cohortKey);
  });
  return warnings.slice(0, 12);
}

export function parseRawDataCsv(rows: Record<string, string>[]): RawDataParseResult {
  const warnings = validateRawRows(rows);
  const parsed: RawDataRow[] = rows.map(normalizeRow).map((row) => ({
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
  }));

  const sum = (key: keyof RawDataRow) => parsed.reduce((total, row) => total + Number(row[key] || 0), 0);
  const impressions = sum('impressions');
  const clicks = sum('clicks');
  const installs = sum('installs');
  const spend = sum('spend_usd');
  const dau = sum('dau');
  const newUsers = sum('new_users');
  const revenue = sum('revenue_usd');
  const d1 = sum('d1_active_users');
  const d3 = sum('d3_active_users');
  const d7 = sum('d7_active_users');
  const day1Rows = parsed.filter((row) => row.date && row.date === row.cohort_date);
  const playtimeRows = day1Rows.length > 0 ? day1Rows : parsed;
  const avgPlaytime = playtimeRows.reduce((total, row) => total + row.avg_session_minutes, 0) / Math.max(playtimeRows.length, 1);

  return {
    rows: parsed,
    rowCount: parsed.length,
    campaigns: [...new Set(parsed.map((row) => row.campaign_name).filter(Boolean))],
    calculatedKpis: {
      cpi: installs > 0 ? Math.round((spend / installs) * 1000) / 1000 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      ipm: impressions > 0 ? Math.round((installs / (impressions / 1000)) * 10) / 10 : 0,
      d1Retention: newUsers > 0 ? Math.round((d1 / newUsers) * 1000) / 10 : 0,
      d3Retention: newUsers > 0 ? Math.round((d3 / newUsers) * 1000) / 10 : 0,
      d7Retention: newUsers > 0 ? Math.round((d7 / newUsers) * 1000) / 10 : 0,
      arpdau: dau > 0 ? Math.round((revenue / dau) * 10000) / 10000 : 0,
      day1Playtime: Math.round(avgPlaytime * 10) / 10,
    },
    warnings,
  };
}

export function generateRawDataTemplate(): string {
  return [
    'date,campaign_name,impressions,clicks,installs,spend_usd,dau,new_users,revenue_usd,ad_revenue_usd,iap_revenue_usd,avg_session_minutes,cohort_date,d1_active_users,d3_active_users,d7_active_users',
    ',,,,,,,,,,,,,,,',
  ].join('\n');
}

export function generateKpiTemplate(): string {
  return ['game_name,cpi,ctr,ipm,d1_retention,d3_retention,d7_retention,arpdau,day1_playtime', ',,,,,,,,'].join('\n');
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
