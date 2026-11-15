import type { Company } from '@/data/types';
import { growthRate, last, num, pct, ratio } from './metrics';

export type Weights = { profitability: number; growth: number; balance: number; cash: number; valuation: number };
export const defaultWeights: Weights = { profitability: 25, growth: 25, balance: 20, cash: 20, valuation: 10 };
export const componentLabels: Record<keyof Weights, string> = {
  profitability: 'Profitability',
  growth: 'Growth',
  balance: 'Balance sheet',
  cash: 'Cash flow',
  valuation: 'Valuation',
};
export const componentKeys = Object.keys(componentLabels) as (keyof Weights)[];

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const scale = (v: number, zero: number, full: number) => clamp(((v - zero) / (full - zero)) * 100);

export type Score = { total: number; parts: Record<keyof Weights, number> };

/** Research score using data up to `back` financial years ago (0 = latest). Every input is a reported figure. */
export function scoreOf(c: Company, weights: Weights = defaultWeights, back = 0): Score {
  const roce = last(c.roce, back);
  const roe = last(c.roe, back);
  const profitability = scale((roce + roe) / 2, 5, 28);

  const span = Math.min(3, c.revenue.length - 1 - back);
  const rg = span > 0 ? growthRate(c.revenue, span, back) : null;
  const pg = span > 0 ? growthRate(c.profit, span, back) : null;
  const growth = (scale(rg ?? 0, 0, 28) + scale(pg ?? 0, 0, 32)) / 2;

  const de = last(c.debtToEquityHistory, back);
  const pledge = back === 0 ? c.pledged : c.pledgedPrev;
  const balance = clamp(scale(de, 1.8, 0) - pledge * 1.5);

  const fcf = c.freeCashFlow.slice(0, c.freeCashFlow.length - back);
  const positiveShare = fcf.filter((v) => v > 0).length / fcf.length;
  const p = last(c.profit, back);
  const conversion = p > 0 ? last(c.operatingCashFlow, back) / p : 0;
  const cash = clamp(positiveShare * 60 + scale(conversion, 0.4, 1.2) * 0.4);

  // Valuation uses today's price multiple against the company's own history; it is not re-stated for earlier years.
  const valuation = c.pe === null ? 25 : scale(c.pe / c.peMedian, 1.5, 0.7);

  const parts = { profitability, growth, balance, cash, valuation };
  const weightSum = componentKeys.reduce((s, k) => s + weights[k], 0) || 1;
  const total = componentKeys.reduce((s, k) => s + parts[k] * weights[k], 0) / weightSum;
  const rounded = Object.fromEntries(componentKeys.map((k) => [k, Math.round(parts[k])])) as Record<keyof Weights, number>;
  return { total: Math.round(total), parts: rounded };
}

export type Insight = { strengths: string[]; weaknesses: string[]; risks: string[] };

export function insightsOf(c: Company): Insight {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const risks: string[] = [];
  const roce = last(c.roce);
  const de = last(c.debtToEquityHistory);
  const rg = growthRate(c.revenue, 3);
  const pg = growthRate(c.profit, 3);
  const fcfYears = c.freeCashFlow.filter((v) => v > 0).length;
  const n = c.years.length;

  if (Math.min(...c.roce) >= 20) strengths.push(`Return on capital employed stayed above 20% in each of the last ${n} years (latest ${pct(roce)}).`);
  else if (roce >= 18) strengths.push(`Return on capital employed is ${pct(roce)} in the latest year.`);
  if (roce - c.roce[0] >= 4) strengths.push(`Return on capital employed improved from ${pct(c.roce[0])} to ${pct(roce)} over ${n} years.`);
  if (de <= 0.3) strengths.push(`Low borrowing: debt-to-equity is ${ratio(de, 2)}.`);
  if (fcfYears === n) strengths.push(`Free cash flow was positive in all ${n} years.`);
  if (rg !== null && rg >= 15) strengths.push(`Revenue grew ${pct(rg)} a year over three years.`);
  if (pg !== null && pg >= 18) strengths.push(`Net profit grew ${pct(pg)} a year over three years.`);
  if (c.pe !== null && c.pe < c.peMedian * 0.85) strengths.push(`Price-to-earnings of ${ratio(c.pe)} is below its own five-year median of ${ratio(c.peMedian)}.`);

  if (roce < 12) weaknesses.push(`Return on capital employed is modest at ${pct(roce)}.`);
  if (roce - c.roce[0] <= -4) weaknesses.push(`Return on capital employed fell from ${pct(c.roce[0])} to ${pct(roce)} over ${n} years.`);
  if (de > 0.8) weaknesses.push(`Borrowing is high: debt-to-equity is ${ratio(de, 2)}.`);
  if (fcfYears <= n - 2) weaknesses.push(`Free cash flow was negative in ${n - fcfYears} of the last ${n} years.`);
  if (rg !== null && rg < 6) weaknesses.push(`Revenue growth is slow at ${pct(rg)} a year over three years.`);
  if (last(c.profit) < last(c.profit, 1)) weaknesses.push(`Net profit fell in the latest year, from ₹${num(last(c.profit, 1))} crore to ₹${num(last(c.profit))} crore.`);
  if (c.pe !== null && c.pe > c.peMedian * 1.2) weaknesses.push(`Price-to-earnings of ${ratio(c.pe)} is above its own five-year median of ${ratio(c.peMedian)}.`);
  if (c.pe === null) weaknesses.push('The company reported a loss, so a price-to-earnings multiple is not available.');

  if (c.pledged > 0) risks.push(`Promoters have pledged ${pct(c.pledged)} of their holding${c.pledged > c.pledgedPrev ? `, up from ${pct(c.pledgedPrev)}` : ''}.`);
  if (c.interestCover !== null && c.interestCover < 3) risks.push(`Interest cover is thin at ${ratio(c.interestCover)} times.`);
  if (c.marketCapCr < 5000) risks.push('Small company size can mean low trading liquidity and wider price swings.');
  if (c.promoter < 40) risks.push(`Promoter holding is relatively low at ${pct(c.promoter)}.`);
  if (c.quarter.profitGrowth < 0) risks.push(`Latest quarter net profit fell ${pct(Math.abs(c.quarter.profitGrowth))} from a year earlier.`);
  if (c.pe !== null && c.pe > c.peMedian * 1.2) risks.push('A high valuation leaves less room for disappointment in future results.');
  if (risks.length === 0) risks.push('No specific risk flags from the reported numbers. General market and business risks still apply.');
  if (strengths.length === 0) strengths.push('No stand-out strengths in the reported numbers.');
  if (weaknesses.length === 0) weaknesses.push('No stand-out weaknesses in the reported numbers.');
  return { strengths, weaknesses, risks };
}

/** Plain-language explanation of how the score moved between the previous and latest financial year. */
export function scoreChange(c: Company, weights: Weights = defaultWeights) {
  const now = scoreOf(c, weights, 0);
  const before = scoreOf(c, weights, 1);
  const moves = componentKeys
    .map((k) => ({ key: k, label: componentLabels[k], from: before.parts[k], to: now.parts[k], diff: now.parts[k] - before.parts[k] }))
    .filter((m) => m.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return { now: now.total, before: before.total, diff: now.total - before.total, moves };
}
