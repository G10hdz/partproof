'use server';
// Server Actions que consume la UI. Validan la entrada y delegan en src/server/api.ts;
// nunca aceptan merchant, variante ni precio desde el cliente.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { EvidencePreview, ProposalView, RequestPartResult } from '@/contracts';
import { server } from '@/server/api';

const Id = z.string().trim().min(1).max(100);
const Hours = z.number().finite().min(0).max(10_000);
const Money = z.number().finite().min(0).max(10_000_000);

const PATHS = ['/', '/proposals', '/ledger', '/mcp-log', '/watch'];
const refresh = () => { for (const p of PATHS) revalidatePath(p); };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado' };
  }
}

// Crea el checkout en Reap; mostrar data.checkout.approvalUrl como QR.
export async function approveProposal(id: string): Promise<ActionResult<ProposalView>> {
  return run(() => server.approveProposal(Id.parse(id)));
}

// Llamar cada 2 s mientras data.status sea 'approved'.
export async function refreshProposal(id: string): Promise<ActionResult<ProposalView>> {
  return run(() => server.refreshProposal(Id.parse(id)));
}

export async function requoteProposal(id: string): Promise<ActionResult<ProposalView>> {
  return run(() => server.requoteProposal(Id.parse(id)));
}

export async function rejectProposal(id: string): Promise<ActionResult<ProposalView>> {
  return run(() => server.rejectProposal(Id.parse(id)));
}

export async function advanceHours(machineId: string, hours: number): Promise<ActionResult<null>> {
  return run(async () => { await server.advanceHours(Id.parse(machineId), Hours.parse(hours)); return null; });
}

export async function saveSettings(input: { monthly_budget: number; purchase_cap: number }): Promise<ActionResult<null>> {
  const parsed = z.object({ monthly_budget: Money, purchase_cap: Money }).strict().parse(input);
  return run(async () => { await server.saveSettings(parsed); return null; });
}

export async function resetDemo(): Promise<ActionResult<null>> {
  return run(async () => {
    if (process.env.DEMO_MODE !== '1') throw new Error('resetDemo solo existe con DEMO_MODE=1');
    await server.resetDemo();
    return null;
  });
}

// Lee una foto de evidencia y la compara con el modelo registrado, sin crear propuesta.
export async function previewEvidence(machineId: string, photoId: string): Promise<ActionResult<EvidencePreview>> {
  return run(() => server.previewEvidence(Id.parse(machineId), Id.parse(photoId)));
}

// Envía la evidencia: abre la solicitud de la máquina con esa foto. El gate decide igual que por MCP.
export async function submitEvidence(machineId: string, partType: string, photoId: string): Promise<ActionResult<RequestPartResult>> {
  const part = z.enum(['ptfe_tube', 'thermistor', 'accelerometer_cable', 'nozzle']).parse(partType);
  return run(async () => {
    const id = Id.parse(machineId);
    const stock = (await server.listStock()).find((s) => s.machine_id === id && s.part_type === part);
    if (!stock) throw new Error(`La máquina ${id} no usa esa pieza`);
    return server.createProposal({ machine_id: id, part_type: part, hours_since_replace: stock.hours_since_replace, photo_id: Id.parse(photoId) });
  });
}
