import type Database from 'better-sqlite3';
import type { CatalogItem, GateInput, GateResult, Quote } from './types';

export function spentThisMonthMxn(db: Database.Database, now: number): number {
  throw new Error('not implemented: A1');
}

export function buildGateInput(db: Database.Database, p: {
  machineId: string; item: CatalogItem; requestedVariantId: string;
  photoId: string | null; hours: number | null; quote: Quote; now: number;
}): GateInput {
  throw new Error('not implemented: A1');
}

export function recheck(db: Database.Database, proposalId: string, now: number): GateResult {
  throw new Error('not implemented: A1');
}
