import type Database from 'better-sqlite3';
import type { ProposalView } from './types';

export class McpAuthError extends Error {}

export async function handleRequestPart(db: Database.Database, token: string,
  rawArgs: unknown, now?: number): Promise<ProposalView> {
  throw new Error('not implemented: A2');
}
