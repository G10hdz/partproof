import type { LedgerView } from '@/contracts';

// Las celdas que empiezan con = + - @ se neutralizan para que una hoja de cálculo no las ejecute.
const cell = (value: string | number) => {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function ledgerCsv(ledger: LedgerView): string {
  const header = ['fecha', 'maquina', 'planta', 'pieza', 'producto', 'orden', 'proveedor', 'monto', 'moneda', `monto_${ledger.currency}`];
  const rows = ledger.rows.map((r) => [
    r.created_at, r.machine_id, r.site_id, r.part_type, r.product_title, r.order_id, r.provider,
    r.amount.amount, r.amount.currency, r.amount_company,
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}
