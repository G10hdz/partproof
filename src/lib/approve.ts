import type Database from 'better-sqlite3';
import type { ApproveResult, PaymentProvider } from './types';

export async function approveAndPay(db: Database.Database, proposalId: string,
  now?: number, provider?: PaymentProvider): Promise<ApproveResult> {
  throw new Error('not implemented: A3');
}

export function rejectProposal(db: Database.Database, proposalId: string, reason: string): void {
  throw new Error('not implemented: A3');
}
