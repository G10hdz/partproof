import { describe, expect, it } from 'vitest';
import type { PartProofServer } from '@/contracts';
import { monthKey } from '@/domain/budget';
import { openStore } from './db';
import { createFakeServer } from './fake-server';
import { createRealServer } from './real-server';
import type { Workflow } from './workflow';

const real = (): PartProofServer =>
  createRealServer({
    store: openStore(':memory:'), workflow: { monthlySpend: () => 0 } as unknown as Workflow,
    providerMode: 'mock', visionMode: 'replay', demo: true,
  });

describe.each([['real', real], ['fake', createFakeServer]])('saveSettings (%s)', (_name, make) => {
  it('guarda excepciones y el libro usa la del mes actual', async () => {
    const s = make();
    const month = monthKey(new Date());
    await s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { [month]: 2500 } });
    expect((await s.getCompany()).budget_overrides).toEqual({ [month]: 2500 });
    expect((await s.getLedger()).monthly_budget).toBe(2500);
  });

  it('omitir budget_overrides conserva las existentes; {} las borra', async () => {
    const s = make();
    await s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { '2030-01': 2000 } });
    await s.saveSettings({ monthly_budget: 7000, purchase_cap: 1000 });
    expect((await s.getCompany()).budget_overrides).toEqual({ '2030-01': 2000 });
    await s.saveSettings({ monthly_budget: 7000, purchase_cap: 1000, budget_overrides: {} });
    expect((await s.getCompany()).budget_overrides).toEqual({});
  });

  it('rechaza tope mayor que el presupuesto y meses inválidos sin guardar nada', async () => {
    const s = make();
    await expect(s.saveSettings({ monthly_budget: 100, purchase_cap: 200 })).rejects.toThrow();
    await expect(s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { '2026-13': 1 } })).rejects.toThrow();
    expect((await s.getCompany()).monthly_budget).toBe(6000);
  });
});
