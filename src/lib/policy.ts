import type { Stock } from './types';

export function needsRestock(s: Stock): boolean {
  throw new Error('not implemented: A1');
}

export function applyHours(s: Stock, hours: number): { stock: Stock; consumed: boolean } {
  throw new Error('not implemented: A1');
}
