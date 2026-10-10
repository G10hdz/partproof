import type { Stock } from './types';

export function needsRestock(s: Stock): boolean {
  return s.qty < s.minQty;
}

export function applyHours(s: Stock, hours: number): { stock: Stock; consumed: boolean } {
  const total = s.hoursSinceReplace + hours;
  if (total < s.ratedLifeHours) return { stock: { ...s, hoursSinceReplace: total }, consumed: false };
  return { stock: { ...s, qty: Math.max(0, s.qty - 1), hoursSinceReplace: 0 }, consumed: true };
}
