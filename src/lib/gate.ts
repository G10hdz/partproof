import { toMxn } from './fx';
import type { GateInput, GateResult, RuleName, RuleResult } from './types';

const tokens = (value: string) => value.trim().toLowerCase().split(/\s+/);

function containsPhrase(text: string, phrase: string): boolean {
  const words = tokens(text);
  const phraseWords = tokens(phrase);
  for (let index = 0; index + phraseWords.length <= words.length; index++) {
    if (phraseWords.every((word, offset) => words[index + offset] === word)) return true;
  }
  return false;
}

export function evaluateGate(i: GateInput): GateResult {
  const rules: RuleResult[] = [];
  const add = (rule: RuleName, ok: boolean, reason: string) => rules.push({ rule, ok, reason });
  const { hours, photoId, photoNameplateModel: plate } = i.evidence;
  const plateMatches = plate !== null && tokens(plate).join(' ') === tokens(i.machine.nameplateModel).join(' ');
  const evidenceOk = hours !== null && photoId !== null && plateMatches;
  add('evidence', evidenceOk, evidenceOk
    ? 'Horas, foto y modelo de la placa coinciden con la máquina.'
    : plate === null || photoId === null || hours === null
      ? 'Falta evidencia (horas o foto con placa legible).'
      : `La placa dice "${plate}" pero la máquina está registrada como "${i.machine.nameplateModel}".`);

  const compatible = Boolean(
    i.item.compatModels?.some((model) => containsPhrase(i.machine.nameplateModel, model))
    || i.item.compatHotends?.some((hotend) => containsPhrase(i.machine.hotend, hotend)),
  );
  const listed = [...(i.item.compatModels ?? []), ...(i.item.compatHotends ?? [])].join(', ');
  add('compat', compatible, compatible
    ? `"${i.machine.nameplateModel}" aparece en la ficha del producto.`
    : `La ficha solo lista: ${listed}. La máquina es "${i.machine.nameplateModel}" (hotend "${i.machine.hotend}").`);

  const variantOk = i.requestedVariantId === i.item.variantId;
  add('variant_exact', variantOk, variantOk ? 'La variante coincide con el catálogo.' : 'La variante no coincide con el catálogo.');

  const ships = i.item.shipsTo.includes(i.company.country);
  add('ships_to', ships, ships ? `${i.item.merchant} envía a ${i.company.country}.` : `${i.item.merchant} no envía a ${i.company.country}.`);

  const mxn = toMxn(i.quote.price, i.quote.currency);
  const withinCap = mxn <= i.company.purchaseCap;
  add('price_cap', withinCap, withinCap
    ? `${mxn} MXN está dentro del tope de ${i.company.purchaseCap}.`
    : `${mxn} MXN excede el tope de ${i.company.purchaseCap}.`);

  const withinBudget = i.spentThisMonthMxn + mxn <= i.company.monthlyBudget;
  add('budget', withinBudget, withinBudget
    ? 'Dentro del presupuesto mensual.'
    : `Gastado ${i.spentThisMonthMxn} + ${mxn} excede el presupuesto de ${i.company.monthlyBudget}.`);

  const validQuote = i.now <= i.quote.validUntil && i.quote.price === i.item.price;
  add('quote_valid', validQuote, validQuote ? 'La cotización sigue vigente.' : 'La cotización venció o el precio cambió.');
  return { ok: rules.every((rule) => rule.ok), rules };
}
