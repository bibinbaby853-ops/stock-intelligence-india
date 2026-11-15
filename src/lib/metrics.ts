import type { Company } from '@/data/types';

export const last = <T,>(arr: T[], back = 0): T => arr[arr.length - 1 - back];

/** Compound annual growth in percent over `n` years ending `back` years ago. Null when the base is not positive. */
export function growthRate(arr: number[], n: number, back = 0): number | null {
  const end = arr[arr.length - 1 - back];
  const start = arr[arr.length - 1 - back - n];
  if (start === undefined || end === undefined || start <= 0 || end <= 0) return null;
  return (Math.pow(end / start, 1 / n) - 1) * 100;
}

export const yearGrowth = (arr: number[], back = 0): number | null => growthRate(arr, 1, back);

export type Segment = 'Large-cap' | 'Mid-cap' | 'Small-cap' | 'Micro-cap';
export const segments: Segment[] = ['Large-cap', 'Mid-cap', 'Small-cap', 'Micro-cap'];

/**
 * Market capitalisation bands in crore rupees. The official classification ranks the whole market
 * (first 100 large, next 150 mid); these bands approximate it until the full universe is loaded.
 */
export function segmentOf(c: Company): Segment {
  if (c.marketCapCr >= 100000) return 'Large-cap';
  if (c.marketCapCr >= 30000) return 'Mid-cap';
  if (c.marketCapCr >= 5000) return 'Small-cap';
  return 'Micro-cap';
}

export const debtToEquity = (c: Company, back = 0) => last(c.debtToEquityHistory, back);
export const revenueGrowth3 = (c: Company) => growthRate(c.revenue, 3);
export const profitGrowth3 = (c: Company) => growthRate(c.profit, 3);
export function peg(c: Company): number | null {
  const g = profitGrowth3(c);
  if (c.pe === null || g === null || g <= 0) return null;
  return c.pe / g;
}
export const positiveFcfYears = (c: Company) => c.freeCashFlow.filter((v) => v > 0).length;
export function cashConversion(c: Company): number | null {
  const p = last(c.profit);
  return p > 0 ? last(c.operatingCashFlow) / p : null;
}

// ---------- formatting ----------
function group(n: number): string {
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return s;
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${s.slice(-3)}`;
}
export function num(n: number, decimals = 0): string {
  const sign = n < 0 ? '−' : '';
  if (decimals === 0) return sign + group(n);
  const fixed = Math.abs(n).toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  return `${sign}${group(Number(whole))}.${frac}`;
}
export const rupees = (n: number, decimals = 2) => `₹${num(n, decimals)}`;
export const crore = (n: number) => `₹${num(n)} crore`;
export const pct = (n: number | null, decimals = 1) => (n === null ? 'Not available' : `${num(n, decimals)}%`);
export const signedPct = (n: number, decimals = 2) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(decimals)}%`;
export const ratio = (n: number | null, decimals = 1) => (n === null ? 'Not available' : num(n, decimals));

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000);
}
