import type Database from 'better-sqlite3';
import type { CatalogItem, GateInput, GateResult, Quote } from './types';
import { getItem } from './catalog';
import { evaluateGate } from './gate';
import { getCompany, getMachine, getPhoto } from './rows';

export function spentThisMonthMxn(db: Database.Database, now: number): number {
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return (db.prepare("select coalesce(sum(amount_mxn), 0) as total from purchase where status='paid' and created_at>=? and created_at<?")
    .get(start, end) as { total: number }).total;
}

export function buildGateInput(db: Database.Database, p: {
  machineId: string; item: CatalogItem; requestedVariantId: string;
  photoId: string | null; hours: number | null; quote: Quote; now: number;
}): GateInput {
  const machine = getMachine(db, p.machineId);
  const company = getCompany(db, machine.companyId);
  const photo = p.photoId ? getPhoto(db, p.photoId) : null;
  return {
    company, machine, item: p.item, requestedVariantId: p.requestedVariantId,
    evidence: { hours: p.hours, photoId: photo?.id ?? null, photoNameplateModel: photo?.nameplateModel ?? null },
    quote: { validUntil: p.quote.validUntil, price: p.quote.price, currency: p.quote.currency },
    now: p.now, spentThisMonthMxn: spentThisMonthMxn(db, p.now),
  };
}

export function recheck(db: Database.Database, proposalId: string, now: number): GateResult {
  const proposal = db.prepare('select * from proposal where id=?').get(proposalId) as any;
  if (!proposal?.item_id || !proposal.quote_id || !proposal.variant_id) throw new Error(`proposal ${proposalId} is not payable`);
  const item = getItem(proposal.item_id);
  if (!item) throw new Error(`unknown catalog item ${proposal.item_id}`);
  const quote = db.prepare('select * from quote where id=?').get(proposal.quote_id) as any;
  const event = db.prepare('select payload from event where id=?').get(proposal.event_id) as any;
  if (!quote || !event) throw new Error(`proposal ${proposalId} is not payable`);
  const payload = JSON.parse(event.payload) as { hours?: number; photoId?: string };
  return evaluateGate(buildGateInput(db, {
    machineId: proposal.machine_id, item, requestedVariantId: proposal.variant_id,
    photoId: payload.photoId ?? null, hours: payload.hours ?? null,
    quote: { id: quote.id, itemId: quote.item_id, price: quote.price, currency: quote.currency, validUntil: quote.valid_until },
    now,
  }));
}
