import type { Stock } from '@/contracts';

// Política de reabastecimiento: se solicita solo cuando el stock baja del mínimo.
export function shouldRequest(stock: Pick<Stock, 'qty' | 'min_qty'>): boolean {
  return stock.qty < stock.min_qty;
}
