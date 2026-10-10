import type { ProposalView } from '@/contracts';

// Lo que el operador vio al aprobar: variante, quote y monto. Si cambia, hay que aprobar de nuevo.
export function approvalToken(p: Pick<ProposalView, 'product' | 'quote'>): string | null {
  if (!p.product || !p.quote) return null;
  const { finalAmount: a } = p.quote;
  return [p.product.product_ref, p.product.variant_id, p.quote.id, a.amount, a.currency].join('|');
}
