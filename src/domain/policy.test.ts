import { describe, expect, it } from 'vitest';
import { shouldRequest } from './policy';

describe('shouldRequest', () => {
  it('no solicita con stock en el mínimo', () => {
    expect(shouldRequest({ qty: 1, min_qty: 1 })).toBe(false);
  });

  it('solicita cuando el stock baja del mínimo', () => {
    expect(shouldRequest({ qty: 0, min_qty: 1 })).toBe(true);
  });
});
