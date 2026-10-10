import type { GateCheck, GateRule, Money, PartType, ProposalStatus } from '@/contracts';

export const PART_LABELS: Record<PartType, string> = { accelerometer_cable: 'Cable de acelerómetro', ptfe_tube: 'Tubo PTFE', thermistor: 'Termistor', nozzle: 'Boquilla' };
export const STATUS_LABELS: Record<ProposalStatus, string> = { proposed: 'Pendiente de aprobación', approved: 'En pago', rejected: 'Rechazada', paid: 'Pagada', failed: 'Pago fallido' };
export const RULE_LABELS: Record<GateRule, string> = { evidence: 'Evidencia', compat: 'Compatibilidad', variant_exact: 'Variante exacta', ships_to: 'Envío al destino', price_cap: 'Tope por compra', budget: 'Presupuesto', quote_valid: 'Cotización vigente' };
export const GATE_GROUPS: { phase: 'A' | 'B'; title: string; rules: GateRule[] }[] = [
  { phase: 'A', title: 'Fase A · sin red', rules: ['evidence', 'compat', 'variant_exact', 'ships_to'] },
  { phase: 'B', title: 'Fase B · sobre la cotización de Reap', rules: ['price_cap', 'budget', 'quote_valid'] },
];

export const money = (m: Money | number | null, currency = 'MXN') =>
  m === null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: typeof m === 'number' ? currency : m.currency }).format(typeof m === 'number' ? m : m.amount);
export const dateTime = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

export const gateCheck = (checks: GateCheck[], rule: GateRule) => checks.find((c) => c.rule === rule);
export const isExpired = (iso: string | null | undefined, now: number) => !!iso && Date.parse(iso) <= now;
export const lifePercent = (since: number, rated: number) => Math.min(100, Math.round((since / rated) * 100));
