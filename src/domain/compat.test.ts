import { describe, expect, it } from 'vitest';
import { normalizeModel } from './compat';

describe('normalizeModel', () => {
  it('aplica alias explícitos', () => {
    expect(normalizeModel('Original Prusa MK3S')).toBe('MK3S');
    expect(normalizeModel('Original Prusa MK3S+')).toBe('MK3S+');
    expect(normalizeModel('Original Prusa MK4S')).toBe('MK4S');
  });

  it('no confunde MK3S con MK3S+ por prefijo', () => {
    expect(normalizeModel('Original Prusa MK3S')).not.toBe('MK3S+');
    expect(normalizeModel('MK3S')).not.toBe('MK3S+');
  });

  it('preserva modelos sin alias y recorta espacios', () => {
    expect(normalizeModel('Creality K1')).toBe('Creality K1');
    expect(normalizeModel('  MK3S  ')).toBe('MK3S');
  });
});
