// El guion del demo como prueba: gate real, proveedor mock con respuestas del sandbox y visión inyectada.
// Con REAP_E2E=1 la segunda suite corre lo mismo contra el sandbox real (quote y checkout, sin aprobar).
import { describe, expect, it } from 'vitest';
import type { PaymentProvider, VisionResult } from '@/contracts';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG } from './catalog';
import { openStore } from './db';
import { createMockProvider, getPaymentProvider } from './payments';
import { createRealServer } from './real-server';
import { FX_TO_MXN, seedMachines } from './seed';
import { createWorkflow } from './workflow';

const MODELS = Object.fromEntries(seedMachines().map((m) => [`plate_${m.id.toLowerCase()}`, m.nameplate_model]));
const vision = async (photoId: string) => ({
  mode: 'replay' as const,
  result: { nameplate_model: MODELS[photoId] ?? null, hotend: null, visible_damage: ['none'], label_text: null, confidence: 0.95 } as VisionResult,
});

function demo(provider: PaymentProvider, providerMode: 'mock' | 'reap') {
  const store = openStore(':memory:');
  store.seed();
  const workflow = createWorkflow({
    store, provider, providerMode, analyzePhoto: vision, evaluateGateA, evaluateGateB, catalog: CATALOG, fx: FX_TO_MXN,
  });
  const server = createRealServer({ store, workflow, providerMode, visionMode: 'replay', demo: true });
  const request = async (machine: string, part: 'accelerometer_cable' | 'ptfe_tube' | 'nozzle') => {
    const r = await workflow.createProposal({ machine_id: machine, part_type: part, hours_since_replace: 1000, photo_id: `plate_${machine.toLowerCase()}` });
    if (!r.proposal_id) throw new Error(`sin propuesta para ${machine}: ${r.status}`);
    return store.getProposal(r.proposal_id)!.view;
  };
  return { server, request };
}

function countingMock() {
  const inner = createMockProvider();
  const calls = { quote: 0 };
  const provider: PaymentProvider = {
    quote: (i) => { calls.quote += 1; return inner.quote(i); },
    checkout: (i) => inner.checkout(i),
    getCheckout: (id) => inner.getCheckout(id),
  };
  return { provider, calls };
}

describe('guion del demo con mock', () => {
  it('P1 pasa el gate y llega a paid con el total del sandbox', async () => {
    const { server, request } = demo(createMockProvider(), 'mock');
    const p1 = await request('P1', 'accelerometer_cable');
    expect(p1.status).toBe('proposed');
    expect(p1.quote?.finalAmount).toEqual({ amount: 32.34, currency: 'CAD' });
    expect((await server.approveProposal(p1.id)).checkout?.approvalUrl).toBeTruthy();
    await server.refreshProposal(p1.id);
    expect((await server.refreshProposal(p1.id)).status).toBe('paid');
    expect((await server.getLedger()).rows[0]).toMatchObject({ machine_id: 'P1', amount_company: 420.42 });
  });

  it('P2 se rechaza en fase A por compatibilidad, sin cotizar', async () => {
    const { provider, calls } = countingMock();
    const { request } = demo(provider, 'mock');
    const p2 = await request('P2', 'ptfe_tube');
    expect(p2.status).toBe('rejected');
    expect(p2.reason).toBe('Esta pieza solo es compatible con MK3S+, MMU2S; la placa dice MK3S');
    expect(calls.quote).toBe(0);
  });

  it('P3 en Guadalajara recibe ITEMS_UNSHIPPABLE', async () => {
    const { request } = demo(createMockProvider(), 'mock');
    const p3 = await request('P3', 'ptfe_tube');
    expect(p3.status).toBe('rejected');
    expect(p3.reason).toContain('no envía a MX (ITEMS_UNSHIPPABLE)');
  });

  it('P4 se rechaza por tope: 102 CAD con envío desde Australia', async () => {
    const { request } = demo(createMockProvider(), 'mock');
    const p4 = await request('P4', 'nozzle');
    expect(p4.status).toBe('rejected');
    expect(p4.quote_amount_company).toBe(1326);
    expect(p4.verification.checks.find((c) => c.rule === 'price_cap')).toMatchObject({ passed: false, phase: 'B' });
  });
});

describe.runIf(process.env.REAP_E2E === '1')('guion del demo contra el sandbox de Reap', () => {
  it('P1, P3 y P4 contra el sandbox real; P1 queda esperando la aprobación hosted', async () => {
    const { provider, mode } = getPaymentProvider({ ...process.env, PAYMENT_PROVIDER: 'reap' });
    const { server, request } = demo(provider, mode);
    const p1 = await request('P1', 'accelerometer_cable');
    expect(p1.status).toBe('proposed');
    const approved = await server.approveProposal(p1.id);
    expect(approved.checkout?.status).toBe('REQUIRES_ACTION');
    expect(approved.checkout?.approvalUrl).toMatch(/^https:\/\//);
    const p3 = await request('P3', 'ptfe_tube');
    expect(p3.reason).toContain('ITEMS_UNSHIPPABLE');
    const p4 = await request('P4', 'nozzle');
    expect(p4.status).toBe('rejected');
    expect(p4.verification.checks.find((c) => c.rule === 'price_cap')?.passed).toBe(false);
    console.log(JSON.stringify({
      p1: { status: approved.status, total: approved.quote?.finalAmount, approvalUrl: approved.checkout?.approvalUrl?.replace(/session=.*/, 'session=…') },
      p3: p3.reason, p4: { total: p4.quote?.finalAmount, mxn: p4.quote_amount_company },
    }, null, 2));
  }, 120_000);
});
