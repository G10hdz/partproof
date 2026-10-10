// Exhaustividad y contratos de nombres. Los casos salen de las declaraciones (PART_TYPES, GATE_RULES,
// CHECKOUT_STATUSES, seedMachines, mcp-names); si alguien agrega un elemento sin cubrirlo, esto falla en CI.
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CHECKOUT_STATUSES, GATE_RULES, PART_TYPES,
  type CheckoutStatus, type ProposalStatus, type ProviderCheckout, type VisionResult,
} from '@/contracts';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG, cartUrl } from './catalog';
import { openStore } from './db';
import { callRequestPart, createMcpHandler } from './mcp';
import { MCP_PATH, MOONRAKER_PATH, mcpTokenKey, REQUEST_PART_TOOL } from './mcp-names';
import { createMockProvider } from './payments';
import { FX_TO_MXN, seedCompany, seedMachines, seedSites, seedStock } from './seed';
import { createWorkflow } from './workflow';

const ROOT = new URL('../../', import.meta.url);
const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('exhaustividad', () => {
  it('el gate evalúa cada regla de GATE_RULES exactamente una vez, en su fase', () => {
    const machine = seedMachines().find((m) => m.id === 'P1')!;
    const site = seedSites().find((s) => s.id === machine.site_id)!;
    const product = CATALOG.find((p) => p.part_type === 'accelerometer_cable')!;
    const vision: VisionResult = { nameplate_model: machine.nameplate_model, hotend: null, visible_damage: ['none'], label_text: null, confidence: 0.95 };
    const checks = [
      ...evaluateGateA({ machine, site, product, vision, photo_id: 'plate_p1', hours_since_replace: 10, checkout_url: cartUrl(product) }),
      ...evaluateGateB({
        company: seedCompany(), monthly_spend: 0, fx_to_company: FX_TO_MXN, now: new Date('2026-10-10T03:00:00Z'),
        quote: { id: 'q', checkoutUrl: cartUrl(product), merchantDomain: product.merchant, itemsSubtotal: { amount: 21.99, currency: 'CAD' },
          shipping: null, tax: null, finalAmount: { amount: 32.34, currency: 'CAD' }, expiresAt: '2026-10-10T03:10:00Z' },
      }),
    ];
    expect(checks.map((c) => c.rule).sort()).toEqual([...GATE_RULES].sort());
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it('cada tipo de pieza tiene producto en el catálogo y el seed solo usa tipos declarados', () => {
    for (const part of PART_TYPES) expect(CATALOG.some((p) => p.part_type === part), part).toBe(true);
    for (const s of seedStock()) expect(PART_TYPES).toContain(s.part_type);
  });

  // Tabla 5.2 del spec de pago. Agregar un estado a CHECKOUT_STATUSES sin decidir su mapeo rompe este test.
  const EXPECTED: Record<CheckoutStatus, ProposalStatus> = {
    REQUIRES_ACTION: 'approved', PROCESSING: 'approved', COMPLETED: 'paid', FAILED: 'failed', EXPIRED: 'failed',
  };
  it('la tabla de estados del checkout cubre CHECKOUT_STATUSES completo', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...CHECKOUT_STATUSES].sort());
  });

  it.each(CHECKOUT_STATUSES)('consultar un checkout %s deja la propuesta en el estado de la tabla', async (status) => {
    const getCheckout: ProviderCheckout = {
      id: 'co-1', status, approvalUrl: status === 'REQUIRES_ACTION' ? 'https://sandbox.collect.prava.space/x' : null, approvalExpiresAt: null,
      orderId: status === 'COMPLETED' ? 'ord_1' : null, finalAmount: status === 'COMPLETED' ? { amount: 32.34, currency: 'CAD' } : null,
    };
    const base = createMockProvider();
    const provider = { quote: base.quote, checkout: base.checkout, getCheckout: async () => getCheckout };
    const store = openStore(':memory:');
    store.seed();
    const workflow = createWorkflow({
      store, provider, providerMode: 'mock', catalog: CATALOG, fx: FX_TO_MXN, evaluateGateA, evaluateGateB,
      analyzePhoto: async () => ({ mode: 'replay', result: { nameplate_model: 'Original Prusa MK4S', hotend: null, visible_damage: ['none'], label_text: null, confidence: 0.95 } }),
    });
    const r = await workflow.createProposal({ machine_id: 'P1', part_type: 'accelerometer_cable', hours_since_replace: 10, photo_id: 'plate_p1' });
    await workflow.approve(r.proposal_id!);
    expect((await workflow.refresh(r.proposal_id!)).status).toBe(EXPECTED[status]);
  });
});

describe('contratos de nombres entre el agente de Klipper y el servidor', () => {
  const okProposal = { proposal_id: 'p', status: 'proposed', verification: { passed: true, phase_reached: 'B', checks: [] } };

  it('el servidor MCP registra la tool que llama el agente', async () => {
    process.env[mcpTokenKey('P1')] = 'token-p1';
    const handler = createMcpHandler({ createProposal: vi.fn().mockResolvedValue(okProposal), recordEvent: vi.fn().mockResolvedValue(undefined) });
    const client = new Client({ name: 'contract-test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://mcp.test${MCP_PATH}`), {
      requestInit: { headers: { authorization: 'Bearer token-p1' } },
      fetch: (input, init) => handler(new Request(input, init)),
    }));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain(REQUEST_PART_TOOL);
    await client.close();
  });

  it.each(seedMachines().map((m) => m.id))('la máquina %s del seed puede autenticarse y pedir por MCP', async (id) => {
    process.env[mcpTokenKey(id)] = `token-${id}`;
    const createProposal = vi.fn().mockResolvedValue(okProposal);
    const handler = createMcpHandler({ createProposal, recordEvent: vi.fn().mockResolvedValue(undefined) });
    const part = seedStock().find((s) => s.machine_id === id)!.part_type;
    const result = await callRequestPart(handler, `token-${id}`, { machine_id: id, part_type: part, hours: 1, photo_id: `plate_${id.toLowerCase()}` });
    expect(result.isError).toBe(false);
    expect(createProposal).toHaveBeenCalledWith(expect.objectContaining({ machine_id: id }));
  });

  it.each(seedMachines().map((m) => m.id))('.env.example documenta la llave de token de %s', (id) => {
    const keys = readFileSync(new URL('.env.example', ROOT), 'utf8').split('\n').map((l) => l.split('=')[0].trim());
    expect(keys).toContain(mcpTokenKey(id));
  });

  it('las rutas que llama el agente existen en la app', () => {
    for (const route of [MCP_PATH, MOONRAKER_PATH]) {
      expect(existsSync(new URL(`src/app${route}/route.ts`, ROOT)), route).toBe(true);
    }
  });

  it('la ruta de moonraker responde para cada máquina del seed con la foto de su placa', async () => {
    process.env.DEMO_MODE = '1';
    const { GET } = await import('../app/api/demo/moonraker/route');
    for (const m of seedMachines()) {
      const res = await GET(new Request(`http://app.test${MOONRAKER_PATH}?machine_id=${m.id}`));
      expect(res.status, m.id).toBe(200);
      const body = await res.json() as { machine_id: string; photo_id: string; stock: unknown[] };
      expect(body).toMatchObject({ machine_id: m.id, photo_id: `plate_${m.id.toLowerCase()}` });
      expect(existsSync(new URL(`demo/photos/${body.photo_id}.jpg`, ROOT)), body.photo_id).toBe(true);
    }
  });
});
