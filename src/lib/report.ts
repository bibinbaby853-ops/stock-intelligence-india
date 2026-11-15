import { meta } from '@/data';
import type { Company } from '@/data/types';
import { crore, debtToEquity, growthRate, last, longDate, num, pct, ratio, rupees, segmentOf } from './metrics';
import { componentKeys, componentLabels, insightsOf, scoreOf, type Weights } from './score';

export type ReportLine = { kind: 'Fact' | 'Interpretation'; text: string };

export function reportLines(c: Company): ReportLine[] {
  const n = c.years.length;
  const rg = growthRate(c.revenue, 3);
  const de = debtToEquity(c);
  const de0 = c.debtToEquityHistory[0];
  const roce = last(c.roce);
  const lines: ReportLine[] = [
    { kind: 'Fact', text: `Revenue moved from ${crore(c.revenue[0])} in ${c.years[0]} to ${crore(last(c.revenue))} in ${last(c.years)}; net profit moved from ${crore(c.profit[0])} to ${crore(last(c.profit))}.` },
    { kind: 'Fact', text: `Return on capital employed was ${pct(c.roce[0])} in ${c.years[0]} and ${pct(roce)} in ${last(c.years)}. Debt-to-equity moved from ${ratio(de0, 2)} to ${ratio(de, 2)}.` },
    { kind: 'Fact', text: `Free cash flow was positive in ${c.freeCashFlow.filter((v) => v > 0).length} of ${n} years. Price-to-earnings is ${ratio(c.pe)} against a five-year median of ${ratio(c.peMedian)}.` },
  ];
  if (roce >= 18 && de <= 0.5) lines.push({ kind: 'Interpretation', text: 'High returns on capital with limited borrowing suggest growth has largely been funded from internal cash, which lowers financing risk.' });
  else if (roce > c.roce[0] + 3 && de < de0) lines.push({ kind: 'Interpretation', text: 'Returns are improving while debt is falling, which is the pattern of a strengthening business. The record of improvement is still short.' });
  else if (roce < c.roce[0] - 3) lines.push({ kind: 'Interpretation', text: 'Falling returns on capital suggest the business is earning less on each rupee invested than before. The cause needs checking in the annual report.' });
  else lines.push({ kind: 'Interpretation', text: 'Returns on capital have been broadly stable, with no clear improving or worsening trend.' });
  if (c.pe !== null && c.pe > c.peMedian * 1.2) lines.push({ kind: 'Interpretation', text: 'The valuation is above the company’s own history, so future returns depend on growth continuing.' });
  else if (c.pe !== null && c.pe < c.peMedian * 0.85) lines.push({ kind: 'Interpretation', text: `The valuation is below the company’s own history. That can mean an opportunity or that the market expects weaker results${rg !== null && rg < 8 ? '; revenue growth has been slow' : ''}.` });
  return lines;
}

export function shareText(c: Company, weights: Weights): string {
  const s = scoreOf(c, weights);
  const ins = insightsOf(c);
  return [
    `${c.name} (${c.symbol}) – research summary`,
    meta.sample ? 'SAMPLE DATA: illustrative figures, not real.' : `Data as of ${longDate(meta.priceAsOf)}.`,
    `Price ${rupees(c.price)} · Market capitalisation ${crore(c.marketCapCr)} · ${segmentOf(c)}`,
    `Research score ${s.total} of 100`,
    `Strengths: ${ins.strengths.slice(0, 2).join(' ')}`,
    `Risks: ${ins.risks.slice(0, 2).join(' ')}`,
    'Not investment advice.',
  ].join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function reportHtml(c: Company, weights: Weights): string {
  const s = scoreOf(c, weights);
  const ins = insightsOf(c);
  const rows = (label: string, values: (number | string)[]) => `<tr><th>${label}</th>${values.map((v) => `<td>${typeof v === 'number' ? num(v, Number.isInteger(v) ? 0 : 1) : v}</td>`).join('')}</tr>`;
  const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Helvetica,Arial,sans-serif;color:#131A20;padding:28px;font-size:12px;line-height:1.5}
h1{font-size:22px;margin:0}h2{font-size:14px;margin:22px 0 6px;border-bottom:1px solid #D5DCE2;padding-bottom:4px}
.muted{color:#55636F}.warn{border:1px dashed #8A6100;color:#8A6100;padding:6px 10px;margin:10px 0}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #E3E8EC;padding:5px 6px;text-align:right}th:first-child{text-align:left}
.tag{display:inline-block;border:1px solid #55636F;border-radius:9px;padding:0 7px;font-size:10px;margin-right:6px}
</style></head><body>
<h1>${esc(c.name)}</h1>
<div class="muted">${c.symbol} · ${esc(c.sector)} · ${segmentOf(c)} · Stock Intelligence India research report</div>
${meta.sample ? '<div class="warn">Sample data. This company and every figure are illustrative, not real.</div>' : ''}
<p>Price ${rupees(c.price)} as of ${longDate(meta.priceAsOf)} · Market capitalisation ${crore(c.marketCapCr)}</p>
<h2>Research score: ${s.total} of 100</h2>
<table>${componentKeys.map((k) => `<tr><th>${componentLabels[k]} (weight ${weights[k]})</th><td>${s.parts[k]}</td></tr>`).join('')}</table>
<h2>Financial history (₹ crore)</h2>
<table>${rows('Financial year', c.years.map(String))}${rows('Revenue', c.revenue)}${rows('Net profit', c.profit)}${rows('Operating cash flow', c.operatingCashFlow)}${rows('Free cash flow', c.freeCashFlow)}${rows('Return on capital employed %', c.roce)}${rows('Return on equity %', c.roe)}${rows('Debt-to-equity', c.debtToEquityHistory.map((v) => v.toFixed(2)))}</table>
<h2>Ownership</h2>
<p>Promoters ${pct(c.promoter)} · Foreign institutions ${pct(c.foreignInstitutions)} · Domestic institutions ${pct(c.domesticInstitutions)} · Promoter shares pledged ${pct(c.pledged)}</p>
<h2>Research report</h2>
${reportLines(c).map((l) => `<p><span class="tag">${l.kind}</span>${esc(l.text)}</p>`).join('')}
<h2>Strengths</h2>${ul(ins.strengths)}<h2>Weaknesses</h2>${ul(ins.weaknesses)}<h2>Risks</h2>${ul(ins.risks)}
<h2>Sources</h2>${ul(meta.sources)}
<p class="muted">A research score summarises reported fundamentals. It is not a recommendation and does not predict returns. Not investment advice.</p>
</body></html>`;
}
