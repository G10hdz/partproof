import { describe, expect, it } from 'vitest';
import { applyHours, needsRestock } from '@/lib/policy';
import type { Stock } from '@/lib/types';

const stock = (over: Partial<Stock> = {}): Stock => ({
  machineId: 'P1', partType: 'accelerometer_cable', qty: 1, minQty: 1,
  ratedLifeHours: 1500, hoursSinceReplace: 1480, ...over,
});

describe('policy', () => {
  it('needs restock only below the minimum', () => {
    expect(needsRestock(stock())).toBe(false);
    expect(needsRestock(stock({ qty: 0 }))).toBe(true);
  });
  it('adds hours before end of life', () => {
    const result = applyHours(stock(), 10);
    expect(result).toMatchObject({ consumed: false, stock: { hoursSinceReplace: 1490 } });
  });
  it('consumes and resets at end of life', () => {
    const result = applyHours(stock(), 20);
    expect(result).toMatchObject({ consumed: true, stock: { qty: 0, hoursSinceReplace: 0 } });
    expect(needsRestock(result.stock)).toBe(true);
  });
  it('never drops spare quantity below zero', () => expect(applyHours(stock({ qty: 0 }), 100).stock.qty).toBe(0));
});
