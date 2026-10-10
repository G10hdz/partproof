import { describe, expect, it } from 'vitest';
import type { Company, GateInputB } from '@/contracts';
import { budgetFor, monthKey, validateSettings } from './budget';
import { evaluateGateB } from './gate';

const base = { monthly_budget: 6000, purchase_cap: 1000 };

describe('budgetFor', () => {
  it('usa la excepción del mes y la base en los demás', () => {
    const c = { ...base, budget_overrides: { '2026-12': 3000 } };
    expect(budgetFor(c, new Date('2026-12-05T10:00:00Z'))).toBe(3000);
    expect(budgetFor(c, new Date('2026-11-05T10:00:00Z'))).toBe(6000);
  });
  it('sin budget_overrides usa la base', () => {
    expect(budgetFor(base, new Date('2026-12-05T10:00:00Z'))).toBe(6000);
  });
  it('el mes se cuenta en UTC', () => {
    const c = { ...base, budget_overrides: { '2026-12': 3000 } };
    expect(budgetFor(c, new Date('2026-12-31T23:59:59Z'))).toBe(3000);
    expect(budgetFor(c, new Date('2027-01-01T00:00:00Z'))).toBe(6000);
    expect(monthKey(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01');
  });
});

describe('validateSettings', () => {
  it('acepta límites válidos con excepciones', () => {
    expect(() => validateSettings({ ...base, budget_overrides: { '2026-12': 3000 } })).not.toThrow();
    expect(() => validateSettings(base)).not.toThrow();
  });
  it.each([
    ['presupuesto NaN', { monthly_budget: NaN, purchase_cap: 1 }],
    ['tope negativo', { monthly_budget: 100, purchase_cap: -1 }],
    ['tope mayor que el presupuesto', { monthly_budget: 100, purchase_cap: 200 }],
    ['mes 13', { ...base, budget_overrides: { '2026-13': 3000 } }],
    ['mes sin cero', { ...base, budget_overrides: { '2026-1': 3000 } }],
    ['monto negativo', { ...base, budget_overrides: { '2026-12': -5 } }],
    ['tope mayor que la excepción', { ...base, budget_overrides: { '2026-12': 500 } }],
  ])('rechaza %s', (_name, input) => {
    expect(() => validateSettings(input)).toThrow();
  });
});

describe('gate B con excepción', () => {
  const company: Company = { id: 'c', name: 'C', currency: 'MXN', ...base, billing_email: 'a@b.c', budget_overrides: { '2026-12': 400 } };
  const input = (now: string): GateInputB => ({
    company, monthly_spend: 0, fx_to_company: { CAD: 13, MXN: 1 }, now: new Date(now),
    quote: { id: 'q', checkoutUrl: 'https://x', merchantDomain: 'x', itemsSubtotal: { amount: 21.99, currency: 'CAD' },
      shipping: null, tax: null, finalAmount: { amount: 32.34, currency: 'CAD' }, expiresAt: '2026-12-31T23:59:00Z' },
  });
  it('la regla budget usa la excepción del mes (420.42 MXN > 400)', () => {
    const budget = evaluateGateB(input('2026-12-05T00:00:00Z')).find((c) => c.rule === 'budget')!;
    expect(budget.passed).toBe(false);
  });
  it('en otro mes usa la base (420.42 MXN <= 6000)', () => {
    const budget = evaluateGateB(input('2026-11-05T00:00:00Z')).find((c) => c.rule === 'budget')!;
    expect(budget.passed).toBe(true);
  });
});
