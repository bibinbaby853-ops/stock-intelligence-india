import { companies } from '@/data';
import type { Company } from '@/data/types';
import { cashConversion, debtToEquity, growthRate, last, positiveFcfYears, revenueGrowth3, segmentOf } from './metrics';
import { scoreOf, type Weights } from './score';

export type Category = { id: string; title: string; rule: string; test: (c: Company, w: Weights) => boolean };

const rising = (arr: number[], steps: number) => {
  for (let i = arr.length - steps; i < arr.length; i++) if (!(arr[i] > arr[i - 1])) return false;
  return true;
};

function topGrowthSectors(): string[] {
  const bySector = new Map<string, number[]>();
  for (const c of companies) {
    const g = revenueGrowth3(c);
    if (g === null) continue;
    bySector.set(c.sector, [...(bySector.get(c.sector) ?? []), g]);
  }
  const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  return [...bySector.entries()]
    .map(([s, v]) => [s, median(v)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([s]) => s);
}
export const highGrowthSectors = topGrowthSectors();

export const categories: Category[] = [
  {
    id: 'quality',
    title: 'Quality Compounders',
    rule: 'Return on capital employed of at least 20% in every year, debt-to-equity below 0.5 and profit growing more than 12% a year.',
    test: (c) => Math.min(...c.roce) >= 20 && debtToEquity(c) < 0.5 && (growthRate(c.profit, c.profit.length - 1) ?? 0) > 12,
  },
  {
    id: 'emerging',
    title: 'Emerging Growth Companies',
    rule: 'Revenue growing more than 20% a year over three years, with market capitalisation below ₹30,000 crore.',
    test: (c) => (revenueGrowth3(c) ?? 0) > 20 && c.marketCapCr < 30000,
  },
  {
    id: 'undervalued',
    title: 'Undervalued Companies',
    rule: 'Price-to-earnings at least 15% below the company’s own five-year median, with return on capital employed above 15%.',
    test: (c) => c.pe !== null && c.pe < c.peMedian * 0.85 && last(c.roce) > 15,
  },
  {
    id: 'smallcap',
    title: 'Small-Cap Opportunities',
    rule: 'Small-cap and micro-cap companies with a research score of 65 or more.',
    test: (c, w) => ['Small-cap', 'Micro-cap'].includes(segmentOf(c)) && scoreOf(c, w).total >= 65,
  },
  {
    id: 'turnaround',
    title: 'Financial Turnarounds',
    rule: 'A loss or very low return three or more years ago, profit now rising for two years, and debt-to-equity falling.',
    test: (c) => (c.profit[0] <= 0 || c.roce[0] < 7) && rising(c.profit, 2) && last(c.profit) > 0 && debtToEquity(c) < c.debtToEquityHistory[0],
  },
  {
    id: 'cash',
    title: 'Consistent Cash Generators',
    rule: 'Positive free cash flow in every year, and operating cash flow of at least 90% of net profit.',
    test: (c) => positiveFcfYears(c) === c.years.length && (cashConversion(c) ?? 0) >= 0.9,
  },
  {
    id: 'improving',
    title: 'Improving Fundamentals',
    rule: 'Return on capital employed rising for three years in a row, with debt-to-equity not increasing.',
    test: (c) => rising(c.roce, 3) && debtToEquity(c) <= debtToEquity(c, 3),
  },
  {
    id: 'sectors',
    title: 'High-Growth Sectors',
    rule: 'Companies in the two sectors with the fastest median three-year revenue growth in the database.',
    test: (c) => highGrowthSectors.includes(c.sector),
  },
];

export const getCategory = (id: string | undefined) => categories.find((c) => c.id === id);

export function membersOf(cat: Category, w: Weights): Company[] {
  return companies.filter((c) => cat.test(c, w)).sort((a, b) => scoreOf(b, w).total - scoreOf(a, w).total);
}

export function categoriesFor(c: Company, w: Weights): Category[] {
  return categories.filter((cat) => cat.test(c, w));
}
