import { describe, expect, it } from 'vitest';
import { dateOnly, gateCheck, isExpired, latestProposalFor, lifePercent, money } from './format';

describe('format', () => {
  it('dateOnly muestra el día UTC sin correrlo por zona horaria', () => {
    expect(dateOnly('2026-10-31T00:00:00.000Z')).toContain('31');
    expect(dateOnly('2026-10-31T00:00:00.000Z')).toContain('2026');
  });
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
  it('latestProposalFor devuelve la más reciente de esa máquina, no de otra', () => {
    const proposals = [
      { id: 'nueva-p4', machine_id: 'P4' },
      { id: 'nueva-p1', machine_id: 'P1' },
      { id: 'vieja-p1', machine_id: 'P1' },
    ];
    expect(latestProposalFor(proposals, 'P1')?.id).toBe('nueva-p1');
    expect(latestProposalFor(proposals, 'P9')).toBeUndefined();
    expect(latestProposalFor(proposals, undefined)).toBeUndefined();
  });
});
