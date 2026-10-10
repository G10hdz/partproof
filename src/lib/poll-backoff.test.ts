import { describe, expect, it } from 'vitest';
import { pollDelay } from './poll-backoff';

describe('pollDelay', () => {
  it('crece de 2 a 30 s y se queda en el tope', () => {
    expect([0, 1, 2, 3].map((s) => pollDelay(s))).toEqual([2_000, 5_000, 10_000, 30_000]);
    expect(pollDelay(8)).toBe(30_000);
  });

  it('un Retry-After del proveedor manda sobre el paso, con tope de 60 s', () => {
    expect(pollDelay(0, 45_000)).toBe(45_000);
    expect(pollDelay(2, 1_000)).toBe(10_000);
    expect(pollDelay(3, 120_000)).toBe(60_000);
  });
});
