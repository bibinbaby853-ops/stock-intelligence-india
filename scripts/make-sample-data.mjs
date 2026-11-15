// Generates the built-in SAMPLE snapshot (fictional companies, illustrative figures).
// The data collector replaces src/data/snapshot.json with real exchange data and sets meta.sample to false.
import { writeFileSync } from 'node:fs';

let seed = 20261113;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const between = (a, b) => a + rnd() * (b - a);
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const prefixes = ['Aravali', 'Deccan', 'Konkan', 'Narmada', 'Sahyadri', 'Vindhya', 'Nilgiri', 'Malwa', 'Kaveri', 'Godavari', 'Satpura', 'Tapti', 'Kumaon', 'Bundel', 'Chambal', 'Periyar', 'Sutlej', 'Mahanadi', 'Tungabhadra', 'Shivalik'];
const sectors = {
  'Capital goods': ['Precision Gears', 'Power Cables', 'Industrial Pumps', 'Switchgear', 'Machine Tools', 'Bearings'],
  'Information technology': ['Software Labs', 'Data Systems', 'Cloud Services', 'Digital Engineering'],
  Pharmaceuticals: ['Life Sciences', 'Formulations', 'Active Ingredients', 'Biologics'],
  'Consumer goods': ['Agro Foods', 'Home Care', 'Packaged Snacks', 'Personal Care'],
  Chemicals: ['Speciality Chemicals', 'Pigments', 'Polymers', 'Crop Science'],
  'Automobile components': ['Auto Components', 'Forgings', 'Castings', 'Brake Systems'],
  'Healthcare services': ['Diagnostics', 'Hospitals', 'Medical Devices'],
};
const overviewBy = {
  'Capital goods': 'Manufactures engineered industrial products for domestic infrastructure and export customers.',
  'Information technology': 'Provides software development and technology services to enterprise clients in India and overseas.',
  Pharmaceuticals: 'Develops and manufactures medicines for domestic and regulated export markets.',
  'Consumer goods': 'Makes and distributes branded everyday consumer products through retail and online channels.',
  Chemicals: 'Produces speciality chemical products used by agricultural, industrial and consumer companies.',
  'Automobile components': 'Supplies components to passenger vehicle, commercial vehicle and tractor manufacturers.',
  'Healthcare services': 'Operates healthcare facilities and services across several Indian states.',
};

// archetype: [revenue growth range, margin start, margin end, roce start, roce end, debt-to-equity start, end, cash conversion, pe vs median]
const archetypes = {
  compounder: { g: [0.14, 0.22], m: [0.11, 0.13], roce: [23, 27], de: [0.2, 0.08], cash: [1.0, 1.25], peRel: [1.05, 1.3] },
  growth: { g: [0.24, 0.4], m: [0.07, 0.11], roce: [14, 21], de: [0.5, 0.4], cash: [0.6, 0.95], peRel: [1.1, 1.5] },
  value: { g: [0.08, 0.14], m: [0.1, 0.11], roce: [17, 19], de: [0.3, 0.2], cash: [0.9, 1.1], peRel: [0.55, 0.8] },
  turnaround: { g: [0.1, 0.2], m: [-0.03, 0.07], roce: [3, 14], de: [1.5, 0.7], cash: [0.5, 1.0], peRel: [0.8, 1.2] },
  cash: { g: [0.07, 0.13], m: [0.14, 0.15], roce: [20, 22], de: [0.1, 0.02], cash: [1.15, 1.4], peRel: [0.9, 1.15] },
  improving: { g: [0.12, 0.2], m: [0.06, 0.11], roce: [11, 20], de: [0.8, 0.35], cash: [0.8, 1.1], peRel: [0.9, 1.2] },
  decliner: { g: [-0.04, 0.05], m: [0.11, 0.05], roce: [19, 9], de: [0.4, 1.1], cash: [0.3, 0.8], peRel: [0.7, 1.1] },
  average: { g: [0.06, 0.12], m: [0.08, 0.09], roce: [13, 14], de: [0.5, 0.5], cash: [0.7, 1.0], peRel: [0.85, 1.15] },
};
const plan = ['compounder', 'growth', 'value', 'turnaround', 'cash', 'improving', 'decliner', 'average'];
const capBands = [
  [120000, 400000],
  [30000, 75000],
  [6000, 24000],
  [600, 4500],
];
const years = [2022, 2023, 2024, 2025, 2026];
const priceAsOf = '2026-11-13';

const used = new Set();
const companies = [];
const sectorNames = Object.keys(sectors);
for (let i = 0; i < 40; i++) {
  const type = plan[i % plan.length];
  const a = archetypes[type];
  const sector = sectorNames[i % sectorNames.length];
  let name;
  do name = `${pick(prefixes)} ${pick(sectors[sector])}`;
  while (used.has(name));
  used.add(name);
  const symbol = name.split(' ').map((w, k) => (k === 0 ? w.slice(0, 5) : w.slice(0, 3))).join('').toUpperCase();
  const band = capBands[type === 'growth' || type === 'turnaround' ? 2 + (i % 2) : Math.floor(rnd() * 4)];
  const marketCapCr = Math.round(between(band[0], band[1]));

  const pe0 = between(16, 34);
  const peMedian = round(pe0);
  const peRel = between(a.peRel[0], a.peRel[1]);
  const lastProfitTarget = marketCapCr / (peMedian * peRel);
  const mEnd = a.m[1] * between(0.9, 1.1);
  const revEnd = lastProfitTarget / mEnd;

  const growth = years.map((_, k) => {
    const base = between(a.g[0], a.g[1]);
    return type === 'growth' ? base * (0.8 + k * 0.1) : base;
  });
  const revenue = new Array(5);
  revenue[4] = revEnd;
  for (let k = 3; k >= 0; k--) revenue[k] = revenue[k + 1] / (1 + growth[k + 1]);
  const lerp = (s, e, k) => s + ((e - s) * k) / 4;
  const margin = years.map((_, k) => lerp(a.m[0], mEnd, k) * between(0.985, 1.015));
  margin[4] = mEnd;
  const profit = revenue.map((r, k) => r * margin[k]);
  const roce = years.map((_, k) => round(lerp(a.roce[0], a.roce[1], k) + between(-0.8, 0.8)));
  if (type === 'compounder') roce.forEach((v, k) => (roce[k] = Math.max(v, 21 + k * 0.4)));
  if (type === 'improving') for (let k = 1; k < 5; k++) roce[k] = Math.max(roce[k], roce[k - 1] + 0.6);
  const roe = roce.map((v) => round(v * between(0.78, 0.92)));
  const debtToEquityHistory = years.map((_, k) => round(Math.max(0, lerp(a.de[0], a.de[1], k) * between(0.9, 1.1)), 2));
  const conv = years.map(() => between(a.cash[0], a.cash[1]));
  const ocf = profit.map((p, k) => Math.abs(p) * conv[k] + (p < 0 ? revenue[k] * 0.01 : 0));
  const fcf = ocf.map((o, k) => o - revenue[k] * (type === 'growth' ? 0.09 : type === 'cash' ? 0.02 : type === 'compounder' ? 0.04 : between(0.05, 0.085)));
  if (type === 'cash' || type === 'compounder') fcf.forEach((v, k) => (fcf[k] = Math.max(v, revenue[k] * 0.02)));

  const pe = round(marketCapCr / profit[4]);
  const price = round(between(90, 3800), 2);
  // Weekly closes for five years, walking backwards from the current price.
  const weeks = 260;
  const totalReturn = Math.max(0.35, (profit[4] / Math.max(Math.abs(profit[0]), profit[4] * 0.2)) * between(0.7, 1.2));
  const drift = Math.log(totalReturn) / weeks;
  const prices = [price];
  for (let w = 0; w < weeks; w++) prices.unshift(round(prices[0] / Math.exp(drift + between(-0.035, 0.035)), 2));

  const promoter = round(between(38, 74));
  const fii = round(between(3, 18));
  const dii = round(between(4, 16));
  const pledged = type === 'decliner' ? round(between(6, 22)) : type === 'turnaround' ? round(between(0, 8)) : 0;
  const pledgedPrev = type === 'decliner' ? round(pledged * between(0.4, 0.8)) : pledged;
  const qGrowth = growth[4] + between(-0.05, 0.06);
  const qProfitGrowth = qGrowth + (type === 'decliner' ? -0.2 : between(-0.04, 0.1));
  const resultsSoon = i % 5 === 0;

  companies.push({
    symbol,
    name: `${name} Limited`,
    shortName: name,
    sector,
    exchange: 'NSE',
    overview: overviewBy[sector],
    marketCapCr,
    price,
    changePct: round(between(-4.2, 5.4), 2),
    years,
    revenue: revenue.map((v) => Math.round(v)),
    profit: profit.map((v) => Math.round(v)),
    roce,
    roe,
    operatingCashFlow: ocf.map((v) => Math.round(v)),
    freeCashFlow: fcf.map((v) => Math.round(v)),
    debtToEquityHistory,
    interestCover: debtToEquityHistory[4] < 0.03 ? null : round(Math.max(0.8, roce[4] / (debtToEquityHistory[4] * 9))),
    pe: pe > 0 ? pe : null,
    peLow: round(peMedian * 0.6),
    peMedian,
    peHigh: round(peMedian * 1.55),
    promoter,
    foreignInstitutions: fii,
    domesticInstitutions: dii,
    pledged,
    pledgedPrev,
    prices,
    quarter: {
      label: 'July to September 2026',
      revenue: Math.round((revenue[4] / 4) * (1 + qGrowth / 2)),
      profit: Math.round((profit[4] / 4) * (1 + qProfitGrowth / 2)),
      revenueGrowth: round(qGrowth * 100),
      profitGrowth: round(qProfitGrowth * 100),
    },
    nextResults: resultsSoon ? `2026-11-${16 + (i % 4)}` : null,
    announcements: [
      { date: `2026-11-${String(3 + (i % 9)).padStart(2, '0')}`, title: pick(['Quarterly results published', 'Board meeting outcome announced', 'Capacity expansion approved', 'New order received', 'Investor presentation filed']) },
      { date: `2026-10-${String(8 + (i % 20)).padStart(2, '0')}`, title: pledged > pledgedPrev ? 'Promoter pledge increased' : pick(['Shareholding pattern filed', 'Credit rating reaffirmed', 'Analyst meeting scheduled']) },
    ],
  });
}

const up = companies.filter((c) => c.changePct >= 0).length;
const snapshot = {
  meta: {
    sample: true,
    generatedAt: `${priceAsOf}T15:30:00+05:30`,
    priceAsOf,
    note: 'Sample data. Companies and figures are illustrative, not real prices.',
    sources: ['Built-in sample data set (not from the exchanges)'],
  },
  indices: [
    { name: 'NIFTY 50', value: 24318.4, changePct: 0.62 },
    { name: 'NIFTY NEXT 50', value: 68902.15, changePct: 0.91 },
    { name: 'NIFTY MIDCAP', value: 57144.8, changePct: 1.14 },
    { name: 'NIFTY SMALLCAP', value: 18265.3, changePct: -0.38 },
    { name: 'Sensex', value: 79870.55, changePct: 0.58 },
  ],
  breadth: { advances: up, declines: companies.length - up },
  companies,
};
writeFileSync(new URL('../src/data/snapshot.json', import.meta.url), JSON.stringify(snapshot));
console.log(`Wrote ${companies.length} sample companies`);
