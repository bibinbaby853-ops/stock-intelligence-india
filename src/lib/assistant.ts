import { companies, meta } from '@/data';
import type { Company } from '@/data/types';
import { cashConversion, crore, debtToEquity, growthRate, last, pct, positiveFcfYears, ratio, segmentOf, segments, yearGrowth, type Segment } from './metrics';
import { scoreChange, scoreOf, type Weights } from './score';

export type Answer = {
  facts: string[];
  rows: { symbol: string; name: string; detail: string }[];
  interpretations: string[];
  sources: string[];
};

export const suggestedQuestions = [
  'Which companies have improving return on capital employed?',
  'Which small-cap companies have consistent profit growth?',
  'Which companies have low debt and strong cash flow?',
  'Which companies have accelerating revenue growth?',
  'Which companies have deteriorating fundamentals?',
];

const rising = (arr: number[], steps: number) => {
  for (let i = arr.length - steps; i < arr.length; i++) if (!(arr[i] > arr[i - 1])) return false;
  return true;
};

function mentioned(q: string): Company[] {
  const found = companies
    .map((c) => {
      const names = [c.shortName.toLowerCase(), c.symbol.toLowerCase()];
      const first = c.shortName.toLowerCase().split(' ')[0];
      let at = -1;
      for (const n of names) if (at < 0) at = q.indexOf(n);
      const weak = at < 0 ? q.indexOf(first) : -1;
      return { c, at, weak };
    });
  const strong = found.filter((f) => f.at >= 0).sort((a, b) => a.at - b.at).map((f) => f.c);
  if (strong.length) return strong;
  // Fall back to the first word of the company name only when it identifies exactly one company per mention.
  const weak = found.filter((f) => f.weak >= 0);
  const byWord = new Map<string, Company[]>();
  for (const f of weak) {
    const w = f.c.shortName.toLowerCase().split(' ')[0];
    byWord.set(w, [...(byWord.get(w) ?? []), f.c]);
  }
  return [...byWord.values()].filter((v) => v.length === 1).map((v) => v[0]);
}

function segmentFilter(q: string): Segment | null {
  for (const s of segments) {
    const word = s.toLowerCase().replace('-cap', '');
    if (q.includes(`${word}-cap`) || q.includes(`${word} cap`) || q.includes(`${word}cap`)) return s;
  }
  return null;
}

const list = (cs: Company[], detail: (c: Company) => string, limit = 8) =>
  cs.slice(0, limit).map((c) => ({ symbol: c.symbol, name: c.shortName, detail: detail(c) }));

export function answer(question: string, weights: Weights): Answer {
  const q = question.toLowerCase();
  const seg = segmentFilter(q);
  const pool = seg ? companies.filter((c) => segmentOf(c) === seg) : companies;
  const scope = seg ? `${seg.toLowerCase()} companies` : 'companies';
  const sources = [...meta.sources, `Data as of ${meta.priceAsOf}`];
  const byScore = (a: Company, b: Company) => scoreOf(b, weights).total - scoreOf(a, weights).total;
  const named = mentioned(q);

  if ((q.includes('compare') || q.includes(' versus ') || q.includes(' vs ')) && named.length >= 2) {
    const [a, b] = named;
    const line = (label: string, f: (c: Company) => string) => `${label}: ${a.shortName} ${f(a)}, ${b.shortName} ${f(b)}.`;
    const sa = scoreOf(a, weights).total;
    const sb = scoreOf(b, weights).total;
    return {
      facts: [
        line('Market capitalisation', (c) => crore(c.marketCapCr)),
        line('Return on capital employed', (c) => pct(last(c.roce))),
        line('Three-year revenue growth a year', (c) => pct(growthRate(c.revenue, 3))),
        line('Three-year profit growth a year', (c) => pct(growthRate(c.profit, 3))),
        line('Debt-to-equity', (c) => ratio(debtToEquity(c), 2)),
        line('Price-to-earnings', (c) => ratio(c.pe)),
        line('Research score', (c) => `${scoreOf(c, weights).total} of 100`),
      ],
      rows: list([a, b], (c) => `Score ${scoreOf(c, weights).total} · ${segmentOf(c)}`),
      interpretations: [
        sa === sb
          ? 'The two companies score the same overall, so the choice depends on which factors matter more to you.'
          : `${(sa > sb ? a : b).shortName} scores higher overall on reported fundamentals. A higher score describes past reported numbers and does not predict returns.`,
      ],
      sources,
    };
  }

  if ((q.includes('score') && (q.includes('why') || q.includes('chang') || q.includes('explain'))) && named.length >= 1) {
    const c = named[0];
    const ch = scoreChange(c, weights);
    return {
      facts: [
        `${c.shortName}: research score is ${ch.now} of 100 using financial year ${last(c.years)} data, against ${ch.before} using financial year ${last(c.years, 1)} data.`,
        ...ch.moves.map((m) => `${m.label} moved from ${m.from} to ${m.to}.`),
      ],
      rows: list([c], () => `Score ${ch.now}, ${ch.diff >= 0 ? 'up' : 'down'} ${Math.abs(ch.diff)}`),
      interpretations: [
        ch.moves.length
          ? `The largest driver was ${ch.moves[0].label.toLowerCase()}. Valuation is measured at today’s price in both years, so it does not contribute to the change.`
          : 'No component changed between the two years.',
      ],
      sources,
    };
  }

  if ((q.includes('quarter') || q.includes('result')) && named.length >= 1) {
    const c = named[0];
    const qr = c.quarter;
    return {
      facts: [
        `${c.shortName}, ${qr.label}: revenue ${crore(qr.revenue)}, ${qr.revenueGrowth >= 0 ? 'up' : 'down'} ${pct(Math.abs(qr.revenueGrowth))} from a year earlier.`,
        `Net profit ${crore(qr.profit)}, ${qr.profitGrowth >= 0 ? 'up' : 'down'} ${pct(Math.abs(qr.profitGrowth))} from a year earlier.`,
      ],
      rows: list([c], () => qr.label),
      interpretations: [
        qr.profitGrowth > qr.revenueGrowth
          ? 'Profit grew faster than revenue, which points to wider margins in the quarter.'
          : 'Profit grew more slowly than revenue, which points to narrower margins in the quarter.',
      ],
      sources,
    };
  }

  if (q.includes('deteriorat') || q.includes('worsen') || q.includes('declining fundamentals')) {
    const hits = pool.filter((c) => last(c.roce) < last(c.roce, 2) - 2 && (debtToEquity(c) > debtToEquity(c, 2) || last(c.profit) < last(c.profit, 1)));
    hits.sort((a, b) => last(a.roce) - last(a.roce, 2) - (last(b.roce) - last(b.roce, 2)));
    return {
      facts: [`${hits.length} ${scope} show return on capital employed falling by more than 2 percentage points over two years together with rising debt or falling profit.`],
      rows: list(hits, (c) => `Return on capital ${pct(last(c.roce, 2))} → ${pct(last(c.roce))} · Debt-to-equity ${ratio(debtToEquity(c, 2), 2)} → ${ratio(debtToEquity(c), 2)}`),
      interpretations: ['Falling returns alongside rising debt usually mean the business is earning less on each rupee invested while relying more on borrowing.'],
      sources,
    };
  }

  if (q.includes('accelerat')) {
    const hits = pool.filter((c) => {
      const g0 = yearGrowth(c.revenue, 0), g1 = yearGrowth(c.revenue, 1), g2 = yearGrowth(c.revenue, 2);
      return g0 !== null && g1 !== null && g2 !== null && g0 > g1 && g1 > g2;
    });
    hits.sort((a, b) => (yearGrowth(b.revenue) ?? 0) - (yearGrowth(a.revenue) ?? 0));
    return {
      facts: [`${hits.length} ${scope} show revenue growth speeding up in each of the last two years.`],
      rows: list(hits, (c) => `Yearly revenue growth ${pct(yearGrowth(c.revenue, 2))} → ${pct(yearGrowth(c.revenue, 1))} → ${pct(yearGrowth(c.revenue))}`),
      interpretations: ['Accelerating revenue can signal rising demand or new capacity, but it needs checking against margins and cash flow.'],
      sources,
    };
  }

  if (q.includes('debt') || q.includes('cash')) {
    const hits = pool.filter((c) => debtToEquity(c) < 0.3 && positiveFcfYears(c) === c.years.length && (cashConversion(c) ?? 0) >= 0.9).sort(byScore);
    return {
      facts: [`${hits.length} ${scope} have debt-to-equity below 0.3, positive free cash flow in every year and operating cash flow of at least 90% of net profit.`],
      rows: list(hits, (c) => `Debt-to-equity ${ratio(debtToEquity(c), 2)} · Cash conversion ${pct((cashConversion(c) ?? 0) * 100, 0)}`),
      interpretations: ['Low debt with steady cash generation gives a company room to fund growth internally.'],
      sources,
    };
  }

  if (q.includes('profit')) {
    const hits = pool.filter((c) => rising(c.profit, c.profit.length - 1) && c.profit[0] > 0).sort((a, b) => (growthRate(b.profit, 3) ?? 0) - (growthRate(a.profit, 3) ?? 0));
    return {
      facts: [`${hits.length} ${scope} increased net profit in every year of the last ${companies[0]?.years.length ?? 5}.`],
      rows: list(hits, (c) => `Profit growth ${pct(growthRate(c.profit, 3))} a year over three years`),
      interpretations: ['Unbroken profit growth is a sign of consistency. It says nothing by itself about whether the price is reasonable.'],
      sources,
    };
  }

  if (q.includes('roce') || q.includes('return on capital')) {
    const hits = pool.filter((c) => rising(c.roce, 3)).sort((a, b) => last(b.roce) - last(b.roce, 3) - (last(a.roce) - last(a.roce, 3)));
    return {
      facts: [`${hits.length} ${scope} show return on capital employed rising for three years in a row.`],
      rows: list(hits, (c) => `${pct(last(c.roce, 3))} → ${pct(last(c.roce))} · Debt-to-equity ${ratio(debtToEquity(c), 2)}`),
      interpretations: ['A rising return on capital employed means the business is earning more on each rupee invested.'],
      sources,
    };
  }

  if (named.length >= 1) {
    const c = named[0];
    return {
      facts: [
        `${c.shortName} is a ${segmentOf(c).toLowerCase()} company in ${c.sector.toLowerCase()} with market capitalisation of ${crore(c.marketCapCr)}.`,
        `Return on capital employed ${pct(last(c.roce))}, debt-to-equity ${ratio(debtToEquity(c), 2)}, price-to-earnings ${ratio(c.pe)}.`,
        `Research score ${scoreOf(c, weights).total} of 100.`,
      ],
      rows: list([c], () => 'Open full research'),
      interpretations: [],
      sources,
    };
  }

  const partial = companies.filter((c) => q.includes(c.shortName.toLowerCase().split(' ')[0]));
  if (partial.length > 1) {
    return {
      facts: [],
      rows: list(partial, (c) => `${segmentOf(c)} \u00B7 ${c.sector}`),
      interpretations: ['More than one company matches that name. Open one below, or ask again using the full company name.'],
      sources: [],
    };
  }

  return {
    facts: [],
    rows: [],
    interpretations: [
      'I can answer questions about improving return on capital employed, consistent profit growth, low debt and strong cash flow, accelerating revenue, deteriorating fundamentals, comparing two companies, the latest quarterly results of a company, and why a research score changed. Add "small-cap", "mid-cap", "large-cap" or "micro-cap" to narrow the answer.',
    ],
    sources: [],
  };
}
