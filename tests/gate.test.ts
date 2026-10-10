import { describe, expect, it } from 'vitest';
import { getItem } from '@/lib/catalog';
import { evaluateGate } from '@/lib/gate';
import type { GateInput } from '@/lib/types';

const cable = getItem('dm-accel-cable')!;
const ptfe = getItem('dm-ptfe-mk3splus')!;
const nozzle = getItem('ct-nozzle-04')!;

function input(over: Partial<GateInput> & { plate?: string; model?: string } = {}): GateInput {
  const model = over.model ?? 'Original Prusa MK4S';
  const item = over.item ?? cable;
  return {
    company: { id: 'c1', name: 'Forja3D MX', country: 'MX', currency: 'MXN', monthlyBudget: 6000, purchaseCap: 1500 },
    machine: { id: 'P1', companyId: 'c1', name: 'P1', nameplateModel: model, hotend: 'Nextruder', hoursTotal: 820, downtimeCostPerHour: 120 },
    item, requestedVariantId: item.variantId,
    evidence: { hours: 1480, photoId: 'ph1', photoNameplateModel: over.plate ?? model },
    quote: { validUntil: 2000, price: item.price, currency: item.currency }, now: 1000, spentThisMonthMxn: 0, ...over,
  } as GateInput;
}
const failed = (r: ReturnType<typeof evaluateGate>) => r.rules.filter((x) => !x.ok).map((x) => x.rule);

describe('gate', () => {
  it('passes the happy path', () => expect(evaluateGate(input())).toMatchObject({ ok: true }));
  it('blocks MK3S+ PTFE on a plain MK3S', () => {
    expect(failed(evaluateGate(input({ item: ptfe, model: 'Original Prusa MK3S' })))).toEqual(['compat']);
  });
  it('passes MK3S+ PTFE on an MK3S+', () => expect(evaluateGate(input({ item: ptfe, model: 'Original Prusa MK3S+' })).ok).toBe(true));
  it('does not match MK3S inside MK3S+', () => {
    const item = { ...getItem('dm-thermistor')!, compatModels: ['MK3S'] };
    expect(evaluateGate(input({ item, model: 'Original Prusa MK3S+' })).ok).toBe(false);
  });
  it('blocks cubictech for MX and passes for AU', () => {
    const base = input({ item: nozzle, model: 'Creality K1' });
    base.machine.hotend = 'Micro Swiss FlowTech';
    expect(failed(evaluateGate(base))).toEqual(['ships_to']);
    base.company.country = 'AU';
    expect(evaluateGate(base).ok).toBe(true);
  });
  it('rejects photo evidence for another model', () => {
    expect(failed(evaluateGate(input({ plate: 'Original Prusa MK3S' })))).toContain('evidence');
  });
  it('rejects missing photo or hours', () => {
    const value = input();
    value.evidence = { hours: null, photoId: null, photoNameplateModel: null };
    expect(failed(evaluateGate(value))).toContain('evidence');
  });
  it('passes the price cap exactly and rejects one cent over', () => {
    const value = input();
    value.company.purchaseCap = 285.87;
    expect(evaluateGate(value).ok).toBe(true);
    value.company.purchaseCap = 285.86;
    expect(failed(evaluateGate(value))).toEqual(['price_cap']);
  });
  it('counts prior monthly spending', () => {
    const value = input();
    value.spentThisMonthMxn = 5800;
    expect(failed(evaluateGate(value))).toEqual(['budget']);
  });
  it('rejects expired or altered quotes', () => {
    expect(failed(evaluateGate(input({ now: 2001 })))).toEqual(['quote_valid']);
    const value = input();
    value.quote.price = cable.price + 1;
    expect(failed(evaluateGate(value))).toEqual(['quote_valid']);
  });
  it('rejects a tampered variant', () => {
    expect(failed(evaluateGate(input({ requestedVariantId: '999' })))).toEqual(['variant_exact']);
  });
});
