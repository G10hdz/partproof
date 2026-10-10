// ReapProvider y MockProvider. Los tipos salen de src/contracts.ts.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ProviderError,
  type CheckoutStatus,
  type Money,
  type PaymentProvider,
  type Product,
  type ProviderCheckout,
  type ProviderMode,
  type ProviderQuote,
  type ShippingAddress,
} from '../contracts';

const SANDBOX_ORIGINS = new Set([
  'https://sg.sandbox.api.reap.global',
  'https://mx.sandbox.api.reap.global',
  'https://sandbox.api.reap.global',
]);
const DEFAULT_ORIGIN = 'https://sg.sandbox.api.reap.global';
const DEFAULT_VERSION = '2025-02-14';
const ATTEMPTS = 3;
const CHECKOUT_STATUSES: readonly CheckoutStatus[] = [
  'REQUIRES_ACTION',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const VARIANT = /^[0-9A-Za-z_-]{1,64}$/;

export function buildCheckoutUrl(product: Product): { checkoutUrl: string; merchantDomain: string } {
  const merchantDomain = product.merchant.trim().toLowerCase();
  if (!HOST.test(merchantDomain) || merchantDomain.includes('..')) {
    throw new ProviderError('CHECKOUT_URL_INVALID', 'El merchant no es un host de catálogo');
  }
  if (!VARIANT.test(product.variant_id)) {
    throw new ProviderError('CHECKOUT_URL_INVALID', 'La variante no es la del catálogo');
  }
  const checkoutUrl = `https://${merchantDomain}/cart/${product.variant_id}:1`;
  let host = '';
  try {
    const url = new URL(checkoutUrl);
    host = url.host;
    if (url.protocol !== 'https:' || url.port || url.username || url.password) {
      throw new ProviderError('CHECKOUT_URL_INVALID', 'La URL del carrito no es válida');
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError('CHECKOUT_URL_INVALID', 'La URL del carrito no es válida');
  }
  if (host !== merchantDomain) {
    throw new ProviderError('CHECKOUT_URL_INVALID', 'El host no coincide con el merchant');
  }
  return { checkoutUrl, merchantDomain };
}

export interface ReapProviderOptions {
  apiKey: string;
  enrollmentId: string;
  returnUrl: string;
  baseUrl?: string;
  version?: string;
  simulateCheckout?: boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export function createReapProvider(options: ReapProviderOptions): PaymentProvider {
  const apiKey = options.apiKey.trim();
  const enrollmentId = options.enrollmentId.trim();
  const returnUrl = options.returnUrl.trim();
  if (!apiKey || !enrollmentId) {
    throw new ProviderError('NOT_ENABLED', 'Faltan REAP_API_KEY o REAP_ENROLLMENT_ID');
  }
  if (!UUID.test(enrollmentId)) {
    throw new ProviderError('NOT_ENABLED', 'REAP_ENROLLMENT_ID no es un id de enrollment');
  }
  assertHttpsReturn(returnUrl);
  const origin = sandboxOrigin(options.baseUrl);
  const version = (options.version ?? DEFAULT_VERSION).trim() || DEFAULT_VERSION;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  async function post<T>(path: string, idempotencyKey: string, body: unknown): Promise<T> {
    assertIdempotencyKey(idempotencyKey);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Reap-Version': version,
      'Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options.simulateCheckout) headers['X-Simulate-Checkout'] = 'COMPLETED';
    return request<T>(`${origin}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }, fetchImpl, sleep);
  }

  return {
    async quote(input) {
      if (input.quantity !== 1) {
        throw new ProviderError('UNKNOWN', 'La cantidad solo puede ser 1');
      }
      const { checkoutUrl, merchantDomain } = buildCheckoutUrl(input.product);
      const raw = await post<unknown>('/agentic/quotes', input.idempotencyKey, {
        externalCheckout: { merchantDomain, checkoutUrl },
        email: input.email,
        shippingAddress: addressBody(input.shipTo),
      });
      return parseQuote(raw, checkoutUrl, merchantDomain);
    },
    async checkout(input) {
      if (!UUID.test(input.quoteId)) {
        throw new ProviderError('UNKNOWN', 'quoteId no es un id de Reap');
      }
      const raw = await post<unknown>('/agentic/checkouts', input.idempotencyKey, {
        quoteId: input.quoteId,
        enrollmentId,
        presentation: { type: 'REDIRECT', returnUrl },
      });
      return parseCheckout(raw);
    },
    async getCheckout(id) {
      if (!UUID.test(id)) {
        throw new ProviderError('UNKNOWN', 'El id de checkout no es válido');
      }
      const raw = await request<unknown>(
        `${origin}/agentic/checkouts/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Reap-Version': version,
            Accept: 'application/json',
          },
        },
        fetchImpl,
        sleep,
      );
      return parseCheckout(raw);
    },
  };
}

export interface MockScript {
  quote?: ProviderQuote | ProviderError;
  checkout?: ProviderCheckout | ProviderError;
  getCheckout?: ProviderCheckout | ProviderError;
}

// Respuestas reales del sandbox (fixtures/reap) por merchant, variante y país; lo demás cotiza a precio de catálogo.
const MOCK_FIXTURES: { merchant: string; variant?: string; country: string; file: string }[] = [
  { merchant: 'digitmakers.ca', variant: '67588566679782', country: 'CA', file: 'quote-ok-digitmakers-ca.json' },
  { merchant: 'digitmakers.ca', variant: '44386635612390', country: 'CA', file: 'quote-ok-thermistor-ca.json' },
  { merchant: 'cubictech.com.au', country: 'CA', file: 'quote-ok-cubictech-ca.json' },
];

function mockFixtureQuote(product: Product, country: string, dir: string): unknown | null {
  if (product.merchant === 'digitmakers.ca' && country === 'MX') {
    const raw = JSON.parse(readFileSync(path.join(dir, 'quote-unshippable-mx.json'), 'utf8')) as { error: { detail: { message: string } } };
    throw new ProviderError('ITEMS_UNSHIPPABLE', raw.error.detail.message);
  }
  const hit = MOCK_FIXTURES.find((f) => f.merchant === product.merchant && f.country === country
    && (!f.variant || f.variant === product.variant_id));
  return hit ? JSON.parse(readFileSync(path.join(dir, hit.file), 'utf8')) : null;
}

export function createMockProvider(script: MockScript = {}, fixturesDir = path.join(process.cwd(), 'fixtures', 'reap')): PaymentProvider {
  const quotes = new Map<string, ProviderQuote>();
  const checkouts = new Map<string, { checkout: ProviderCheckout; polls: number }>();
  let n = 0;
  const inTenMinutes = () => new Date(Date.now() + 10 * 60_000).toISOString();
  return {
    async quote(input) {
      if (script.quote instanceof ProviderError) throw script.quote;
      if (script.quote) return script.quote;
      if (input.quantity !== 1) throw new ProviderError('UNKNOWN', 'La cantidad solo puede ser 1');
      const { checkoutUrl, merchantDomain } = buildCheckoutUrl(input.product);
      const raw = mockFixtureQuote(input.product, input.shipTo.country, fixturesDir);
      const quote: ProviderQuote = raw
        ? { ...parseQuote(raw, checkoutUrl, merchantDomain), id: crypto.randomUUID(), expiresAt: inTenMinutes() }
        : {
          id: crypto.randomUUID(), checkoutUrl, merchantDomain,
          itemsSubtotal: { amount: input.product.price, currency: input.product.currency },
          shipping: null, tax: null,
          finalAmount: { amount: input.product.price, currency: input.product.currency },
          expiresAt: inTenMinutes(),
        };
      quotes.set(quote.id, quote);
      return quote;
    },
    async checkout(input) {
      if (script.checkout instanceof ProviderError) throw script.checkout;
      if (script.checkout) return script.checkout;
      const quote = quotes.get(input.quoteId);
      const checkout: ProviderCheckout = {
        id: crypto.randomUUID(),
        status: 'REQUIRES_ACTION',
        approvalUrl: 'https://sandbox.collect.prava.space/mock',
        approvalExpiresAt: inTenMinutes(),
        orderId: null,
        finalAmount: quote?.finalAmount ?? null,
      };
      checkouts.set(checkout.id, { checkout, polls: 0 });
      return checkout;
    },
    // Avanza un estado por consulta: REQUIRES_ACTION -> PROCESSING -> COMPLETED.
    async getCheckout(id) {
      if (script.getCheckout instanceof ProviderError) throw script.getCheckout;
      if (script.getCheckout) return script.getCheckout;
      const entry = checkouts.get(id);
      if (!entry) throw new ProviderError('UNKNOWN', 'Checkout mock inexistente');
      entry.polls += 1;
      const done = entry.polls >= 2;
      entry.checkout = {
        ...entry.checkout,
        status: done ? 'COMPLETED' : 'PROCESSING',
        approvalUrl: null,
        orderId: entry.checkout.orderId ?? `ord_MOCK_${++n}`,
      };
      return entry.checkout;
    },
  };
}

export function getPaymentProvider(
  env: Record<string, string | undefined> = process.env,
): { provider: PaymentProvider; mode: ProviderMode } {
  const selected = (env.PAYMENT_PROVIDER ?? 'mock').trim();
  if (selected === 'mock' || selected === '') {
    return { provider: createMockProvider(), mode: 'mock' };
  }
  if (selected !== 'reap') {
    throw new ProviderError('UNKNOWN', 'PAYMENT_PROVIDER no reconocido');
  }
  return {
    provider: createReapProvider({
      apiKey: env.REAP_API_KEY ?? '',
      enrollmentId: env.REAP_ENROLLMENT_ID ?? '',
      returnUrl: env.REAP_RETURN_URL ?? '',
      baseUrl: env.REAP_BASE_URL,
      version: env.REAP_VERSION,
      simulateCheckout: env.REAP_SIMULATE_CHECKOUT === 'COMPLETED',
    }),
    mode: 'reap',
  };
}

function sandboxOrigin(baseUrl: string | undefined): string {
  const origin = (baseUrl?.trim() || DEFAULT_ORIGIN).replace(/\/+$/, '');
  if (!SANDBOX_ORIGINS.has(origin)) {
    throw new ProviderError('NOT_ENABLED', 'REAP_BASE_URL no es un host de sandbox');
  }
  return origin;
}

function assertHttpsReturn(returnUrl: string): void {
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    throw new ProviderError('NOT_ENABLED', 'REAP_RETURN_URL no es una URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new ProviderError('NOT_ENABLED', 'REAP_RETURN_URL tiene que ser HTTPS');
  }
}

function assertIdempotencyKey(key: string): void {
  if (key.trim().length === 0 || key.length > 255) {
    throw new ProviderError('UNKNOWN', 'Idempotency-Key vacía o demasiado larga');
  }
}

async function request<T>(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<T> {
  let last = new ProviderError('RETRYABLE', 'Reap no respondió');
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, redirect: 'error' });
    } catch {
      last = new ProviderError('RETRYABLE', 'Reap no respondió');
      if (attempt < ATTEMPTS) {
        await sleep(100 * 2 ** (attempt - 1));
        continue;
      }
      throw last;
    }
    const text = await response.text();
    const body = text ? safeJson(text) : null;
    if (response.ok) return body as T;
    const error = classify(response.status, body);
    const retry = error.code === 'RETRYABLE' && attempt < ATTEMPTS;
    if (!retry) throw error;
    last = error;
    await sleep(100 * 2 ** (attempt - 1));
  }
  throw last;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function classify(status: number, body: unknown): ProviderError {
  const parsed = readError(body);
  const message = parsed.message || `Reap respondió ${status}`;
  if (status === 403 || parsed.code === 'AGENTIC_PAYMENTS_NOT_ENABLED') {
    return new ProviderError('NOT_ENABLED', message);
  }
  if (parsed.code === 'QUOTE_EXPIRED') return new ProviderError('QUOTE_EXPIRED', message);
  if (parsed.code === 'CHECKOUT_URL_INVALID') return new ProviderError('CHECKOUT_URL_INVALID', message);
  if (parsed.code === 'CARD_PAYMENT_UNAVAILABLE') return new ProviderError('CARD_PAYMENT_UNAVAILABLE', message);
  if (parsed.code === 'VARIANT_UNAVAILABLE') return new ProviderError('VARIANT_UNAVAILABLE', message);
  if (parsed.code === 'QUOTE_UNFULFILLABLE' && parsed.reason === 'ITEMS_UNSHIPPABLE') {
    return new ProviderError('ITEMS_UNSHIPPABLE', parsed.detailMessage || message);
  }
  if (
    parsed.code === 'QUOTE_UNFULFILLABLE' &&
    (parsed.reason === 'INVALID_PHONE' ||
      parsed.reason === 'STATE_OR_PROVINCE_REQUIRED' ||
      parsed.reason === 'ADDRESS_LINE_2_REQUIRED')
  ) {
    return new ProviderError('ADDRESS_INVALID', parsed.detailMessage || message);
  }
  if (parsed.code === 'IDEMPOTENT_PARAMETER_MISMATCH') {
    return new ProviderError('UNKNOWN', message);
  }
  if (parsed.code === 'AGENTIC_REQUEST_REJECTED' && /host|checkout url|https/i.test(parsed.message)) {
    return new ProviderError('CHECKOUT_URL_INVALID', message);
  }
  if (retryable(status, parsed.code)) return new ProviderError('RETRYABLE', message);
  return new ProviderError('UNKNOWN', message);
}

function retryable(status: number, code: string): boolean {
  if (code === 'AGENTIC_SERVICE_UNAVAILABLE' || code === 'QUOTE_TEMPORARILY_UNAVAILABLE' || code === 'CHECKOUT_TEMPORARILY_UNAVAILABLE') {
    return true;
  }
  if (status === 429 || status >= 500) return true;
  if (status === 409 && code !== 'QUOTE_EXPIRED' && code !== 'ENROLLMENT_NOT_ACTIVE') return true;
  return false;
}

function readError(body: unknown): { code: string; reason: string; message: string; detailMessage: string } {
  const empty = { code: '', reason: '', message: '', detailMessage: '' };
  if (!body || typeof body !== 'object') return empty;
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== 'object') return empty;
  const record = error as { code?: unknown; message?: unknown; detail?: unknown };
  const detail = record.detail;
  let reason = '';
  let detailMessage = '';
  if (detail && typeof detail === 'object') {
    const d = detail as { reason?: unknown; message?: unknown };
    if (typeof d.reason === 'string') reason = d.reason;
    if (typeof d.message === 'string') detailMessage = d.message;
  }
  return {
    code: typeof record.code === 'string' ? record.code : '',
    reason,
    message: typeof record.message === 'string' ? record.message : '',
    detailMessage,
  };
}

function parseQuote(body: unknown, checkoutUrl: string, merchantDomain: string): ProviderQuote {
  if (!body || typeof body !== 'object') {
    throw new ProviderError('UNKNOWN', 'Quote de Reap ilegible');
  }
  const raw = body as { id?: unknown; amountBreakdown?: unknown; expiresAt?: unknown };
  if (typeof raw.id !== 'string' || !UUID.test(raw.id)) {
    throw new ProviderError('UNKNOWN', 'Quote sin id');
  }
  if (typeof raw.expiresAt !== 'string' || Number.isNaN(Date.parse(raw.expiresAt))) {
    throw new ProviderError('UNKNOWN', 'Quote sin vigencia');
  }
  const breakdown = raw.amountBreakdown;
  if (!breakdown || typeof breakdown !== 'object') {
    throw new ProviderError('UNKNOWN', 'Quote sin desglose');
  }
  const amounts = breakdown as { itemsSubtotal?: unknown; shipping?: unknown; tax?: unknown; finalAmount?: unknown };
  const itemsSubtotal = readMoney(amounts.itemsSubtotal);
  const finalAmount = readMoney(amounts.finalAmount);
  if (!itemsSubtotal || !finalAmount) {
    throw new ProviderError('UNKNOWN', 'Quote sin monto');
  }
  return {
    id: raw.id,
    checkoutUrl,
    merchantDomain,
    itemsSubtotal,
    shipping: readMoney(amounts.shipping),
    tax: readMoney(amounts.tax),
    finalAmount,
    expiresAt: raw.expiresAt,
  };
}

function parseCheckout(body: unknown): ProviderCheckout {
  if (!body || typeof body !== 'object') {
    throw new ProviderError('UNKNOWN', 'Checkout de Reap ilegible');
  }
  const raw = body as {
    id?: unknown;
    status?: unknown;
    orderId?: unknown;
    amount?: unknown;
    finalAmount?: unknown;
    nextAction?: unknown;
  };
  if (typeof raw.id !== 'string' || !UUID.test(raw.id)) {
    throw new ProviderError('UNKNOWN', 'Checkout sin id');
  }
  if (typeof raw.status !== 'string' || !CHECKOUT_STATUSES.includes(raw.status as CheckoutStatus)) {
    throw new ProviderError('UNKNOWN', 'Estado de checkout desconocido');
  }
  let approvalUrl: string | null = null;
  let approvalExpiresAt: string | null = null;
  if (raw.nextAction && typeof raw.nextAction === 'object') {
    const action = raw.nextAction as { url?: unknown; expiresAt?: unknown };
    if (typeof action.url === 'string') approvalUrl = action.url;
    if (typeof action.expiresAt === 'string') approvalExpiresAt = action.expiresAt;
  }
  const orderId = typeof raw.orderId === 'string' ? raw.orderId : null;
  const finalAmount = readMoney(raw.finalAmount) ?? readMoney(raw.amount);
  if (raw.status === 'REQUIRES_ACTION' && !approvalUrl) {
    throw new ProviderError('UNKNOWN', 'Checkout sin URL de aprobación');
  }
  if (raw.status === 'COMPLETED' && !finalAmount) {
    throw new ProviderError('UNKNOWN', 'Checkout pagado sin monto');
  }
  return {
    id: raw.id,
    status: raw.status as CheckoutStatus,
    approvalUrl,
    approvalExpiresAt,
    orderId,
    finalAmount,
  };
}

function readMoney(value: unknown): Money | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { amount?: unknown; currency?: unknown };
  const nested = record.amount;
  if (nested && typeof nested === 'object') {
    const inner = nested as { amount?: unknown; currency?: unknown };
    return finiteMoney(inner.amount, inner.currency);
  }
  return finiteMoney(record.amount, record.currency);
}

function finiteMoney(amount: unknown, currency: unknown): Money | null {
  if (typeof amount !== 'number' || typeof currency !== 'string') return null;
  if (!Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return { amount, currency };
}

function addressBody(address: ShippingAddress): Record<string, string> {
  const body: Record<string, string> = {
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    city: address.city,
    country: address.country,
  };
  if (address.addressLine2) body.addressLine2 = address.addressLine2;
  if (address.region) body.region = address.region;
  if (address.postalCode) body.postalCode = address.postalCode;
  return body;
}
