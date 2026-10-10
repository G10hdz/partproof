import type Database from 'better-sqlite3';

export interface LedgerRow {
  machineId: string; name: string; totalMxn: number; hoursTotal: number; mxnPerHour: number;
}

export function ledgerByMachine(db: Database.Database): LedgerRow[] {
  throw new Error('not implemented: A3');
}

export function monthTotalMxn(db: Database.Database, now: number): number {
  throw new Error('not implemented: A3');
}
