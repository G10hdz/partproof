// Gate determinista en dos fases.
// Fase A (sin red): evidence, compat, variant_exact, ships_to.
// Fase B (sobre el quote de Reap): price_cap, budget, quote_valid. Razones en español.
import type { GateCheck, GateInputA, GateInputB, GatePhase, GateRule, Money } from '@/contracts';
import { budgetFor } from './budget';
import { normalizeModel } from './compat';

const MINOR_UNITS = 100;
const fmt = (minor: number) => (minor / MINOR_UNITS).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function check(rule: GateRule, phase: GatePhase, passed: boolean, reason: string): GateCheck {
  return { rule, phase, passed, reason };
}

function cartUrlOf(product: { merchant: string; variant_id: string }): string {
  return `https://${product.merchant}/cart/${product.variant_id}:1`;
}

// Convierte el monto a unidades menores de la moneda de la empresa, con redondeo explícito.
// Sin tasa, tasa o monto no finitos, o monto negativo fallan cerrado (devuelve null).
function toCompanyMinor(money: Money, fx: Record<string, number>): number | null {
  const rate = fx[money.currency];
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  if (!Number.isFinite(money.amount) || money.amount < 0) return null;
  return Math.round(money.amount * rate * MINOR_UNITS);
}

export function evaluateGateA(input: GateInputA): GateCheck[] {
  const { machine, site, product, vision, photo_id, hours_since_replace, checkout_url } = input;

  let evidencePassed = true;
  let evidenceReason = 'Evidencia válida';
  if (!photo_id) {
    evidencePassed = false;
    evidenceReason = 'Falta la foto de evidencia';
  } else if (!Number.isFinite(hours_since_replace) || hours_since_replace < 0) {
    evidencePassed = false;
    evidenceReason = 'Horas desde el cambio inválidas';
  } else if (normalizeModel(vision.nameplate_model ?? '') !== normalizeModel(machine.nameplate_model)) {
    evidencePassed = false;
    evidenceReason = `El modelo leído (${vision.nameplate_model ?? 'sin modelo'}) no coincide con la máquina (${machine.nameplate_model})`;
  }

  let compatPassed: boolean;
  let compatReason: string;
  if (product.part_type === 'nozzle') {
    compatPassed = product.compat_hotends.some((h) => h.trim() === machine.hotend.trim());
    compatReason = compatPassed
      ? `Boquilla compatible con el hotend ${machine.hotend}`
      : `La boquilla no es compatible con el hotend ${machine.hotend}`;
  } else {
    const model = normalizeModel(machine.nameplate_model);
    compatPassed = product.compat_models.map(normalizeModel).includes(model);
    compatReason = compatPassed
      ? `Pieza compatible con ${model}`
      : `Esta pieza solo es compatible con ${product.compat_models.join(', ')}; la placa dice ${model}`;
  }

  const variantExactPassed = checkout_url === cartUrlOf(product);
  const variantExactReason = variantExactPassed
    ? 'La variante coincide con el catálogo'
    : 'La variante a pagar no coincide con el catálogo';

  const shipsToPassed = product.ships_to.includes(site.country);
  const shipsToReason = shipsToPassed
    ? `${product.merchant} envía a ${site.country}`
    : `${product.merchant} no envía a ${site.country}`;

  return [
    check('evidence', 'A', evidencePassed, evidenceReason),
    check('compat', 'A', compatPassed, compatReason),
    check('variant_exact', 'A', variantExactPassed, variantExactReason),
    check('ships_to', 'A', shipsToPassed, shipsToReason),
  ];
}

export function evaluateGateB(input: GateInputB): GateCheck[] {
  const { company, quote, monthly_spend, fx_to_company, now } = input;
  const amountMinor = toCompanyMinor(quote.finalAmount, fx_to_company);

  let priceCap: GateCheck;
  let budget: GateCheck;
  if (amountMinor === null) {
    priceCap = check('price_cap', 'B', false, 'Sin tasa de cambio o monto inválido; el tope falla cerrado');
    budget = check('budget', 'B', false, 'Sin tasa de cambio o monto inválido; el presupuesto falla cerrado');
  } else {
    const capMinor = Math.round(company.purchase_cap * MINOR_UNITS);
    const total = `Total ${quote.finalAmount.amount} ${quote.finalAmount.currency} con envío e impuestos (${fmt(amountMinor)} ${company.currency})`;
    priceCap = amountMinor <= capMinor
      ? check('price_cap', 'B', true, `${total}; tope ${fmt(capMinor)} ${company.currency}`)
      : check('price_cap', 'B', false, `${total} excede el tope de ${fmt(capMinor)} ${company.currency}`);

    const budgetMinor = Math.round(budgetFor(company, now) * MINOR_UNITS);
    const spendMinor = Math.round(monthly_spend * MINOR_UNITS);
    budget = spendMinor + amountMinor <= budgetMinor
      ? check('budget', 'B', true, `Gasto del mes ${fmt(spendMinor)} + ${fmt(amountMinor)} de ${fmt(budgetMinor)} ${company.currency}`)
      : check('budget', 'B', false, `Gasto del mes ${fmt(spendMinor)} + ${fmt(amountMinor)} excede el presupuesto de ${fmt(budgetMinor)} ${company.currency}`);
  }

  const expires = Date.parse(quote.expiresAt);
  const quoteValid = Number.isFinite(expires) && expires > now.getTime()
    ? check('quote_valid', 'B', true, 'La cotización está vigente')
    : check('quote_valid', 'B', false, 'La cotización venció');

  return [priceCap, budget, quoteValid];
}
