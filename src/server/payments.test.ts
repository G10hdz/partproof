import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ProviderError, type Product, type ShippingAddress } from '../contracts';
import { buildCheckoutUrl, createMockProvider, createReapProvider, getPaymentProvider } from './payments';

const quoteOk = JSON.parse(readFileSync(new URL('../../fixtures/reap/quote-ok-digitmakers-ca.json', import.meta.url), 'utf8'));
const unshippable = JSON.parse(readFileSync(new URL('../../fixtures/reap/quote-unshippable-mx.json', import.meta.url), 'utf8'));
const checkoutAction = JSON.parse(
  readFileSync(new URL('../../fixtures/reap/checkout-create-requires-action.json', import.meta.url), 'utf8'),
);
const checkoutProcessing = JSON.parse(
  readFileSync(new URL('../../fixtures/reap/checkout-get-processing.json', import.meta.url), 'utf8'),
);

const cable: Product = {
  product_ref: 'dm-accel-cable',
  merchant: 'digitmakers.ca',
  title: 'Prusa Accelerometer Cables',
  variant_id: '67588566679782',
  price: 21.99,
  currency: 'CAD',
  part_type: 'accelerometer_cable',
  compat_models: ['MK4S'],
  compat_hotends: [],
  ships_to: ['CA'],
  lead_time_days: 5,
};

const toronto: ShippingAddress = {
  firstName: 'Forja3D',
  lastName: 'Operaciones',
  phone: '+14165550123',
  addressLine1: '100 Queen St W',
  city: 'Toronto',
  region: 'ON',
  postalCode: 'M5H 2N2',
  country: 'CA',
};

const reapOpts = {
  apiKey: 'test-key',
  enrollmentId: '11111111-1111-4111-8111-111111111111',
  returnUrl: 'https://example.com/back',
  sleep: async () => {},
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function scripted(responses: Array<Response | Error>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('sin respuesta');
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchImpl, calls };
}

function header(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name);
}

describe('buildCheckoutUrl', () => {
  it('arma el carrito del catálogo y el host coincide', () => {
    expect(buildCheckoutUrl(cable)).toEqual({
      checkoutUrl: 'https://digitmakers.ca/cart/67588566679782:1',
      merchantDomain: 'digitmakers.ca',
    });
  });

  it('rechaza un merchant que no es host', () => {
    expect(() => buildCheckoutUrl({ ...cable, merchant: 'https://digitmakers.ca/cart' })).toThrow(ProviderError);
    expect(() => buildCheckoutUrl({ ...cable, variant_id: '../x' })).toThrow(ProviderError);
  });
});

describe('ReapProvider', () => {
  it('pide el quote con la URL del catálogo y no manda el precio', async () => {
    const { fetchImpl, calls } = scripted([jsonResponse(200, quoteOk)]);
    const provider = createReapProvider({ ...reapOpts, fetchImpl });
    const quote = await provider.quote({
      product: cable,
      quantity: 1,
      shipTo: toronto,
      email: 'ops@forja3d.example',
      idempotencyKey: 'quote:1',
    });
    expect(quote.finalAmount).toEqual({ amount: 32.34, currency: 'CAD' });
    expect(quote.tax).toEqual({ amount: 3.72, currency: 'CAD' });
    expect(quote.shipping).toEqual({ amount: 6.63, currency: 'CAD' });
    expect(quote.checkoutUrl).toBe('https://digitmakers.ca/cart/67588566679782:1');
    expect(quote.merchantDomain).toBe('digitmakers.ca');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.externalCheckout.checkoutUrl).toBe(quote.checkoutUrl);
    expect(body.externalCheckout.merchantDomain).toBe('digitmakers.ca');
    expect(JSON.stringify(body)).not.toContain('21.99');
    expect(header(calls[0].init, 'Authorization')).toBe('Bearer test-key');
    expect(header(calls[0].init, 'Reap-Version')).toBe('2025-02-14');
    expect(header(calls[0].init, 'Idempotency-Key')).toBe('quote:1');
    expect(header(calls[0].init, 'X-Simulate-Checkout')).toBeNull();
  });

  it('traduce ITEMS_UNSHIPPABLE y no reintenta', async () => {
    const { fetchImpl, calls } = scripted([jsonResponse(400, unshippable)]);
    const provider = createReapProvider({ ...reapOpts, fetchImpl });
    await expect(
      provider.quote({
        product: cable,
        quantity: 1,
        shipTo: { ...toronto, country: 'MX', city: 'Guadalajara' },
        email: 'ops@forja3d.example',
        idempotencyKey: 'quote:mx',
      }),
    ).rejects.toMatchObject({ name: 'ProviderError', code: 'ITEMS_UNSHIPPABLE' });
    expect(calls).toHaveLength(1);
  });

  it('reintenta 500 con la misma Idempotency-Key', async () => {
    const { fetchImpl, calls } = scripted([
      jsonResponse(500, { error: { code: 'AGENTIC_SERVICE_UNAVAILABLE', message: 'later' } }),
      jsonResponse(200, quoteOk),
    ]);
    const provider = createReapProvider({ ...reapOpts, fetchImpl });
    const quote = await provider.quote({
      product: cable,
      quantity: 1,
      shipTo: toronto,
      email: 'ops@forja3d.example',
      idempotencyKey: 'quote:retry',
    });
    expect(quote.id).toBe(quoteOk.id);
    expect(calls).toHaveLength(2);
    expect(header(calls[0].init, 'Idempotency-Key')).toBe('quote:retry');
    expect(header(calls[1].init, 'Idempotency-Key')).toBe('quote:retry');
  });

  it('abre el checkout con aprobación hosted y lee finalAmount', async () => {
    const { fetchImpl, calls } = scripted([jsonResponse(200, checkoutAction), jsonResponse(200, checkoutProcessing)]);
    const provider = createReapProvider({ ...reapOpts, fetchImpl });
    const created = await provider.checkout({ quoteId: quoteOk.id, idempotencyKey: 'checkout:1' });
    expect(created.status).toBe('REQUIRES_ACTION');
    expect(created.approvalUrl).toContain('https://sandbox.collect.prava.space');
    expect(created.finalAmount).toEqual({ amount: 32.34, currency: 'CAD' });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toEqual({
      quoteId: quoteOk.id,
      enrollmentId: reapOpts.enrollmentId,
      presentation: { type: 'REDIRECT', returnUrl: 'https://example.com/back' },
    });
    const polled = await provider.getCheckout(checkoutProcessing.id);
    expect(polled.status).toBe('PROCESSING');
    expect(polled.finalAmount).toEqual({ amount: 32.34, currency: 'CAD' });
    expect(polled.orderId).toBe(checkoutProcessing.orderId);
    expect(calls[1].init.method).toBe('GET');
    expect(header(calls[1].init, 'Idempotency-Key')).toBeNull();
  });

  it('falla cerrado sin llave y no llama a la red', () => {
    const { fetchImpl, calls } = scripted([]);
    expect(() => createReapProvider({ ...reapOpts, apiKey: '  ', fetchImpl })).toThrow(ProviderError);
    expect(calls).toHaveLength(0);
  });

  it('rechaza un host que no es sandbox', () => {
    expect(() =>
      createReapProvider({ ...reapOpts, baseUrl: 'https://sg.prod.api.reap.global', fetchImpl: fetch }),
    ).toThrow(ProviderError);
  });

  it('403 es NOT_ENABLED', async () => {
    const { fetchImpl } = scripted([
      jsonResponse(403, { error: { code: 'AGENTIC_PAYMENTS_NOT_ENABLED', message: 'off', detail: null } }),
    ]);
    const provider = createReapProvider({ ...reapOpts, fetchImpl });
    await expect(
      provider.quote({
        product: cable,
        quantity: 1,
        shipTo: toronto,
        email: 'ops@forja3d.example',
        idempotencyKey: 'quote:off',
      }),
    ).rejects.toMatchObject({ code: 'NOT_ENABLED' });
  });
});

describe('getPaymentProvider', () => {
  it('mock no exige llave', () => {
    const got = getPaymentProvider({ PAYMENT_PROVIDER: 'mock' });
    expect(got.mode).toBe('mock');
  });

  it('reap sin llave no cae al mock', () => {
    expect(() => getPaymentProvider({ PAYMENT_PROVIDER: 'reap', REAP_API_KEY: '', REAP_ENROLLMENT_ID: '' })).toThrow(
      ProviderError,
    );
  });
});

describe('MockProvider', () => {
  it('cotiza, pide aprobación y puede devolver EXPIRED', async () => {
    const provider = createMockProvider();
    const quote = await provider.quote({
      product: cable,
      quantity: 1,
      shipTo: toronto,
      email: 'ops@forja3d.example',
      idempotencyKey: 'm1',
    });
    expect(quote.checkoutUrl).toBe('https://digitmakers.ca/cart/67588566679782:1');
    const checkout = await provider.checkout({ quoteId: quote.id, idempotencyKey: 'm2' });
    expect(checkout.status).toBe('REQUIRES_ACTION');
    expect(checkout.approvalUrl).toBeTruthy();
    const expired = createMockProvider({
      getCheckout: {
        id: 'mock-checkout-x',
        status: 'EXPIRED',
        approvalUrl: null,
        approvalExpiresAt: null,
        orderId: null,
        finalAmount: null,
      },
    });
    expect((await expired.getCheckout('mock-checkout-x')).status).toBe('EXPIRED');
  });

  it('puede lanzar ProviderError de envío', async () => {
    const provider = createMockProvider({
      quote: new ProviderError('ITEMS_UNSHIPPABLE', 'no envía'),
    });
    await expect(
      provider.quote({
        product: cable,
        quantity: 1,
        shipTo: toronto,
        email: 'ops@forja3d.example',
        idempotencyKey: 'm3',
      }),
    ).rejects.toMatchObject({ code: 'ITEMS_UNSHIPPABLE' });
  });
});
