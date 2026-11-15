export type Company = {
  symbol: string;
  name: string;
  shortName: string;
  sector: string;
  exchange: string;
  overview: string;
  marketCapCr: number;
  price: number;
  changePct: number;
  /** Financial years, oldest first. Every yearly array below lines up with this. */
  years: number[];
  revenue: number[];
  profit: number[];
  roce: number[];
  roe: number[];
  operatingCashFlow: number[];
  freeCashFlow: number[];
  debtToEquityHistory: number[];
  interestCover: number | null;
  pe: number | null;
  peLow: number;
  peMedian: number;
  peHigh: number;
  promoter: number;
  foreignInstitutions: number;
  domesticInstitutions: number;
  pledged: number;
  pledgedPrev: number;
  /** Weekly closing prices, oldest first. */
  prices: number[];
  quarter: { label: string; revenue: number; profit: number; revenueGrowth: number; profitGrowth: number };
  nextResults: string | null;
  announcements: { date: string; title: string }[];
};

export type Snapshot = {
  meta: { sample: boolean; generatedAt: string; priceAsOf: string; note: string; sources: string[] };
  indices: { name: string; value: number; changePct: number }[];
  breadth: { advances: number; declines: number };
  companies: Company[];
};
