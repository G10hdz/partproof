import { describe, expect, it } from 'vitest';
import { openStore } from './db';
import { sched } from './schedule-fixtures';

describe('store de programaciones', () => {
  it('guarda, lee, actualiza y ordena por fecha', () => {
    const store = openStore(':memory:');
    store.putSchedule(sched({ id: 'b', next_run: '2026-11-01T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-01T00:00:00.000Z' }));
    expect(store.listSchedules().map((s) => s.id)).toEqual(['a', 'b']);
    store.putSchedule(sched({ id: 'a', active: false }));
    expect(store.getSchedule('a')?.active).toBe(false);
    expect(store.getSchedule('nope')).toBeNull();
  });
  it('seed() borra las programaciones', () => {
    const store = openStore(':memory:');
    store.putSchedule(sched());
    store.seed();
    expect(store.listSchedules()).toEqual([]);
  });
});
