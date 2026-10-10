// Arma el servidor real a partir del entorno: SQLite, gate, visión y proveedor de pago.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PartProofServer } from '@/contracts';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG } from './catalog';
import { openStore } from './db';
import { callRequestPart, createMcpHandler } from './mcp';
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
  let mcp: ReturnType<typeof createMcpHandler> | null = null;
  const server = createRealServer({
    store, workflow, providerMode: mode, visionMode: visionDeps.mode, demo: env.DEMO_MODE === '1',
    // La máquina pide su refacción por MCP con su propio token; sin token configurado, la solicitud se abre directo.
    onLowStock: async (machineId, part) => {
      const stock = store.getStock(machineId, part);
      const args = {
        machine_id: machineId, part_type: part, hours: stock?.hours_since_replace ?? 0,
        photo_id: `plate_${machineId.toLowerCase()}`,
      };
      const token = env[`MCP_TOKEN_${machineId}`];
      try {
        if (token && mcp) {
          const result = await callRequestPart(mcp, token, args);
          if (result.isError) throw new Error(result.text);
          return;
        }
        await workflow.createProposal({
          machine_id: machineId, part_type: part, hours_since_replace: args.hours, photo_id: args.photo_id,
        });
      } catch (err) {
        store.addEvent({
          id: crypto.randomUUID(), machine_id: machineId, source: 'klipper', created_at: new Date().toISOString(),
          payload: { tool: 'request_part', part_type: part, result: 'error', detail: err instanceof Error ? err.message : String(err) },
        });
      }
    },
  });
  mcp = createMcpHandler({ createProposal: (input) => server.createProposal(input), recordEvent: (e) => server.recordEvent(e) });
  return server;
}
