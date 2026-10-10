// Arma el servidor real a partir del entorno: SQLite, gate, visión y proveedor de pago.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PartProofServer } from '@/contracts';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG } from './catalog';
import { openStore } from './db';
import { getPaymentProvider } from './payments';
import { createRealServer } from './real-server';
import { FX_TO_MXN } from './seed';
import { createVision, visionFromEnv } from './vision';
import { createWorkflow } from './workflow';

export function createBackend(env: Record<string, string | undefined> = process.env): PartProofServer {
  const dbPath = env.PARTPROOF_DB ?? path.join(process.cwd(), '.data', 'partproof.sqlite');
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const store = openStore(dbPath);
  const { provider, mode } = getPaymentProvider(env);
  const visionDeps = visionFromEnv(env);
  const vision = createVision(visionDeps);
  const workflow = createWorkflow({
    store, provider, providerMode: mode, analyzePhoto: vision.analyzePhoto,
    evaluateGateA, evaluateGateB, catalog: CATALOG, fx: FX_TO_MXN,
  });
  return createRealServer({
    store, workflow, providerMode: mode, visionMode: visionDeps.mode, demo: env.DEMO_MODE === '1',
    // Hasta que entre el MCP, el stock bajo abre la solicitud directo con la foto de la placa de la máquina.
    onLowStock: async (machineId, part) => {
      const stock = store.getStock(machineId, part);
      try {
        await workflow.createProposal({
          machine_id: machineId, part_type: part, hours_since_replace: stock?.hours_since_replace ?? 0,
          photo_id: `plate_${machineId.toLowerCase()}`,
        });
      } catch (err) {
        store.addEvent({
          id: crypto.randomUUID(), machine_id: machineId, source: 'klipper', created_at: new Date().toISOString(),
          payload: { tool: 'request_part', part_type: part, result: 'error', detail: err instanceof Error ? err.message : String(err) },
        });
      }
    },
  });
}
