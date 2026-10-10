import { describe, expect, it } from 'vitest';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG } from './catalog';
import { openStore } from './db';
import { createMockProvider } from './payments';
import { createRealServer } from './real-server';
import { FX_TO_MXN } from './seed';
import { createWorkflow } from './workflow';

function build() {
  const store = openStore(':memory:');
  store.seed();
  const workflow = createWorkflow({
    store, provider: createMockProvider(), providerMode: 'mock', catalog: CATALOG, fx: FX_TO_MXN, evaluateGateA, evaluateGateB,
    analyzePhoto: async () => ({ mode: 'replay', result: { nameplate_model: 'Original Prusa MK4S', hotend: null, visible_damage: ['none'], label_text: null, confidence: 0.95 } }),
  });
  return { store, server: createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true }) };
}

describe('programadas con el flujo real', () => {
  it('P1 vencida crea una propuesta que pasa el gate y queda pendiente de aprobación', async () => {
    const { server, store } = build();
    const today = new Date().toISOString().slice(0, 10);
    const created = await server.createSchedule({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: `${today}T00:00:00.000Z`, repeat: 'once' });
    const ran = await server.runDueSchedules();
    expect(ran).toHaveLength(1);
    expect(ran[0].last_result?.status).toBe('proposed');
    const proposal = store.getProposal(ran[0].last_result!.proposal_id!)!.view;
    expect(proposal.status).toBe('proposed');
    expect(created.id).toBe(ran[0].id);
    expect((await server.listSchedules())[0].active).toBe(false);
  });
});
