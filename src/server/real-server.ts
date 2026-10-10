// PartProofServer real: SQLite más el workflow. La UI lo consume a través de src/server/api.ts.
import type { PartProofServer, PartType, VisionMode } from '@/contracts';
import type { Store } from './db';
import type { Workflow } from './workflow';

export interface RealServerDeps {
  store: Store;
  workflow: Workflow;
  providerMode: 'mock' | 'reap';
  visionMode: VisionMode;
  demo: boolean;
  // Lo conecta el carril MCP: el agente de Klipper pide la pieza cuando el stock baja del mínimo.
  onLowStock?: (machineId: string, part: PartType) => Promise<void>;
}

export function createRealServer(deps: RealServerDeps): PartProofServer {
  const { store, workflow } = deps;
  if (store.isEmpty()) store.seed();

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
        rows, monthly_total: workflow.monthlySpend(), monthly_budget: company.monthly_budget, currency: company.currency,
        cost_per_hour: store.listMachines().map((m) => ({
          machine_id: m.id, amount: m.hours_total > 0 ? Math.round((total(m.id) / m.hours_total) * 100) / 100 : null,
        })),
      };
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
          if (qty < s.min_qty) crossed.push(s.part_type);
        }
        return crossed;
      });
      for (const part of low) await deps.onLowStock?.(machineId, part);
    },

    async saveSettings(input) {
      const ok = (n: number) => Number.isFinite(n) && n >= 0;
      if (!ok(input.monthly_budget) || !ok(input.purchase_cap)) throw new Error('Presupuesto o tope inválido');
      store.putCompany({ ...store.getCompany(), ...input });
    },

    async resetDemo() {
      if (!deps.demo) throw new Error('resetDemo solo existe con DEMO_MODE=1');
      store.seed();
    },
  };
}
