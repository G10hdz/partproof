import { describe, expect, it } from 'vitest';
import type { Company, GateInputA, GateInputB, Machine, Product, ProviderQuote, Site, VisionResult } from '@/contracts';
import { evaluateGateA, evaluateGateB } from './gate';

const machine = (id: string, model: string, hotend: string): Machine => ({
  id, company_id: 'forja3d', site_id: 'tor', name: id, nameplate_model: model, hotend,
  hours_total: 1000, downtime_cost_per_hour: 120,
});
const site = (id: string, country: string): Site => ({
  id, company_id: 'forja3d', name: id, country,
  shipping_address: { firstName: 'x', lastName: 'y', phone: '+14165550123', addressLine1: 'a', city: 'c', country },
});

const CABLE: Product = {
  product_ref: 'dm-accel-cable', merchant: 'digitmakers.ca', title: 'Cable', variant_id: '67588566679782',
  price: 21.99, currency: 'CAD', part_type: 'accelerometer_cable',
  compat_models: ['MK4', 'MK4S'], compat_hotends: [], ships_to: ['CA', 'US', 'MX'], lead_time_days: 5,
};
const TUBE: Product = {
  product_ref: 'dm-ptfe-mk3s-plus', merchant: 'digitmakers.ca', title: 'Tubo', variant_id: '42393530925286',
  price: 2.99, currency: 'CAD', part_type: 'ptfe_tube',
  compat_models: ['MK3S+', 'MMU2S'], compat_hotends: [], ships_to: ['CA', 'US', 'MX'], lead_time_days: 5,
};
const NOZZLE: Product = {
  product_ref: 'ct-flowtech-04', merchant: 'cubictech.com.au', title: 'Boquilla', variant_id: '53918466703643',
  price: 59.95, currency: 'AUD', part_type: 'nozzle',
  compat_models: [], compat_hotends: ['Micro Swiss FlowTech'], ships_to: ['AU', 'CA', 'US'], lead_time_days: 10,
};

const cartUrl = (p: Product) => `https://${p.merchant}/cart/${p.variant_id}:1`;
const vision = (model: string): VisionResult => ({
  nameplate_model: model, hotend: null, visible_damage: [], label_text: null, confidence: 0.9,
});

const validA = (): GateInputA => ({
  machine: machine('P1', 'Original Prusa MK4S', 'Nextruder'),
  site: site('tor', 'CA'),
  product: CABLE,
  vision: vision('Original Prusa MK4S'),
  photo_id: 'plate_p1.jpg',
  hours_since_replace: 1480,
  checkout_url: cartUrl(CABLE),
});

const NOW = new Date('2026-10-10T03:00:00Z');
const inMin = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
const company = (over: Partial<Company> = {}): Company => ({
  id: 'forja3d', name: 'Forja3D', currency: 'MXN', monthly_budget: 6000, purchase_cap: 1500,
  billing_email: 'ops@forja3d.mx', ...over,
});
const quote = (amount: number, currency: string, expiresAt = inMin(8)): ProviderQuote => ({
  id: 'q1', checkoutUrl: 'https://digitmakers.ca/cart/67588566679782:1', merchantDomain: 'digitmakers.ca',
  itemsSubtotal: { amount, currency }, shipping: null, tax: null,
  finalAmount: { amount, currency }, expiresAt,
});
const validB = (over: Partial<GateInputB> = {}): GateInputB => ({
  company: company(), quote: quote(21.99, 'CAD'), monthly_spend: 0,
  fx_to_company: { MXN: 1, CAD: 13, AUD: 12 }, now: NOW, ...over,
});

describe('evaluateGateA', () => {
  it('P1 pasa las cuatro reglas de la fase A', () => {
    const checks = evaluateGateA(validA());
    expect(checks).toHaveLength(4);
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it('evidence: modelo leído distinto al de la máquina', () => {
    const checks = evaluateGateA({ ...validA(), vision: vision('Original Prusa MK3S') });
    expect(checks.find((c) => c.rule === 'evidence')?.passed).toBe(false);
  });

  it('compat: P2 (MK3S) contra tubo PTFE MK3S+', () => {
    const checks = evaluateGateA({
      ...validA(), machine: machine('P2', 'Original Prusa MK3S', 'E3D V6'), product: TUBE,
      vision: vision('Original Prusa MK3S'), checkout_url: cartUrl(TUBE),
    });
    expect(checks.find((c) => c.rule === 'compat')?.passed).toBe(false);
  });

  it('compat: MK3S+ sí pasa contra el tubo PTFE', () => {
    const checks = evaluateGateA({
      ...validA(), machine: machine('P3', 'Original Prusa MK3S+', 'E3D V6'), product: TUBE,
      vision: vision('Original Prusa MK3S+'), checkout_url: cartUrl(TUBE),
    });
    expect(checks.find((c) => c.rule === 'compat')?.passed).toBe(true);
  });

  it('compat: boquilla FlowTech pasa por hotend pero ships_to falla en MX', () => {
    const checks = evaluateGateA({
      ...validA(), machine: machine('P4', 'Creality K1', 'Micro Swiss FlowTech'), site: site('gdl', 'MX'),
      product: NOZZLE, vision: vision('Creality K1'), checkout_url: cartUrl(NOZZLE),
    });
    expect(checks.find((c) => c.rule === 'compat')?.passed).toBe(true);
    expect(checks.find((c) => c.rule === 'ships_to')?.passed).toBe(false);
  });

  it('variant_exact: variante alterada', () => {
    const checks = evaluateGateA({ ...validA(), checkout_url: 'https://digitmakers.ca/cart/99999999999999:1' });
    expect(checks.find((c) => c.rule === 'variant_exact')?.passed).toBe(false);
  });

  it('ships_to: merchant que no envía al país', () => {
    const checks = evaluateGateA({ ...validA(), product: NOZZLE, site: site('gdl', 'MX') });
    expect(checks.find((c) => c.rule === 'ships_to')?.passed).toBe(false);
  });
});

describe('evaluateGateB', () => {
  it('tabla 5.1: 33.50 CAD dentro de todo', () => {
    const checks = evaluateGateB(validB({ quote: quote(33.5, 'CAD') }));
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it('tabla 5.1: 120 CAD excede el tope de 1500', () => {
    const checks = evaluateGateB(validB({ quote: quote(120, 'CAD') }));
    expect(checks.find((c) => c.rule === 'price_cap')?.passed).toBe(false);
    expect(checks.find((c) => c.rule === 'budget')?.passed).toBe(true);
  });

  it('tabla 5.1: gasto del mes 5800 más 435.50 excede presupuesto', () => {
    const checks = evaluateGateB(validB({ quote: quote(33.5, 'CAD'), monthly_spend: 5800 }));
    expect(checks.find((c) => c.rule === 'budget')?.passed).toBe(false);
    expect(checks.find((c) => c.rule === 'price_cap')?.passed).toBe(true);
  });

  it('tabla 5.1: vence exactamente ahora', () => {
    const checks = evaluateGateB(validB({ quote: quote(33.5, 'CAD', NOW.toISOString()) }));
    expect(checks.find((c) => c.rule === 'quote_valid')?.passed).toBe(false);
  });

  it('tabla 5.1: moneda sin tasa falla cerrado', () => {
    const checks = evaluateGateB(validB({ quote: quote(33.5, 'USD') }));
    expect(checks.find((c) => c.rule === 'price_cap')?.passed).toBe(false);
    expect(checks.find((c) => c.rule === 'budget')?.passed).toBe(false);
  });

  it('price_cap: 102 CAD con tope 1000 MXN y tasa CAD 13', () => {
    const checks = evaluateGateB(validB({
      company: company({ purchase_cap: 1000 }), quote: quote(102, 'CAD'), fx_to_company: { MXN: 1, CAD: 13 },
    }));
    expect(checks.find((c) => c.rule === 'price_cap')?.passed).toBe(false);
  });

  it('price_cap: monto negativo falla cerrado', () => {
    const checks = evaluateGateB(validB({ quote: quote(-1, 'CAD') }));
    expect(checks.find((c) => c.rule === 'price_cap')?.passed).toBe(false);
  });

  it('quote_valid: fecha inválida falla cerrado', () => {
    const checks = evaluateGateB(validB({ quote: quote(33.5, 'CAD', 'no-es-fecha') }));
    expect(checks.find((c) => c.rule === 'quote_valid')?.passed).toBe(false);
  });
});
