import { describe, expect, it } from 'vitest';
import type { RequestPartInput, RequestPartResult } from '@/contracts';
import { openStore } from './db';
import { sched } from './schedule-fixtures';
import { createSchedules } from './schedules';

const NOW = new Date('2026-10-10T12:00:00Z');
const PROPOSED = (id: string): RequestPartResult => ({
  proposal_id: id, status: 'proposed', verification: { passed: true, phase_reached: 'B', checks: [] },
});

function setup(script: (input: RequestPartInput) => Promise<RequestPartResult> = async () => PROPOSED('pr-1')) {
  const store = openStore(':memory:');
  store.seed();
  const calls: RequestPartInput[] = [];
  let n = 0;
  const schedules = createSchedules({
    store, now: () => NOW, newId: () => `sch-${++n}`,
    createProposal: async (input) => { calls.push(input); return script(input); },
  });
  return { store, schedules, calls };
}

describe('crear y cancelar', () => {
  it('crea con el día ancla de la fecha y la guarda activa', () => {
    const { schedules, store } = setup();
    const s = schedules.create({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-31T00:00:00.000Z', repeat: 'monthly' });
    expect(s).toMatchObject({ id: 'sch-1', active: true, anchor_day: 31, last_run: null, last_result: null });
    expect(store.getSchedule('sch-1')).toEqual(s);
  });
  it.each([
    ['máquina inexistente', { machine_id: 'PX', part_type: 'nozzle', next_run: '2026-10-31T00:00:00.000Z', repeat: 'once' }],
    ['pieza que la máquina no usa', { machine_id: 'P1', part_type: 'nozzle', next_run: '2026-10-31T00:00:00.000Z', repeat: 'once' }],
    ['fecha pasada', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-09T00:00:00.000Z', repeat: 'once' }],
    ['fecha inexistente', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-02-31T00:00:00.000Z', repeat: 'once' }],
    ['repetición inválida', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-31T00:00:00.000Z', repeat: 'weekly' }],
  ] as const)('rechaza %s', (_name, input) => {
    const { schedules, store } = setup();
    expect(() => schedules.create(input as never)).toThrow();
    expect(store.listSchedules()).toHaveLength(0);
  });
  it('permite programar para hoy', () => {
    const { schedules } = setup();
    expect(() => schedules.create({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-10T00:00:00.000Z', repeat: 'once' })).not.toThrow();
  });
  it('cancelar desactiva y conserva el historial; id desconocido lanza', () => {
    const { schedules, store } = setup();
    store.putSchedule(sched());
    expect(schedules.cancel('s1').active).toBe(false);
    expect(() => schedules.cancel('nope')).toThrow();
  });
});

describe('runDue', () => {
  it('una vez: crea la propuesta con la placa registrada y se desactiva', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    const ran = await schedules.runDue();
    expect(ran).toHaveLength(1);
    expect(calls).toEqual([{ machine_id: 'P1', part_type: 'accelerometer_cable', hours_since_replace: 1480, photo_id: 'plate_p1', note: 'Reposición programada' }]);
    expect(store.getSchedule('s1')).toMatchObject({
      active: false, last_run: NOW.toISOString(), last_result: { status: 'proposed', proposal_id: 'pr-1' },
    });
  });
  it('no toca las que aún no vencen ni las canceladas', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-11T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'b', next_run: '2026-10-01T00:00:00.000Z', active: false }));
    expect(await schedules.runDue()).toEqual([]);
    expect(calls).toHaveLength(0);
  });
  it('ejecutar dos veces seguidas no duplica', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(await schedules.runDue()).toEqual([]);
    expect(calls).toHaveLength(1);
  });
  it('dos ejecuciones concurrentes crean una sola propuesta', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await Promise.all([schedules.runDue(), schedules.runDue()]);
    expect(calls).toHaveLength(1);
  });
  it('mensual: sigue activa y salta a la próxima fecha futura, una propuesta aunque falten meses', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ repeat: 'monthly', anchor_day: 31, next_run: '2026-07-31T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(1);
    expect(store.getSchedule('s1')).toMatchObject({ active: true, next_run: '2026-10-31T00:00:00.000Z' });
  });
  it('con propuesta abierta queda skipped y no llama a createProposal', async () => {
    const { schedules, store, calls } = setup();
    store.putProposal({
      id: 'open-1', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable', status: 'proposed', product: null, quote: null,
      quote_amount_company: null, checkout: null, provider: 'mock', verification: { passed: false, phase_reached: 'A', checks: [] },
      reason: null, hours_since_replace: 1, photo_id: 'plate_p1', created_at: NOW.toISOString(),
    }, 1);
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(0);
    expect(store.getSchedule('s1')?.last_result).toMatchObject({ status: 'skipped', proposal_id: 'open-1' });
  });
  it('rechazo del gate: guarda la razón de la propuesta', async () => {
    const { schedules, store } = setup(async () => {
      store.putProposal({
        id: 'pr-9', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable', status: 'rejected', product: null, quote: null,
        quote_amount_company: null, checkout: null, provider: 'mock', verification: { passed: false, phase_reached: 'B', checks: [] },
        reason: 'Total excede el tope', hours_since_replace: 1, photo_id: 'plate_p1', created_at: NOW.toISOString(),
      }, 1);
      return { proposal_id: 'pr-9', status: 'rejected', verification: { passed: false, phase_reached: 'B', checks: [] } };
    });
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(store.getSchedule('s1')?.last_result).toMatchObject({ status: 'rejected', proposal_id: 'pr-9', message: 'Total excede el tope' });
  });
  it('needs_confirmation y excepciones quedan como error sin romper las demás', async () => {
    let n = 0;
    const { schedules, store } = setup(async () => {
      n += 1;
      if (n === 1) return { proposal_id: null, status: 'needs_confirmation', reason: 'Placa ilegible' };
      throw new Error('Reap caído');
    });
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-01T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'b', next_run: '2026-10-02T00:00:00.000Z' }));
    await schedules.runDue();
    expect(store.getSchedule('a')?.last_result).toMatchObject({ status: 'error', message: 'Placa ilegible' });
    expect(store.getSchedule('b')?.last_result).toMatchObject({ status: 'error', message: 'Reap caído' });
  });
  it('pieza que ya no está en el stock queda como error', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ part_type: 'nozzle', next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(0);
    expect(store.getSchedule('s1')?.last_result?.status).toBe('error');
  });
});
