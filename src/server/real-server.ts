// PartProofServer real: SQLite más el workflow. La UI lo consume a través de src/server/api.ts.
import type { PartProofServer, PartType, VisionMode, VisionResult } from '@/contracts';
import { budgetFor, validateSettings } from '@/domain/budget';
import { normalizeModel } from '@/domain/compat';
import type { Store } from './db';
import { createSchedules } from './schedules';
import { MIN_CONFIDENCE, type Workflow } from './workflow';

export interface RealServerDeps {
  now?: () => Date;
  store: Store;
  workflow: Workflow;
  providerMode: 'mock' | 'reap';
  visionMode: VisionMode;
  demo: boolean;
  analyzePhoto?: (photoId: string) => Promise<{ result: VisionResult; mode: VisionMode }>;
  // Lo conecta el carril MCP: el agente de Klipper pide la pieza cuando el stock baja del mínimo.
  onLowStock?: (machineId: string, part: PartType) => Promise<void>;
}

export function createRealServer(deps: RealServerDeps): PartProofServer {
  const { store, workflow } = deps;
  if (store.isEmpty()) store.seed();
  const schedules = createSchedules({ store, createProposal: (input) => workflow.createProposal(input), now: deps.now });

  return {
    async getCompany() { return store.getCompany(); },
    async listSites() { return store.listSites(); },
    async listMachines() { return store.listMachines(); },
    async listStock() { return store.listStock(); },
    async listProposals() { return store.listProposals(); },
    async getProposal(id) { return store.getProposal(id)?.view ?? null; },
    async listEvents() { return store.listEvents(); },
    async getModes() { return { provider: deps.providerMode, vision: deps.visionMode, demo: deps.demo }; },

    async getLedger() {
      const rows = store.listPurchases();
      const company = store.getCompany();
      const total = (machineId?: string) =>
        Math.round(rows.filter((r) => !machineId || r.machine_id === machineId).reduce((s, r) => s + r.amount_company, 0) * 100) / 100;
      return {
        rows, monthly_total: workflow.monthlySpend(), monthly_budget: budgetFor(company, new Date()), currency: company.currency,
        cost_per_hour: store.listMachines().map((m) => ({
          machine_id: m.id, amount: m.hours_total > 0 ? Math.round((total(m.id) / m.hours_total) * 100) / 100 : null,
        })),
      };
    },

    async getMachineView(machineId) {
      const machine = store.getMachine(machineId);
      const site = machine && store.getSite(machine.site_id);
      if (!machine || !site) return null;
      return {
        machine, site,
        stock: store.listStock().filter((s) => s.machine_id === machineId),
        proposals: store.listProposals().filter((p) => p.machine_id === machineId),
        events: store.listEvents().filter((e) => e.machine_id === machineId),
        plate_photo_id: `plate_${machineId.toLowerCase()}`,
      };
    },

    // Lee la foto sin crear propuesta. Confirmar el modelo aquí no salta el gate: la propuesta se crea aparte.
    async previewEvidence(machineId, photoId) {
      const machine = store.getMachine(machineId);
      if (!machine) throw new Error(`Máquina ${machineId} no existe`);
      if (!deps.analyzePhoto) throw new Error('La visión no está configurada');
      const { result, mode } = await deps.analyzePhoto(photoId);
      const model_matches = !!result.nameplate_model && normalizeModel(result.nameplate_model) === normalizeModel(machine.nameplate_model);
      const enough_confidence = !!result.nameplate_model && result.confidence >= MIN_CONFIDENCE;
      store.addEvent({
        id: crypto.randomUUID(), machine_id: machineId, source: 'photo', created_at: new Date().toISOString(),
        payload: { photo_id: photoId, nameplate_model: result.nameplate_model, confidence: result.confidence, model_matches, mode },
      });
      return { photo_id: photoId, machine_id: machineId, registered_model: machine.nameplate_model, vision: result, mode, model_matches, enough_confidence };
    },

    approveProposal: (id) => workflow.approve(id),
    refreshProposal: (id) => workflow.refresh(id),
    requoteProposal: (id) => workflow.requote(id),
    async rejectProposal(id) { return workflow.reject(id); },

    // Consume un repuesto cada vez que la pieza cumple su vida nominal; nunca deja stock negativo.
    async advanceHours(machineId, hours) {
      if (!Number.isFinite(hours) || hours < 0) throw new Error('Horas inválidas');
      const low: PartType[] = store.tx(() => {
        const machine = store.getMachine(machineId);
        if (!machine) throw new Error(`Máquina ${machineId} no existe`);
        store.putMachine({ ...machine, hours_total: machine.hours_total + hours });
        const crossed: PartType[] = [];
        for (const s of store.listStock().filter((x) => x.machine_id === machineId)) {
          let { qty, hours_since_replace } = s;
          hours_since_replace += hours;
          while (hours_since_replace >= s.rated_life_hours && qty > 0) {
            qty -= 1;
            hours_since_replace -= s.rated_life_hours;
          }
          store.putStock({ ...s, qty, hours_since_replace });
          // Solo al cruzar el mínimo: si ya estaba abajo, la solicitud ya se abrió en un avance anterior.
          if (s.qty >= s.min_qty && qty < s.min_qty) crossed.push(s.part_type);
        }
        return crossed;
      });
      for (const part of low) await deps.onLowStock?.(machineId, part);
    },

    async saveSettings(input) {
      validateSettings(input);
      const company = store.getCompany();
      store.putCompany({
        ...company, monthly_budget: input.monthly_budget, purchase_cap: input.purchase_cap,
        budget_overrides: input.budget_overrides ?? company.budget_overrides ?? {},
      });
    },

    async resetDemo() {
      if (!deps.demo) throw new Error('resetDemo solo existe con DEMO_MODE=1');
      store.seed();
    },
    createProposal: (input) => workflow.createProposal(input),
    async listSchedules() { return schedules.list(); },
    async createSchedule(input) { return schedules.create(input); },
    async cancelSchedule(id) { return schedules.cancel(id); },
    async runDueSchedules() { return schedules.runDue(); },
    async recordEvent(event) {
      store.addEvent({ ...event, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    },
  };
}
