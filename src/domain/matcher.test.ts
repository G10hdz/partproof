import { describe, expect, it } from 'vitest';
import type { Product } from '@/contracts';
import { matchProducts } from './matcher';

const p = (ref: string, part_type: Product['part_type']): Product => ({
  product_ref: ref, merchant: 'm', title: ref, variant_id: '1', price: 1, currency: 'CAD',
  part_type, compat_models: [], compat_hotends: [], ships_to: [], lead_time_days: 1,
});

describe('matchProducts', () => {
  it('devuelve solo los productos del part_type', () => {
    const catalog = [p('a', 'nozzle'), p('b', 'ptfe_tube'), p('c', 'nozzle')];
    expect(matchProducts('nozzle', catalog).map((x) => x.product_ref)).toEqual(['a', 'c']);
  });

  it('devuelve vacío sin coincidencia', () => {
    expect(matchProducts('thermistor', [p('a', 'nozzle')])).toEqual([]);
  });
});
