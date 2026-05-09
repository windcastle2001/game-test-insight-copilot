/**
 * rawDataEngine.ts
 * Raw 캠페인 데이터 CSV를 파싱하고 KPI를 자동 계산합니다.
 */

import type { RawDataRow, RawDataParseResult } from '../types/gameTest';

function parseNum(val: string | undefined): number {
  if (val === undefined || val === '') return 0;
  const n = parseFloat(val.trim());
  return isNaN(n) ? 0 : n;
}

export function parseRawDataCsv(rows: Record<string, string>[]): RawDataParseResult {
  const parsed: RawDataRow[] = rows.map((row) => ({
    date:               row.date ?? '',
    campaign_name:      row.campaign_name ?? '',
    impressions:        parseNum(row.impressions),
    clicks:             parseNum(row.clicks),
    installs:           parseNum(row.installs),
    spend_usd:          parseNum(row.spend_usd),
    dau:                parseNum(row.dau),
    new_users:          parseNum(row.new_users),
    revenue_usd:        parseNum(row.revenue_usd),
    ad_revenue_usd:     parseNum(row.ad_revenue_usd),
    iap_revenue_usd:    parseNum(row.iap_revenue_usd),
    avg_session_minutes: parseNum(row.avg_session_minutes),
    cohort_date:        row.cohort_date ?? '',
    d1_active_users:    parseNum(row.d1_active_users),
    d3_active_users:    parseNum(row.d3_active_users),
    d7_active_users:    parseNum(row.d7_active_users),
  }));

  const totalImpressions = parsed.reduce((s, r) => s + r.impressions, 0);
  const totalClicks      = parsed.reduce((s, r) => s + r.clicks, 0);
  const totalInstalls    = parsed.reduce((s, r) => s + r.installs, 0);
  const totalSpend       = parsed.reduce((s, r) => s + r.spend_usd, 0);
  const totalDau         = parsed.reduce((s, r) => s + r.dau, 0);
  const totalNewUsers    = parsed.reduce((s, r) => s + r.new_users, 0);
  const totalRevenue     = parsed.reduce((s, r) => s + r.revenue_usd, 0);
  const totalD1          = parsed.reduce((s, r) => s + r.d1_active_users, 0);
  const totalD3          = parsed.reduce((s, r) => s + r.d3_active_users, 0);
  const totalD7          = parsed.reduce((s, r) => s + r.d7_active_users, 0);

  // Day1 playtime: 첫날(코호트 기준) 행들의 평균 세션 시간
  const day1Rows = parsed.filter((r) => r.cohort_date && r.cohort_date === r.date);
  const day1Playtime = day1Rows.length > 0
    ? day1Rows.reduce((s, r) => s + r.avg_session_minutes, 0) / day1Rows.length
    : parsed.reduce((s, r) => s + r.avg_session_minutes, 0) / Math.max(parsed.length, 1);

  const calculatedKpis = {
    cpi:          totalInstalls > 0 ? Math.round((totalSpend / totalInstalls) * 1000) / 1000 : 0,
    ctr:          totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
    ipm:          totalImpressions > 0 ? Math.round((totalInstalls / (totalImpressions / 1000)) * 10) / 10 : 0,
    d1Retention:  totalNewUsers > 0 ? Math.round((totalD1 / totalNewUsers) * 1000) / 10 : 0,
    d3Retention:  totalNewUsers > 0 ? Math.round((totalD3 / totalNewUsers) * 1000) / 10 : 0,
    d7Retention:  totalNewUsers > 0 ? Math.round((totalD7 / totalNewUsers) * 1000) / 10 : 0,
    arpdau:       totalDau > 0 ? Math.round((totalRevenue / totalDau) * 10000) / 10000 : 0,
    day1Playtime: Math.round(day1Playtime * 10) / 10,
  };

  const campaigns = [...new Set(parsed.map((r) => r.campaign_name).filter(Boolean))];

  return {
    rows: parsed,
    rowCount: parsed.length,
    campaigns,
    calculatedKpis,
  };
}

export function generateRawDataTemplate(): string {
  return [
    'date,campaign_name,impressions,clicks,installs,spend_usd,dau,new_users,revenue_usd,ad_revenue_usd,iap_revenue_usd,avg_session_minutes,cohort_date,d1_active_users,d3_active_users,d7_active_users',
    '2026-04-01,Campaign A,100000,2800,320,140.5,850,320,18.5,14.2,4.3,7.8,2026-04-01,112,48,22',
    '2026-04-02,Campaign B,85000,2100,245,112.0,920,245,22.1,16.8,5.3,8.2,2026-04-02,88,38,19',
    '2026-04-03,Campaign A,92000,2450,290,128.0,980,290,19.8,15.1,4.7,7.5,2026-04-03,101,44,20',
  ].join('\n');
}

export function generateKpiTemplate(): string {
  return [
    'game_name,cpi,ctr,ipm,d1_retention,d3_retention,d7_retention,arpdau,day1_playtime',
    'My Casual Game,0.45,2.1,28,32,14,6,0.025,6.5',
  ].join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
