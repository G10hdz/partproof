import type Database from 'better-sqlite3';
import type { PartType, ProposalView } from './types';

export function createProposalFromRequest(db: Database.Database, a: {
  machineId: string; partType: PartType; hours: number; photoId: string; note?: string;
}, now?: number): ProposalView {
  throw new Error('not implemented: A2');
}
