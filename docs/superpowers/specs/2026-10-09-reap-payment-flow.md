# Flujo de pago con el Agentic module de Reap (spec técnico)

Fecha: 2026-10-09 · Estado: borrador para aprobación · Depende de: `2026-10-09-wear-triggered-parts-agent-design.md`, `2026-10-09-demo-design.md`

Corrige §8 del spec de producto y la interfaz `PaymentProvider` de `src/contracts.ts`, que se congelaron antes de revisar la documentación de Reap. Este documento sale de la documentación pública. Lo marcado *observed* (E-n) está observado en los docs; lo ya probado contra el sandbox va en §11 con IDs S-n.

## 1. Resultado y alcance

**Resultado:** una propuesta que pasa el gate termina en una orden real del merchant en el sandbox de Reap, aprobada por un humano en la página de Reap, con `orderId` y monto final en el libro.

**Dentro:** enrollment de una tarjeta (una vez), quote por `externalCheckout`, gate en dos fases, checkout con aprobación hosted, consulta de estado, idempotencia y errores.

**Fuera:** mandates (no existen todavía, E-6), búsqueda por `products/search` (solo si `externalCheckout` no está habilitado, §9), reembolsos, varios artículos por orden, producción.

**Esto es P0.** Con `MockProvider` no se cumple el punto 1 del checklist del hackathon (usar el Agentic module). El mock queda solo como respaldo sin red, siempre con la insignia MOCK.

## 2. Evidencia

| ID | Fuente | Qué respalda |
|---|---|---|
| E-1 | docs.reap.global/agentic-payments/how-it-works | Fases, quién hace qué, idempotencia obligatoria en enrollments, quotes y checkouts |
| E-2 | docs.reap.global/agentic-payments/one-time-purchases | Secuencia completa, ejemplo de `externalCheckout`, respuesta del quote, `X-Simulate-Checkout` |
| E-3 | docs.reap.global/api-reference/agentic/create-quote (OpenAPI) | Esquema de request y response del quote, códigos de error, `Reap-Version` |
| E-4 | docs.reap.global/api-reference/agentic/get-checkout (OpenAPI) | Estados del checkout, `orderId`, `finalAmount`, `nextAction` |
| E-5 | docs.reap.global/api-reference/idempotency | Reglas de reintento, cacheo de errores, `IDEMPOTENT_PARAMETER_MISMATCH` |
| E-6 | docs.reap.global/agentic-payments/lifecycle | Máquinas de estado; mandates "not live in sandbox or production" |
| E-7 | docs.reap.global/agentic-payments/setup, api-reference/agentic/create-enrollment | Enrollment `EXTERNAL` con página hosted; `REAP_CARD` y `BIN_SPONSOR` "coming soon" |
| E-8 | docs.reap.global/agentic-payments/faq | Cobertura de merchants y flujo de URL propia se confirman con Reap; MCP solo en sandbox |
| E-9 | Lista `/merchants` del bot del hackathon (vía el equipo) | Merchants Shopify con carrito `/cart/{variant_id}:1`, moneda y países de envío |

## 3. Cómo funciona Reap y por qué (resumen)

- **Observed (E-1, E-2):** Reap guarda la tarjeta una vez (enrollment) y nunca expone el número al agente. Cada compra es quote → checkout → aprobación humana en una página de Reap → Reap coloca la orden con el merchant.
- **Observed (E-3):** "Prices always come from the merchant." El quote trae `amountBreakdown` con subtotal, envío, impuestos, descuentos, cargos extra y `finalAmount`, más `expiresAt`. El total puede ser mucho mayor que el precio de la variante.
- **Observed (E-3):** la respuesta del quote **no** devuelve merchant, artículos ni dirección. Solo `id`, `shippingOptions`, `amountBreakdown` y `expiresAt`.
- **Observed (E-4, E-6):** sin mandate, todo checkout nace en `REQUIRES_ACTION` con `nextAction.url`. Los estados finales son `COMPLETED`, `FAILED` y `EXPIRED`; los dos últimos exigen un quote y un checkout nuevos.
- **Inferred:** Reap separa precio (quote) de cargo (checkout) para que el cobro siempre corresponda a un total que el merchant confirmó y que el humano vio. Para nosotros eso significa que el gate tiene que evaluar el quote de Reap, no el precio de catálogo.

## 4. Flujo propuesto (gate en dos fases)

```
request_part (MCP)
  -> política, visión, matcher (sin cambios)
  -> GATE FASE A (sin red):  evidence, compat, variant_exact, ships_to
       falla -> proposal rejected. Cero llamadas a Reap.
  -> construir checkoutUrl desde catalog.json (servidor)
  -> POST /agentic/quotes  { externalCheckout, email, shippingAddress }
  -> GATE FASE B (sobre el quote de Reap):  price_cap, budget, quote_valid
       falla -> proposal rejected, con el desglose del quote como razón
  -> proposal proposed (checklist completa visible)
Operador aprueba
  -> si expiresAt <= ahora + margen: nuevo quote y repetir fase B
  -> POST /agentic/checkouts { quoteId, enrollmentId, presentation }
  -> proposal approved; la UI muestra QR con nextAction.url
Humano aprueba en la página de Reap (teléfono)
  -> GET /agentic/checkouts/:id cada 2 s hasta estado final
  -> COMPLETED: purchase con orderId y finalAmount; stock +1; proposal paid
  -> FAILED / EXPIRED: proposal failed con la razón; reintento = quote nuevo
```

- **Proposed:** la fase A va primero para que una solicitud incompatible, inyectada o a un merchant que no envía nunca toque Reap. Es el beat de "cero escrituras" del demo.
- **Proposed:** merchant y variante no se pueden verificar en la respuesta de Reap (E-3), así que `variant_exact` se cumple por construcción: el servidor arma `checkoutUrl` solo desde `catalog.json`, guarda la URL exacta junto al `quote_id`, y el gate compara esa URL guardada contra el catálogo. Ningún dato del agente entra en la URL.
- **Proposed:** `ships_to` sigue saliendo de `/merchants` (E-9). Si aun así Reap responde `QUOTE_UNFULFILLABLE` con `ITEMS_UNSHIPPABLE`, la propuesta se rechaza con esa razón: Reap queda como segunda red.

## 5. Tablas de decisión

### 5.1 Fase B del gate (moneda de la empresa MXN, tasas de ejemplo CAD 13.0 y AUD 12.0, tope 1000, presupuesto 6000)

| finalAmount del quote | Gasto del mes | expiresAt vs ahora | price_cap | budget | quote_valid | Resultado |
|---|---|---|---|---|---|---|
| 33.50 CAD (435.50 MXN) | 0 | +8 min | pasa | pasa | pasa | proposed |
| 102.00 CAD (1326 MXN, boquilla con envío desde Australia, S-7) | 0 | +8 min | falla | pasa | pasa | rejected |
| 33.50 CAD | 5800 | +8 min | pasa | falla | pasa | rejected |
| 33.50 CAD | 0 | exactamente ahora | pasa | pasa | falla | rejected (o requote al aprobar) |
| 33.50 USD (sin tasa en la tabla) | 0 | +8 min | falla cerrado | falla cerrado | pasa | rejected |

Todas las comparaciones en unidades menores con redondeo explícito, como ya fija el plan de seis agentes.

### 5.2 Estado del checkout (E-4, E-6) a estado de la propuesta

| Checkout | Propuesta | Acción |
|---|---|---|
| `REQUIRES_ACTION` | `approved` | Mostrar QR de `nextAction.url` y su `expiresAt`; seguir consultando |
| `PROCESSING` | `approved` | Seguir consultando |
| `COMPLETED` | `paid` | Guardar `orderId` y `finalAmount`; libro y stock en una transacción |
| `FAILED` | `failed` | Razón "el cargo o la orden no pasó"; reintento = quote y checkout nuevos |
| `EXPIRED` | `failed` | Razón "no se aprobó a tiempo"; reintento = quote y checkout nuevos |

No hace falta agregar estados al enum de `ProposalStatus`.

### 5.3 Errores del quote (E-3)

| Código | Acción |
|---|---|
| `QUOTE_UNFULFILLABLE` / `ITEMS_UNSHIPPABLE` | rejected, razón de envío |
| `QUOTE_UNFULFILLABLE` / `INVALID_PHONE`, `STATE_OR_PROVINCE_REQUIRED`, `ADDRESS_LINE_2_REQUIRED` | Error de configuración de la empresa; no es culpa de la propuesta. Mostrar en Ajustes |
| `CHECKOUT_URL_INVALID` | Error nuestro (catálogo o allowlist). Falla cerrado |
| `CARD_PAYMENT_UNAVAILABLE` | rejected; no reintentar igual (E-2) |
| `VARIANT_UNAVAILABLE` | rejected, "sin existencias" |
| `QUOTE_EXPIRED` | Nuevo quote |
| `AGENTIC_SERVICE_UNAVAILABLE`, `QUOTE_TEMPORARILY_UNAVAILABLE`, red caída | Reintento con la misma key y backoff |
| 403 `AGENTIC_PAYMENTS_NOT_ENABLED` | Falla cerrado; avisar al líder del equipo |

### 5.4 Idempotencia (E-5)

| Situación | Regla |
|---|---|
| Red caída, 429 o 5xx | Reintentar con la **misma** key |
| Error de negocio 4xx | Reap lo cachea 24 h y lo repite: usar una key **nueva** |
| Misma key, cuerpo distinto | 400 `IDEMPOTENT_PARAMETER_MISMATCH`: es un bug nuestro |
| Dos llamadas concurrentes, misma key | 409: reintentar con backoff |

Keys propuestas: `quote:{proposal_id}:{intento}` y `checkout:{proposal_id}:{intento}`. El intento sube solo tras un error de negocio o un estado final `FAILED`/`EXPIRED`. Se guarda antes de enviar.

## 6. Invariantes

1. Nunca hay checkout sin un quote que pasó la fase B en los últimos `expiresAt`.
2. El monto que va al libro es `finalAmount` del checkout `COMPLETED`, nunca el precio de catálogo.
3. Ninguna llamada a Reap usa datos que vengan del agente, del MCP o de la visión: merchant, URL, cantidad y dirección salen del servidor.
4. Una propuesta tiene a lo más un checkout `COMPLETED`.
5. Una propuesta rechazada en fase A no generó ninguna llamada a Reap.
6. La API key y el `enrollmentId` viven solo en el servidor; nunca llegan al LLM ni al cliente.

## 7. Interfaz propuesta (reemplaza `PaymentProvider` en `src/contracts.ts`)

```ts
export interface Money { amount: number; currency: string }
export interface ShippingAddress {
  firstName: string; lastName: string; phone: string; // E.164
  addressLine1: string; addressLine2?: string; city: string;
  region?: string; postalCode?: string; country: string;
}
export interface ProviderQuote {
  id: string; checkoutUrl: string; merchantDomain: string;
  itemsSubtotal: Money; shipping: Money | null; tax: Money | null;
  finalAmount: Money; expiresAt: string;
}
export type CheckoutStatus = 'REQUIRES_ACTION' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export interface ProviderCheckout {
  id: string; status: CheckoutStatus; approvalUrl: string | null;
  approvalExpiresAt: string | null; orderId: string | null; finalAmount: Money | null;
}
export type ProviderErrorCode =
  | 'ITEMS_UNSHIPPABLE' | 'ADDRESS_INVALID' | 'CHECKOUT_URL_INVALID' | 'CARD_PAYMENT_UNAVAILABLE'
  | 'VARIANT_UNAVAILABLE' | 'QUOTE_EXPIRED' | 'RETRYABLE' | 'NOT_ENABLED' | 'UNKNOWN';
export interface PaymentProvider {
  quote(input: { product: Product; quantity: 1; shipTo: ShippingAddress; email: string;
                 idempotencyKey: string }): Promise<ProviderQuote>;
  checkout(input: { quoteId: string; idempotencyKey: string }): Promise<ProviderCheckout>;
  getCheckout(id: string): Promise<ProviderCheckout>;
}
```

Cambios asociados:
- `Company` gana `shipping_address: ShippingAddress` y `billing_email: string` (el quote los exige, E-3).
- `GateInput.quote` pasa a ser `ProviderQuote`; `payment_variant_id` se reemplaza por `checkoutUrl` guardada.
- `Quote` propio (10 minutos) desaparece: la vigencia es `expiresAt` de Reap.
- `PaymentInput` y `PaymentResult` se eliminan.
- `MockProvider` implementa la misma interfaz y simula los tres pasos, incluido `EXPIRED`.

## 8. UI

- **Propuesta:** el checklist muestra fase A y fase B por separado; la fase B muestra el desglose del quote (subtotal, envío, impuestos, total en moneda original y en MXN) y el tiempo que le queda.
- **Aprobar:** crea el checkout y muestra un QR con `nextAction.url` más el enlace directo, con el texto "Aprueba en Reap desde tu teléfono". Estado "Esperando aprobación en Reap" con su vencimiento.
- **Reloj:** sale del demo. La aprobación obligatoria es la de Reap y simular otra confunde.
- **Insignia:** REAP SANDBOX o MOCK, según el proveedor que creó el checkout.
- **Errores:** una propuesta `failed` ofrece "Cotizar de nuevo", que crea quote y checkout con el intento siguiente.

## 9. Requisitos

| Req | Criterio | Base | Verificación |
|---|---|---|---|
| REQ-1 | CUANDO falla cualquier regla de fase A, EL sistema NO DEBE llamar a Reap | Proposed | Test con spy del provider: cero llamadas en P2 (compat) y P4 (envío) |
| REQ-2 | CUANDO se crea un quote, EL `checkoutUrl` DEBE ser `https://{merchant}/cart/{variant_id}:1` del catálogo y su host DEBE coincidir con `merchantDomain` | E-3 observed (regla de host) | Test unitario del constructor de URL; una URL con otro host falla cerrado |
| REQ-3 | `price_cap` y `budget` DEBEN evaluar `finalAmount` del quote convertido a la moneda de la empresa | E-3 observed | Casos de la tabla 5.1 |
| REQ-4 | CUANDO `expiresAt <= ahora + 60 s` al aprobar, EL sistema DEBE pedir un quote nuevo y repetir la fase B antes del checkout | E-3, E-6 observed | Test con reloj inyectado |
| REQ-5 | EL libro DEBE registrar `orderId` y `finalAmount` solo de un checkout `COMPLETED` | E-4 observed | Test con provider simulado en cada estado de la tabla 5.2 |
| REQ-6 | Reintentos por red, 429 y 5xx DEBEN usar la misma key; tras un error de negocio o estado final fallido, una key nueva | E-5 observed | Test de las cuatro filas de 5.4 contra transporte simulado |
| REQ-7 | `QUOTE_UNFULFILLABLE`/`ITEMS_UNSHIPPABLE` DEBE rechazar la propuesta con razón de envío | E-3 observed | Test con respuesta simulada |
| REQ-8 | EL `ReapProvider` DEBE fallar cerrado sin `REAP_API_KEY`, sin `REAP_ENROLLMENT_ID` o ante 403; NUNCA cae solo al mock | Proposed | Test de configuración |
| REQ-9 | EL flujo completo DEBE correr una vez contra el sandbox real con una pieza de digitmakers.ca hasta `COMPLETED` | E-2 observed (flujo) | Manual, con la key; se graba como respaldo |

## 10. Plan mínimo

| Archivo | Cambio | Dueño en el plan de seis agentes |
|---|---|---|
| `src/contracts.ts` | Interfaz de §7 | Integrador (1) |
| `src/server/payments.ts` | `ReapProvider` con `fetch`, headers `Authorization`, `Reap-Version: 2025-02-14`, `Idempotency-Key`; `MockProvider` con la misma interfaz | Agente 6 |
| `src/domain/gate.ts` | Separar `evaluateGateA` y `evaluateGateB` | Agente 2 |
| `src/server/workflow.ts` | Orquestar §4 y la consulta de estado | Integrador (1) |
| `tools/enroll.ts` | Script de una sola vez: crea enrollment `EXTERNAL`, imprime la URL hosted, guarda el id en `.env.local` | Agente 6 |
| Proposals UI | QR, desglose, estados de 5.2 | Agente 3 |

Comandos: `npx vitest run src/server/payments.test.ts src/domain`, `npm run typecheck`, `npm run build`.

Variables nuevas en `.env.example` (sin valores): `REAP_ENROLLMENT_ID`, `REAP_RETURN_URL`, `REAP_SIMULATE_CHECKOUT` (solo sandbox).

## 11. Verificado en el sandbox (2026-10-09, key del equipo)

| ID | Llamada | Resultado |
|---|---|---|
| S-1 | `POST /agentic/enrollments` `EXTERNAL` | 200, `REQUIRES_ACTION` con página hosted de Prava (`sandbox.collect.prava.space`); la tarjeta se captura ahí y crea una passkey. Después `GET` devuelve `ACTIVE` |
| S-2 | Quote `externalCheckout` digitmakers.ca, cable `67588566679782`, dirección en Toronto | 200. Subtotal 21.99 + envío 6.63 + impuestos 3.72 = `finalAmount` **32.34 CAD**. Nueve opciones de envío, la estándar preseleccionada. `expiresAt` unos 10 min después |
| S-3 | Mismo cable y tubo PTFE `42393530925286` con dirección en Guadalajara | 400 `QUOTE_UNFULFILLABLE` / `ITEMS_UNSHIPPABLE`. **digitmakers.ca no envía a MX**, aunque la lista `/merchants` lo indique |
| S-4 | `POST /agentic/checkouts` sobre el quote de S-2, sin `X-Simulate-Checkout` | 200, `REQUIRES_ACTION`, `amount` 32.34 CAD, `nextAction.url` en Prava, vence 10 min después |
| S-5 | Aprobación humana del checkout de S-4 en la página de Prava (passkey) | Pasa a `PROCESSING` en segundos y trae `orderId`. Más de 15 min después sigue en `PROCESSING`, sin llegar a `COMPLETED` |
| S-6 | Checkout con `X-Simulate-Checkout: COMPLETED` | Nace en `REQUIRES_ACTION` igual que sin el header; `GET` ya trae `orderId` y `finalAmount`, pero el estado no avanza solo. No sirve como atajo para el demo |
| S-7 | Quote `externalCheckout` cubictech.com.au, boquilla `53918466703643`, dirección en Toronto | 200. 61 CAD + 41 CAD de envío desde Australia, impuestos incluidos: `finalAmount` **102 CAD**. Una sola opción de envío. cubictech sí envía a CA |
| S-8 | Quote termistor digitmakers `44386635612390`, Toronto | 200, `finalAmount` 30.08 CAD |

Consecuencias: `externalCheckout` está habilitado (no hace falta `products/search`); el host es `sg.sandbox.api.reap.global`; `finalAmount` llega en la moneda del merchant (cubictech cotiza en CAD para una dirección en Canadá); los `ships_to` de `/merchants` no son confiables y la respuesta de Reap manda. El demo usa dos plantas, Guadalajara y Toronto; la de Guadalajara recibe el rechazo real de Reap. Con tope de 1,000 MXN, la boquilla de cubictech (1,326 MXN con envío) cae en `price_cap`. La UI debe presentar `PROCESSING` con `orderId` como "orden colocada, en confirmación"; el libro solo registra `COMPLETED` (pregunta abierta al equipo de Reap, S-5).

## 12. Supuestos y desconocidos

| Tema | Estado | Cómo se resuelve |
|---|---|---|
| Host del sandbox | Resuelto (S-1): `sg.sandbox.api.reap.global` | n/a |
| `externalCheckout` habilitado para los merchants de `/merchants` | Resuelto para digitmakers.ca (S-2) y cubictech.com.au (S-7) | n/a |
| Checkout que no sale de `PROCESSING` | Abierto (S-5) | Preguntar al equipo de Reap en el grupo si el sandbox llega a `COMPLETED` |
| Moneda de `finalAmount` | Resuelto (S-2): moneda del merchant | n/a |
| Página hosted del sandbox | Resuelto: enrollment (S-1) y aprobación de checkout con passkey (S-5) | n/a |
| `returnUrl` | Debe ser HTTPS (E-7); el demo corre en `127.0.0.1` | Usar cualquier página HTTPS estática; el estado se lee por consulta, no por el regreso |
| `X-Simulate-Checkout` | No salta la aprobación (S-6) | Respaldo real: grabación de una corrida completa |

**Diferencias deliberadas con el spec de producto:** quote de Reap en lugar del propio; gate en dos fases; el reloj sale; Reap pasa de P1 a P0.
