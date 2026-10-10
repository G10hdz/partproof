import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  type CheckoutStatus, type GateCheck, type GateInputA, type GateInputB, type PaymentProvider, type ProviderQuote,
} from '@/contracts';
import { CATALOG, cartUrl } from './catalog';
import { openStore } from './db';
import { createRealServer } from './real-server';
import { FX_TO_MXN, seedMachines } from './seed';
import { createWorkflow } from './workflow';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../fixtures/reap/${name}`, import.meta.url), 'utf8'));
const toQuote = (raw: any, checkoutUrl: string, merchantDomain: string, expiresAt: string): ProviderQuote => ({
  id: raw.id, checkoutUrl, merchantDomain,
  itemsSubtotal: raw.amountBreakdown.itemsSubtotal, shipping: raw.amountBreakdown.shipping ?? null,
  tax: raw.amountBreakdown.tax?.amount ?? null, finalAmount: raw.amountBreakdown.finalAmount, expiresAt,
});

const NOW = new Date('2026-10-10T03:00:00Z');
const inMin = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

// Gates mínimos para probar la orquestación; las reglas completas viven en src/domain (carril L1).
const alias = (model: string) => model.replace(/^Original Prusa /, '');
const gateA = (i: GateInputA): GateCheck[] => [
  { rule: 'evidence', phase: 'A', passed: alias(i.vision.nameplate_model ?? '') === alias(i.machine.nameplate_model), reason: 'evidencia' },
  {
    rule: 'compat', phase: 'A', reason: 'compat',
    passed: i.product.compat_models.includes(alias(i.machine.nameplate_model)) || i.product.compat_hotends.includes(i.machine.hotend),
  },
  { rule: 'variant_exact', phase: 'A', passed: i.checkout_url === cartUrl(i.product), reason: 'variante' },
  { rule: 'ships_to', phase: 'A', passed: i.product.ships_to.includes(i.site.country), reason: 'envío' },
];
const gateB = (i: GateInputB): GateCheck[] => {
  const amount = i.quote.finalAmount.amount * (i.fx_to_company[i.quote.finalAmount.currency] ?? Infinity);
  return [
    { rule: 'price_cap', phase: 'B', passed: amount <= i.company.purchase_cap, reason: `tope ${amount}` },
    { rule: 'budget', phase: 'B', passed: i.monthly_spend + amount <= i.company.monthly_budget, reason: 'presupuesto' },
    { rule: 'quote_valid', phase: 'B', passed: Date.parse(i.quote.expiresAt) > i.now.getTime(), reason: 'vigencia' },
  ];
};

function stubProvider(opts: { quoteExpiresAt?: string; statuses?: CheckoutStatus[]; checkoutFailures?: ProviderError[] } = {}) {
  const checkoutFailures = [...(opts.checkoutFailures ?? [])];
  const calls = { quote: [] as string[], checkout: [] as string[], getCheckout: 0 };
  const statuses = [...(opts.statuses ?? ['PROCESSING', 'COMPLETED'])];
  const provider: PaymentProvider = {
    async quote({ product, shipTo, idempotencyKey }) {
      calls.quote.push(idempotencyKey);
      const url = cartUrl(product);
      if (product.merchant === 'digitmakers.ca' && shipTo.country === 'MX') {
        throw new ProviderError('ITEMS_UNSHIPPABLE', fixture('quote-unshippable-mx.json').error.message);
      }
      const raw = product.merchant === 'cubictech.com.au' ? fixture('quote-ok-cubictech-ca.json') : fixture('quote-ok-digitmakers-ca.json');
      return toQuote(raw, url, product.merchant, opts.quoteExpiresAt ?? inMin(10));
    },
    async checkout({ quoteId, idempotencyKey }) {
      calls.checkout.push(idempotencyKey);
      const failure = checkoutFailures.shift();
      if (failure) throw failure;
      return { id: `co-${quoteId}`, status: 'REQUIRES_ACTION', approvalUrl: 'https://sandbox.collect.prava.space?session=ses_REDACTED',
        approvalExpiresAt: inMin(10), orderId: null, finalAmount: null };
    },
    async getCheckout(id) {
      calls.getCheckout += 1;
      const status = statuses.shift() ?? 'COMPLETED';
      const done = status === 'COMPLETED';
      return { id, status, approvalUrl: null, approvalExpiresAt: null,
        orderId: done ? 'ord_01M4HVNHKX46GJABJTWA81TSKG' : null, finalAmount: done ? { amount: 32.34, currency: 'CAD' } : null };
    },
  };
  return { provider, calls };
}

function setup(opts: Parameters<typeof stubProvider>[0] & { confidence?: number; now?: () => Date } = {}) {
  const store = openStore(':memory:');
  store.seed();
  const { provider, calls } = stubProvider(opts);
  const models = Object.fromEntries(seedMachines().map((m) => [`plate_${m.id}`, m.nameplate_model]));
  let n = 0;
  const workflow = createWorkflow({
    store, provider, providerMode: 'mock', catalog: CATALOG, fx: FX_TO_MXN, now: opts.now ?? (() => NOW), newId: () => `id-${++n}`,
    evaluateGateA: gateA, evaluateGateB: gateB,
    analyzePhoto: async (photoId) => ({
      mode: 'replay',
      result: { nameplate_model: models[photoId] ?? null, hotend: null, visible_damage: ['none'], label_text: null, confidence: opts.confidence ?? 0.9 },
    }),
  });
  const server = createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true });
  return { store, workflow, server, calls };
}

const request = (machine: string, part: 'accelerometer_cable' | 'ptfe_tube' | 'nozzle') =>
  ({ machine_id: machine, part_type: part, hours_since_replace: 1000, photo_id: `plate_${machine}` });

describe('workflow', () => {
  it('REQ-1: si falla la fase A no llama a Reap (P2, MK3S contra tubo MK3S+)', async () => {
    const { workflow, calls } = setup();
    const r = await workflow.createProposal(request('P2', 'ptfe_tube'));
    if (r.status === 'needs_confirmation') throw new Error('se esperaba una propuesta');
    expect(r.status).toBe('rejected');
    expect(r.verification.phase_reached).toBe('A');
    expect(calls.quote).toHaveLength(0);
  });

  it('REQ-7: ITEMS_UNSHIPPABLE de Reap rechaza por envío (P3 en Guadalajara)', async () => {
    const { workflow, store } = setup();
    const r = await workflow.createProposal(request('P3', 'ptfe_tube'));
    expect(r.status).toBe('rejected');
    const view = store.getProposal(r.proposal_id!)!.view;
    expect(view.reason).toContain('no envía a MX');
    expect(view.verification.checks.at(-1)).toMatchObject({ rule: 'ships_to', phase: 'B', passed: false });
  });

  it('REQ-3: el tope se evalúa con finalAmount, no con el precio de catálogo (P4, 102 CAD)', async () => {
    const { workflow, store } = setup();
    const r = await workflow.createProposal(request('P4', 'nozzle'));
    expect(r.status).toBe('rejected');
    expect(store.getProposal(r.proposal_id!)!.view.quote_amount_company).toBe(1326);
  });

  it('REQ-5: P1 llega a paid y queda una sola fila en el libro', async () => {
    const { workflow, server, calls } = setup();
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    expect(r.status).toBe('proposed');
    const approved = await server.approveProposal(r.proposal_id!);
    expect(approved.checkout?.approvalUrl).toContain('prava');
    expect((await server.refreshProposal(r.proposal_id!)).status).toBe('approved');
    expect((await server.refreshProposal(r.proposal_id!)).status).toBe('paid');
    await server.refreshProposal(r.proposal_id!);
    const ledger = await server.getLedger();
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0]).toMatchObject({ order_id: 'ord_01M4HVNHKX46GJABJTWA81TSKG', amount_company: 420.42 });
    expect(calls.checkout).toEqual([`checkout:${r.proposal_id}:1`]);
  });

  it('dos aprobaciones simultáneas abren un solo checkout', async () => {
    const { workflow, server, calls } = setup();
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    await Promise.allSettled([server.approveProposal(r.proposal_id!), server.approveProposal(r.proposal_id!)]);
    expect(calls.checkout).toHaveLength(1);
  });

  it('REQ-4: un quote por vencer se recotiza con una key nueva antes del checkout', async () => {
    const { workflow, calls } = setup({ quoteExpiresAt: inMin(0.5) });
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    expect(r.status).toBe('proposed');
    await workflow.approve(r.proposal_id!);
    expect(calls.quote).toEqual([`quote:${r.proposal_id}:1`, `quote:${r.proposal_id}:2`]);
  });

  it('REQ-6: tras EXPIRED la propuesta queda failed y recotizar usa el intento siguiente', async () => {
    const { workflow, calls } = setup({ statuses: ['EXPIRED'] });
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    await workflow.approve(r.proposal_id!);
    expect((await workflow.refresh(r.proposal_id!)).status).toBe('failed');
    expect((await workflow.requote(r.proposal_id!)).status).toBe('proposed');
    expect(calls.quote.at(-1)).toBe(`quote:${r.proposal_id}:2`);
  });

  it('pago ambiguo: queda pendiente de conciliación y consultar repite la misma key, sin otra compra', async () => {
    const { workflow, server, calls } = setup({ checkoutFailures: [new ProviderError('RETRYABLE', 'timeout')] });
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    const pending = await server.approveProposal(r.proposal_id!);
    expect(pending.status).toBe('approved');
    expect(pending.checkout).toBeNull();
    expect(pending.reason).toContain('Pendiente de conciliación');
    expect((await server.requoteProposal(r.proposal_id!)).status).toBe('approved');
    await server.refreshProposal(r.proposal_id!);
    expect(calls.checkout).toEqual([`checkout:${r.proposal_id}:1`, `checkout:${r.proposal_id}:1`]);
    expect(calls.quote).toHaveLength(1);
    await server.refreshProposal(r.proposal_id!);
    const ledger = await server.getLedger();
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0]).toMatchObject({ part_type: 'accelerometer_cable', product_title: 'Prusa Accelerometer Cables' });
  });

  it('una propuesta cuyo quote venció después se puede recotizar sin aprobarla', async () => {
    const clock = { now: NOW };
    const { workflow, calls } = setup({ quoteExpiresAt: inMin(5), now: () => clock.now });
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    expect(r.status).toBe('proposed');
    clock.now = new Date(NOW.getTime() + 10 * 60_000);
    await workflow.requote(r.proposal_id!);
    expect(calls.quote).toEqual([`quote:${r.proposal_id}:1`, `quote:${r.proposal_id}:2`]);
  });

  it('una solicitud abierta no se duplica', async () => {
    const { workflow, calls } = setup();
    const a = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    const b = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    expect(b.proposal_id).toBe(a.proposal_id);
    expect(calls.quote).toHaveLength(1);
  });

  it('confianza baja pide confirmación y no crea propuesta', async () => {
    const { workflow, calls } = setup({ confidence: 0.69 });
    const r = await workflow.createProposal(request('P1', 'accelerometer_cable'));
    expect(r.status).toBe('needs_confirmation');
    expect(calls.quote).toHaveLength(0);
  });

  it('avanzar horas consume el repuesto y avisa stock bajo una vez', async () => {
    const { store, workflow } = setup();
    const low: string[] = [];
    const server = createRealServer({
      store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true,
      onLowStock: async (m, p) => { low.push(`${m}:${p}`); },
    });
    await server.advanceHours('P1', 30);
    const s = (await server.listStock()).find((x) => x.machine_id === 'P1')!;
    expect(s).toMatchObject({ qty: 0, hours_since_replace: 10 });
    expect(low).toEqual(['P1:accelerometer_cable']);
  });
});

describe('evidencia y detalle de máquina', () => {
  const vision = (model: string | null, confidence: number) => async () =>
    ({ mode: 'replay' as const, result: { nameplate_model: model, hotend: null, visible_damage: ['none' as const], label_text: null, confidence } });

  it('previewEvidence compara el modelo leído con el registrado sin crear propuesta', async () => {
    const { store, workflow } = setup();
    const ok = createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true, analyzePhoto: vision('Original Prusa MK3S', 0.95) });
    expect(await ok.previewEvidence('P2', 'plate_p2')).toMatchObject({ model_matches: true, enough_confidence: true, registered_model: 'Original Prusa MK3S' });
    const sticker = createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true, analyzePhoto: vision('Original Prusa MK3S+', 0.95) });
    expect((await sticker.previewEvidence('P2', 'plate_p2_sticker')).model_matches).toBe(false);
    const blurry = createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true, analyzePhoto: vision(null, 0.3) });
    expect((await blurry.previewEvidence('P2', 'unclear')).enough_confidence).toBe(false);
    expect(await ok.listProposals()).toHaveLength(0);
  });

  it('getMachineView junta máquina, planta, stock, propuestas y eventos', async () => {
    const { server, workflow } = setup();
    await workflow.createProposal(request('P1', 'accelerometer_cable'));
    const view = await server.getMachineView('P1');
    expect(view).toMatchObject({ machine: { id: 'P1' }, site: { id: 'tor' }, plate_photo_id: 'plate_p1' });
    expect(view!.stock).toHaveLength(1);
    expect(view!.proposals).toHaveLength(1);
    expect(view!.events.length).toBeGreaterThan(0);
    expect(await server.getMachineView('P9')).toBeNull();
  });
});
