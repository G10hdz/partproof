import type { PartType, Product } from '@/contracts';

// Por part_type devuelve los productos del catálogo que aplican.
export function matchProducts(part: PartType, catalog: Product[]): Product[] {
  return catalog.filter((p) => p.part_type === part);
}
