// Presupuesto mensual con excepciones por mes. Puro: sin red ni base de datos.
import type { Company, SettingsInput } from '@/contracts';

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function budgetFor(company: Pick<Company, 'monthly_budget' | 'budget_overrides'>, now: Date): number {
  return company.budget_overrides?.[monthKey(now)] ?? company.monthly_budget;
}

const amount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function validateSettings(input: SettingsInput): void {
  if (!amount(input.monthly_budget) || !amount(input.purchase_cap)) throw new Error('Presupuesto o tope inválido');
  if (input.purchase_cap > input.monthly_budget) throw new Error('El tope por compra no puede superar el presupuesto mensual');
  for (const [month, value] of Object.entries(input.budget_overrides ?? {})) {
    if (!MONTH_KEY.test(month)) throw new Error(`Mes inválido: ${month}`);
    if (!amount(value)) throw new Error(`Presupuesto inválido para ${month}`);
    if (input.purchase_cap > value) throw new Error(`El tope por compra supera el presupuesto de ${month}`);
  }
}
