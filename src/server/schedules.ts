// Compras programadas: al vencer crean una propuesta con el createProposal de siempre. Nunca aprueban ni pagan.
import type { RequestPartInput, RequestPartResult, Schedule, ScheduleInput } from '@/contracts';
import { monthlyRunAfter } from '@/domain/schedule';
import type { Store } from './db';

export interface SchedulesDeps {
  store: Store;
  createProposal(input: RequestPartInput): Promise<RequestPartResult>;
  now?: () => Date;
  newId?: () => string;
}

type Outcome = NonNullable<Schedule['last_result']>;
const REPEATS: readonly string[] = ['once', 'monthly'];

export function createSchedules(deps: SchedulesDeps) {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());

  function create(input: ScheduleInput): Schedule {
    const machine = store.getMachine(input.machine_id);
    if (!machine) throw new Error(`Máquina ${input.machine_id} no existe`);
    if (!store.getStock(machine.id, input.part_type)) throw new Error('La máquina no usa esa pieza');
    if (!REPEATS.includes(input.repeat)) throw new Error('Repetición inválida');
    const at = new Date(input.next_run);
    // Fecha inexistente (31 de febrero): el ISO de salida ya no coincide con el día pedido.
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== input.next_run.slice(0, 10)) throw new Error('Fecha inválida');
    const t = now();
    if (at.getTime() < Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) throw new Error('La fecha ya pasó');
    const schedule: Schedule = {
      id: newId(), machine_id: machine.id, part_type: input.part_type, next_run: at.toISOString(), anchor_day: at.getUTCDate(),
      repeat: input.repeat, active: true, created_at: t.toISOString(), last_run: null, last_result: null,
    };
    store.putSchedule(schedule);
    return schedule;
  }

  function cancel(id: string): Schedule {
    const current = store.getSchedule(id);
    if (!current) throw new Error(`Programación ${id} no existe`);
    const next = { ...current, active: false };
    store.putSchedule(next);
    return next;
  }

  async function fire(s: Schedule): Promise<Outcome> {
    const stock = store.getStock(s.machine_id, s.part_type);
    if (!stock) return { status: 'error', proposal_id: null, message: 'La máquina ya no usa esa pieza' };
    const open = store.findOpenProposal(s.machine_id, s.part_type);
    if (open) return { status: 'skipped', proposal_id: open.view.id, message: 'Ya había una solicitud abierta para esta pieza' };
    try {
      const r = await deps.createProposal({
        machine_id: s.machine_id, part_type: s.part_type, hours_since_replace: stock.hours_since_replace,
        photo_id: `plate_${s.machine_id.toLowerCase()}`, note: 'Compra programada',
      });
      if (r.proposal_id === null) return { status: 'error', proposal_id: null, message: r.reason };
      if (r.status === 'proposed') return { status: 'proposed', proposal_id: r.proposal_id, message: 'Propuesta lista para aprobar' };
      return { status: 'rejected', proposal_id: r.proposal_id, message: store.getProposal(r.proposal_id)?.view.reason ?? 'El gate rechazó la propuesta' };
    } catch (err) {
      return { status: 'error', proposal_id: null, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async function runDue(): Promise<Schedule[]> {
    const t = now();
    const ran: Schedule[] = [];
    for (const due of store.listSchedules().filter((s) => s.active && Date.parse(s.next_run) <= t.getTime())) {
      // Reservar antes de cotizar: una segunda ejecución concurrente ya no la ve vencida.
      const claimed = store.tx(() => {
        const current = store.getSchedule(due.id);
        if (!current || !current.active || Date.parse(current.next_run) > t.getTime()) return null;
        store.putSchedule(current.repeat === 'monthly'
          ? { ...current, next_run: monthlyRunAfter(current.next_run, current.anchor_day, t) }
          : { ...current, active: false });
        return current;
      });
      if (!claimed) continue;
      const result = await fire(claimed);
      const done: Schedule = { ...store.getSchedule(claimed.id)!, last_run: t.toISOString(), last_result: result };
      store.putSchedule(done);
      ran.push(done);
    }
    return ran;
  }

  return { list: () => store.listSchedules(), create, cancel, runDue };
}

export type Schedules = ReturnType<typeof createSchedules>;
