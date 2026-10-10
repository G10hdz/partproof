import type { Schedule } from '@/contracts';

export const sched = (o: Partial<Schedule> = {}): Schedule => ({
  id: 's1', machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-01T00:00:00.000Z', anchor_day: 1,
  repeat: 'once', active: true, created_at: '2026-09-01T00:00:00.000Z', last_run: null, last_result: null, ...o,
});
