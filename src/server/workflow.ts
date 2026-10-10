// Orquesta el flujo de §4 del spec de pago: fase A sin red, quote de Reap, fase B, checkout y consulta.
// Gate, visión y proveedor llegan inyectados para poder probar cada paso sin red.
import {
  ProviderError,
  type GateCheck, type GateInputA, type GateInputB, type PaymentProvider, type Product, type ProposalView,
  type ProviderErrorCode, type ProviderMode, type RequestPartInput, type RequestPartResult, type VisionMode,
  type VisionResult,
} from '@/contracts';
import { approvalToken } from '@/lib/approval-token';
import { cartUrl } from './catalog';
import type { Store } from './db';
import { REQUEST_PART_TOOL } from './mcp-names';

export interface WorkflowDeps {
  store: Store;
  provider: PaymentProvider;
  providerMode: ProviderMode;
  analyzePhoto(photoId: string): Promise<{ result: VisionResult; mode: VisionMode }>;
  evaluateGateA(input: GateInputA): GateCheck[];
  evaluateGateB(input: GateInputB): GateCheck[];
  catalog: Product[];
  fx: Record<string, number>;
  now?: () => Date;
  newId?: () => string;
}

const QUOTE_MARGIN_MS = 60_000;
export const MIN_CONFIDENCE = 0.7;
// Errores de Reap que son definitivos para esta propuesta; el resto deja la propuesta en 'failed' para recotizar.
const DEFINITIVE: ProviderErrorCode[] = ['ITEMS_UNSHIPPABLE', 'VARIANT_UNAVAILABLE', 'CARD_PAYMENT_UNAVAILABLE', 'CHECKOUT_URL_INVALID'];

const AMBIGUOUS_REASON = 'Pendiente de conciliación: Reap no confirmó si creó el pago. Se reintenta la misma operación al consultar; no se abre otra compra.';
const isAmbiguous = (err: unknown) => !(err instanceof ProviderError) || err.code === 'RETRYABLE' || err.code === 'UNKNOWN';
const round2 = (n: number) => Math.round(n * 100) / 100;
const allPass = (checks: GateCheck[]) => checks.length > 0 && checks.every((c) => c.passed);

export function createWorkflow(deps: WorkflowDeps) {
  const { store, provider } = deps;
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const toCompany = (amount: number, currency: string) => {
    const rate = deps.fx[currency];
    return rate === undefined ? null : round2(amount * rate);
  };

  // Gasto del mes más lo reservado por propuestas aprobadas que aún no se pagan.
  function monthlySpend(excludeId?: string) {
    const d = now();
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const paid = store.listPurchases().filter((r) => r.created_at.startsWith(month)).reduce((s, r) => s + r.amount_company, 0);
    const reserved = store.listProposals()
      .filter((p) => p.status === 'approved' && p.id !== excludeId)
      .reduce((s, p) => s + (p.quote_amount_company ?? 0), 0);
    return round2(paid + reserved);
  }

  function providerFailure(view: ProposalView, err: unknown, country: string): ProposalView {
    const code: ProviderErrorCode = err instanceof ProviderError ? err.code : 'UNKNOWN';
    const message = err instanceof Error ? err.message : String(err);
    const reason = code === 'ITEMS_UNSHIPPABLE'
      ? `Reap: ${view.product?.merchant} no envía a ${country} (ITEMS_UNSHIPPABLE)`
      : `Reap: ${message} (${code})`;
    const check: GateCheck = { rule: code === 'ITEMS_UNSHIPPABLE' ? 'ships_to' : 'quote_valid', phase: 'B', passed: false, reason };
    const checksA = view.verification.checks.filter((c) => c.phase === 'A');
    return {
      ...view,
      status: DEFINITIVE.includes(code) ? 'rejected' : 'failed',
      quote: null, quote_amount_company: null, checkout: null, reason,
      verification: { passed: false, phase_reached: 'B', checks: [...checksA, check] },
    };
  }

  // Pide un quote nuevo a Reap y evalúa la fase B. No guarda; devuelve la vista resultante.
  async function priceAndGateB(view: ProposalView, attempt: number): Promise<ProposalView> {
    const product = view.product;
    const machine = store.getMachine(view.machine_id);
    const site = machine && store.getSite(machine.site_id);
    if (!product || !site) throw new Error(`Propuesta ${view.id} sin producto o planta`);
    const company = store.getCompany();
    let quote;
    try {
      quote = await provider.quote({
        product, quantity: 1, shipTo: site.shipping_address, email: company.billing_email,
        idempotencyKey: `quote:${view.id}:${attempt}`,
      });
    } catch (err) {
      return providerFailure(view, err, site.country);
    }
    const checksA = view.verification.checks.filter((c) => c.phase === 'A');
    const checksB = deps.evaluateGateB({ company, quote, monthly_spend: monthlySpend(view.id), fx_to_company: deps.fx, now: now() });
    const passed = allPass(checksA) && allPass(checksB);
    return {
      ...view,
      status: passed ? 'proposed' : 'rejected',
      quote, checkout: null,
      quote_amount_company: toCompany(quote.finalAmount.amount, quote.finalAmount.currency),
      reason: passed ? null : checksB.find((c) => !c.passed)?.reason ?? null,
      verification: { passed, phase_reached: 'B', checks: [...checksA, ...checksB] },
    };
  }

  function load(id: string) {
    const s = store.getProposal(id);
    if (!s) throw new Error(`Propuesta ${id} no existe`);
    return s;
  }

  return {
    monthlySpend,

    async createProposal(input: RequestPartInput): Promise<RequestPartResult> {
      const machine = store.getMachine(input.machine_id);
      const site = machine && store.getSite(machine.site_id);
      if (!machine || !site) throw new Error(`Máquina ${input.machine_id} no existe`);
      const event = (result: string, extra: Record<string, unknown> = {}) => store.addEvent({
        id: newId(), machine_id: machine.id, source: 'klipper', created_at: now().toISOString(),
        payload: { tool: REQUEST_PART_TOOL, part_type: input.part_type, hours_since_replace: input.hours_since_replace,
          photo_id: input.photo_id, note: input.note ?? null, result, ...extra },
      });

      const open = store.findOpenProposal(machine.id, input.part_type);
      if (open) {
        event('ya existía una solicitud abierta', { proposal_id: open.view.id });
        return { proposal_id: open.view.id, status: open.view.status, verification: open.view.verification };
      }

      const { result: vision } = await deps.analyzePhoto(input.photo_id);
      if (!vision.nameplate_model || !(vision.confidence >= MIN_CONFIDENCE)) {
        const reason = 'No se pudo leer el modelo de la placa con confianza suficiente; confirma el modelo o toma otra foto';
        event('needs_confirmation', { reason });
        return { proposal_id: null, status: 'needs_confirmation', reason };
      }

      const id = newId();
      const base: ProposalView = {
        id, machine_id: machine.id, site_id: site.id, part_type: input.part_type, status: 'rejected',
        product: null, quote: null, quote_amount_company: null, checkout: null, provider: deps.providerMode,
        verification: { passed: false, phase_reached: 'A', checks: [] }, reason: 'Sin pieza en merchants soportados',
        hours_since_replace: input.hours_since_replace, photo_id: input.photo_id, created_at: now().toISOString(),
      };

      const candidates = deps.catalog.filter((p) => p.part_type === input.part_type);
      let view = base;
      for (const product of candidates) {
        const checksA = deps.evaluateGateA({
          machine, site, product, vision, photo_id: input.photo_id,
          hours_since_replace: input.hours_since_replace, checkout_url: cartUrl(product),
        });
        const passedA = allPass(checksA);
        const candidate: ProposalView = {
          ...base, product,
          reason: passedA ? null : checksA.find((c) => !c.passed)?.reason ?? null,
          verification: { passed: false, phase_reached: 'A', checks: checksA },
        };
        if (view === base) view = candidate;
        if (passedA) { view = candidate; break; }
      }

      // Fase A falló (o no hay pieza): se guarda el rechazo sin llamar a Reap.
      if (view.product && allPass(view.verification.checks)) view = await priceAndGateB(view, 1);
      store.putProposal(view, 1);
      event(view.status, { proposal_id: id, phase_reached: view.verification.phase_reached });
      return { proposal_id: id, status: view.status, verification: view.verification };
    },

    async approve(id: string, expectedToken?: string): Promise<ProposalView> {
      let { view, attempt } = load(id);
      if (view.status !== 'proposed' || !view.verification.passed || !view.quote) {
        throw new Error('Solo se aprueba una propuesta que pasó el gate');
      }
      // El quote de Reap vence: si está por vencer se pide otro y se repite la fase B.
      if (Date.parse(view.quote.expiresAt) - now().getTime() <= QUOTE_MARGIN_MS) {
        attempt += 1;
        view = await priceAndGateB(view, attempt);
      } else {
        const checksA = view.verification.checks.filter((c) => c.phase === 'A');
        const checksB = deps.evaluateGateB({
          company: store.getCompany(), quote: view.quote, monthly_spend: monthlySpend(id), fx_to_company: deps.fx, now: now(),
        });
        const passed = allPass(checksA) && allPass(checksB);
        view = {
          ...view, status: passed ? 'proposed' : 'rejected',
          reason: passed ? null : checksB.find((c) => !c.passed)?.reason ?? null,
          verification: { passed, phase_reached: 'B', checks: [...checksA, ...checksB] },
        };
      }
      if (view.status !== 'proposed' || !view.quote) {
        store.putProposal(view, attempt);
        return view;
      }
      // El operador aprobó lo que vio; si el quote o el monto cambiaron (p. ej. recotización) se guarda y se pide aprobar de nuevo.
      if (expectedToken !== undefined && expectedToken !== approvalToken(view)) {
        store.putProposal(view, attempt);
        throw new Error('La cotización cambió desde que la revisaste; revisa el nuevo monto y aprueba de nuevo');
      }

      // Transición atómica a 'approved' antes de la llamada externa: un segundo clic no abre otro checkout.
      const quoteId = view.quote.id;
      const reserved = store.tx(() => {
        const current = load(id);
        if (current.view.status !== 'proposed') return null;
        const next: ProposalView = { ...view, status: 'approved', checkout: null };
        store.putProposal(next, attempt);
        return next;
      });
      if (!reserved) return load(id).view;

      try {
        const checkout = await provider.checkout({ quoteId, idempotencyKey: `checkout:${id}:${attempt}` });
        const next = { ...reserved, checkout };
        store.putProposal(next, attempt);
        return next;
      } catch (err) {
        if (isAmbiguous(err)) {
          // No sabemos si Reap creó el checkout: la propuesta sigue 'approved' y consultar repite la misma
          // llamada con la misma Idempotency-Key. Nunca se ofrece otra compra desde aquí.
          const pending: ProposalView = { ...reserved, checkout: null, reason: AMBIGUOUS_REASON };
          store.putProposal(pending, attempt);
          return pending;
        }
        const machine = store.getMachine(view.machine_id);
        const failed = providerFailure(reserved, err, machine ? store.getSite(machine.site_id)?.country ?? '' : '');
        store.putProposal(failed, attempt);
        return failed;
      }
    },

    async refresh(id: string): Promise<ProposalView> {
      let { view, attempt } = load(id);
      if (view.status !== 'approved') return view;
      if (!view.checkout) {
        if (!view.quote) return view;
        try {
          const created = await provider.checkout({ quoteId: view.quote.id, idempotencyKey: `checkout:${id}:${attempt}` });
          view = { ...view, checkout: created, reason: null };
          store.putProposal(view, attempt);
        } catch (err) {
          if (isAmbiguous(err)) return view;
          const machine = store.getMachine(view.machine_id);
          const failed = providerFailure(view, err, machine ? store.getSite(machine.site_id)?.country ?? '' : '');
          store.putProposal(failed, attempt);
          return failed;
        }
      }
      const current = view.checkout!;
      const checkout = await provider.getCheckout(current.id);
      if (checkout.status === 'COMPLETED') {
        const amount = checkout.finalAmount ?? view.quote?.finalAmount;
        if (!amount || !checkout.orderId) throw new Error('Checkout completado sin orderId o monto');
        const paid: ProposalView = { ...view, status: 'paid', checkout, reason: null };
        store.tx(() => {
          const inserted = store.insertPurchase({
            proposal_id: id, machine_id: view.machine_id, site_id: view.site_id,
            part_type: view.part_type, product_title: view.product?.title ?? view.part_type, order_id: checkout.orderId!,
            provider: view.provider ?? deps.providerMode, amount,
            amount_company: toCompany(amount.amount, amount.currency) ?? 0, created_at: now().toISOString(),
          });
          if (inserted) {
            const stock = store.getStock(view.machine_id, view.part_type);
            if (stock) store.putStock({ ...stock, qty: stock.qty + 1 });
          }
          store.putProposal(paid, attempt);
        });
        return paid;
      }
      if (checkout.status === 'FAILED' || checkout.status === 'EXPIRED') {
        const reason = checkout.status === 'EXPIRED'
          ? 'No se aprobó en Reap antes de que venciera; cotiza de nuevo'
          : 'Reap: el cargo o la orden no pasó; cotiza de nuevo';
        const failed: ProposalView = { ...view, status: 'failed', checkout, reason };
        store.putProposal(failed, attempt);
        return failed;
      }
      const next = { ...view, checkout };
      store.putProposal(next, attempt);
      return next;
    },

    async requote(id: string): Promise<ProposalView> {
      const { view, attempt } = load(id);
      const expired = view.status === 'proposed' && !!view.quote && Date.parse(view.quote.expiresAt) <= now().getTime();
      if ((view.status !== 'failed' && !expired) || !view.product) return view;
      const next = await priceAndGateB({ ...view, checkout: null }, attempt + 1);
      store.putProposal(next, attempt + 1);
      return next;
    },

    reject(id: string): ProposalView {
      const { view, attempt } = load(id);
      if (view.status !== 'proposed') return view;
      const next: ProposalView = { ...view, status: 'rejected', reason: 'Rechazada por el operador' };
      store.putProposal(next, attempt);
      return next;
    },
  };
}

export type Workflow = ReturnType<typeof createWorkflow>;
