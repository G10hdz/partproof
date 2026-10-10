import type { Currency } from './types';

// ponytail: static demo table; use a rates API when real money moves.
export const FX_TO_MXN: Record<Currency, number> = { MXN: 1, CAD: 13, AUD: 12 };

export function toMxn(amount: number, currency: Currency): number {
  return Math.round(amount * FX_TO_MXN[currency] * 100) / 100;
}
