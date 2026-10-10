import { describe, expect, it } from 'vitest';
import { monthlyRunAfter } from './schedule';

const at = (s: string) => new Date(s);

describe('monthlyRunAfter', () => {
  it('31 ene -> 28 feb y luego 31 mar (el día ancla no se pierde)', () => {
    const feb = monthlyRunAfter('2026-01-31T00:00:00.000Z', 31, at('2026-01-31T00:00:00Z'));
    expect(feb).toBe('2026-02-28T00:00:00.000Z');
    expect(monthlyRunAfter(feb, 31, at('2026-02-28T00:00:00Z'))).toBe('2026-03-31T00:00:00.000Z');
  });
  it('año bisiesto: 31 ene 2028 -> 29 feb 2028', () => {
    expect(monthlyRunAfter('2028-01-31T00:00:00.000Z', 31, at('2028-01-31T00:00:00Z'))).toBe('2028-02-29T00:00:00.000Z');
  });
  it('meses saltados dan una sola fecha futura (no una por mes perdido)', () => {
    expect(monthlyRunAfter('2026-01-31T00:00:00.000Z', 31, at('2026-04-15T00:00:00Z'))).toBe('2026-04-30T00:00:00.000Z');
  });
  it('cruza de diciembre a enero y conserva la hora', () => {
    expect(monthlyRunAfter('2026-12-15T09:30:00.000Z', 15, at('2026-12-15T09:30:00Z'))).toBe('2027-01-15T09:30:00.000Z');
  });
  it('la fecha resultante siempre es posterior a now', () => {
    const now = at('2026-06-10T12:00:00Z');
    expect(Date.parse(monthlyRunAfter('2026-06-10T12:00:00.000Z', 10, now))).toBeGreaterThan(now.getTime());
  });
});
