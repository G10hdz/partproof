import { beforeEach, describe, expect, it } from 'vitest';
import { getItem } from '@/lib/catalog';
import { newDb } from '@/lib/db';
import { buildGateInput, spentThisMonthMxn } from '@/lib/gate-input';
import { seedDb } from '@/data/seed';

let db: ReturnType<typeof newDb>;
beforeEach(() => { db = newDb(); seedDb(db); });

const insertPurchase = (id: string, mxn: number, at: number, status = 'paid') =>
  db.prepare('insert into purchase values (?,?,?,?,?,?,?,?,?)').run(id, 'p', 'mock', 'r', mxn, 'MXN', mxn, status, at);

describe('spentThisMonthMxn', () => {
  const oct15 = Date.UTC(2026, 9, 15);
  it('sums only paid purchases in the UTC month', () => {
    insertPurchase('a', 100, Date.UTC(2026, 9, 1));
    insertPurchase('b', 50, Date.UTC(2026, 9, 14));
    insertPurchase('c', 999, Date.UTC(2026, 8, 30, 23, 59));
    insertPurchase('d', 700, Date.UTC(2026, 9, 2), 'failed');
    expect(spentThisMonthMxn(db, oct15)).toBe(150);
  });
  it('resets at the next UTC month', () => {
    insertPurchase('a', 100, Date.UTC(2026, 9, 1));
    expect(spentThisMonthMxn(db, Date.UTC(2026, 10, 1))).toBe(0);
  });
});

describe('buildGateInput', () => {
  const quote = () => {
    const item = getItem('dm-accel-cable')!;
    return { item, quote: { id: 'q1', itemId: item.id, price: item.price, currency: item.currency, validUntil: 5 } };
  };
  it('uses the photo plate model', () => {
    db.prepare('insert into photo values (?,?,?,?,?,?,?)').run('ph1', 'P1', 'Original Prusa MK4S', 'Nextruder', '[]', 0.9, 1);
    const { item, quote: value } = quote();
    const gate = buildGateInput(db, { machineId: 'P1', item, requestedVariantId: item.variantId, photoId: 'ph1', hours: 1480, quote: value, now: 1 });
    expect(gate.evidence.photoNameplateModel).toBe('Original Prusa MK4S');
    expect(gate.company.country).toBe('MX');
  });
  it('returns null photo evidence when the photo is missing', () => {
    const { item, quote: value } = quote();
    const gate = buildGateInput(db, { machineId: 'P1', item, requestedVariantId: item.variantId, photoId: 'nope', hours: 1480, quote: value, now: 1 });
    expect(gate.evidence.photoNameplateModel).toBeNull();
  });
});
