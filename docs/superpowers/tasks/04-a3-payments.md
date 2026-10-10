# A3: pagos, aprobación y libro

**Máquina:** M1 (guarda la llave de Reap) · **Rama:** `feat/a3-payments` · **Empieza en:** C0 · **Desbloquea:** C1 (Mock) y C5 (Reap)

## Misión

Que aprobar pague exactamente una vez, nunca con una cotización vencida, y que el costo quede cargado a la máquina. Reap entra detrás de la misma interfaz que el mock.

## Rutas que posee

`src/lib/payments/*`, `src/lib/approve.ts`, `src/lib/ledger.ts`, `tests/payments.test.ts`, `tests/approve.test.ts`, `tests/ledger.test.ts`, `tests/reap.test.ts`, `tests/fixtures/reap-*.json`, `docs/reap-notes.md`.

## Tareas

Código y pruebas exactas: Plan, "Workstream A3".

- [ ] **A3.1 Proveedor y mock.** `MockProvider` (idempotente por clave, `failNext`), `getProvider`, `getProviderMode`. 4 pruebas.
- [ ] **A3.2 `approveAndPay` y `rejectProposal`.** Reclamo atómico `proposed -> approved`, `recheck` antes de pagar, compra en MXN, estado `failed` si el proveedor cae. 5 pruebas (necesita A1 en `main`, o `vi.mock` de `gate-input`).
  - Debe cubrir: cotización vencida entre propuesta y aprobación no paga; doble clic y llamadas concurrentes dan una sola compra; propuesta rechazada lanza error.
- [ ] **A3.3 Libro.** `ledgerByMachine` (solo compras `paid`) y `monthTotalMxn`. 1 prueba. Push y aviso: "A3 listo para merge".
- [ ] **A3.4 `ReapProvider`. Bloqueada por documentación y llave.** Orden fijo:
  1. Pedir al líder del equipo la documentación y la llave sandbox; guardarla en `.env.local`.
  2. Escribir `docs/reap-notes.md` respondiendo: cómo se crea el checkout (variante, permalink o URL), qué devuelve, si compra variantes distintas a la de prueba de cada merchant, cómo soporta idempotencia, cómo distingue sandbox de producción. **Publicar las respuestas al equipo**: deciden si la demo usa una o tres piezas de digitmakers.ca.
  3. Guardar una respuesta real de éxito y una de error en `tests/fixtures/`.
  4. Prueba con `fetch` inyectado: `PayResult` igual al fixture, la petición lleva la clave de idempotencia, una llave no sandbox hace fallar el constructor.
  5. Implementar, compra sandbox manual del cable (`67588566679782`), anotar la referencia en las notas.
  6. Anunciar C5.

## Consume

De A1: `recheck`, `toMxn`, `spentThisMonthMxn`. De Task 0: `getItem`, `getCompany`, `getMachine`.

## Produce

```ts
getProvider(): PaymentProvider
getProviderMode(): 'mock' | 'reap'
class MockProvider { name: 'mock'; pay(i): Promise<PayResult>; failNext(msg?) }
approveAndPay(db, proposalId, now?, provider?): Promise<ApproveResult>
rejectProposal(db, proposalId, reason): void
ledgerByMachine(db): LedgerRow[]
monthTotalMxn(db, now): number
```

## Terminado cuando

- A3.1 a A3.3: 10 pruebas verdes y `tsc` limpio.
- A3.4: prueba de fixtures verde y una compra sandbox real con referencia registrada. Hasta entonces la UI muestra MOCK y el equipo lo dice en voz alta (el punto 1 de la checklist del hackathon no se cumple con el mock).

## Notas

(Respuestas de Reap, desvíos.)
