import { describe, expect, it } from 'vitest';
import { gateCheck, isExpired, lifePercent, money } from './format';

describe('format', () => {
  it('detecta cotización vencida solo con fecha válida', () => {
    expect(isExpired('2026-01-01T00:00:00Z', Date.parse('2026-01-02T00:00:00Z'))).toBe(true);
    expect(isExpired('2026-01-03T00:00:00Z', Date.parse('2026-01-02T00:00:00Z'))).toBe(false);
    expect(isExpired(null, 1)).toBe(false);
  });
  it('limita la vida usada a 100 % y formatea montos', () => {
    expect(lifePercent(1600, 1500)).toBe(100);
    expect(lifePercent(750, 1500)).toBe(50);
    expect(money({ amount: 32.34, currency: 'CAD' })).toContain('32.34');
    expect(gateCheck([], 'budget')).toBeUndefined();
  });
});
