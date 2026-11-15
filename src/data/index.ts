import raw from './snapshot.json';
import type { Company, Snapshot } from './types';

export const snapshot = raw as unknown as Snapshot;
export const companies: Company[] = snapshot.companies;
export const meta = snapshot.meta;

const bySymbol = new Map(companies.map((c) => [c.symbol, c]));
export const getCompany = (symbol: string | undefined) => (symbol ? bySymbol.get(symbol) : undefined);

export const sectorList = Array.from(new Set(companies.map((c) => c.sector))).sort();

export type { Company, Snapshot } from './types';
