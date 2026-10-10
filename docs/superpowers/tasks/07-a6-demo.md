# A6: demo, integración y coordinación de merges

**Máquina:** M2 (corre la demo) · **Rama:** `feat/a6-demo` · **Empieza en:** C0 · **Cierra:** C4

## Misión

Que el guion de 3 minutos corra completo desde un reset, y ser quien integra: hace los merges en orden, corre la suite completa tras cada uno y anuncia los checkpoints C1 a C4.

## Rutas que posee

`src/app/api/demo/*`, `src/lib/demo.ts`, `tests/demo.test.ts`, `tests/integration.test.ts`, `docs/demo-runbook.md`.

## Tareas

Código exacto: Plan, "Workstream A6".

- [ ] **A6.1 Lógica y endpoints demo.** `advanceHours` (suma horas, consume repuesto al fin de vida, marca restock), `assertDemoMode`, y rutas `reset`, `advance` (llama al MCP real por el cliente de A2 con un `photo_id`), `inject` (nota maliciosa de ejemplo), `country`, `mode`. Todas devuelven 404 si `DEMO_MODE` no es `1`. 2 pruebas.
- [ ] **Merges y checkpoints.** Cuando cada agente avise, mergear en este orden, correr `npx vitest run && npx tsc --noEmit` después de cada uno y anunciar:
  - [ ] Task 0 ya en `main` (C0)
  - [ ] A1, A3 (Mock), A4 (C1)
  - [ ] A2 (C2)
  - [ ] A5 (C3)
- [ ] **A6.2 Prueba de integración.** Guion completo sobre base en memoria: P1 pide, pasa, se aprueba y el libro marca 285.87 MXN; P2 bloqueada por compatibilidad; P3 sí pasa; P4 bloqueada por envío a MX; nota maliciosa sin compra; token de otra máquina rechazado. Correr tras C2. Cualquier fallo es un desajuste de contrato: se arregla en la rama del dueño, no aquí.
- [ ] **A6.3 Runbook y ensayo.** `docs/demo-runbook.md` con preparación, guion con comandos exactos, qué decir cuando el banner muestra MOCK o REPETICIÓN, y recuperación. Ensayar dos veces completas en M2 desde un reset, cronometrar (máximo 3 minutos), corregir el runbook con lo que realmente pasó. Anunciar C4.
- [ ] Tras C5 (llega Reap): repetir un ensayo con `PAYMENT_PROVIDER=reap`.

## Consume

Todo: A1 (`applyHours`, `needsRestock`), A2 (`handleRequestPart`, `requestPartViaMcp`), A3 (`approveAndPay`, `ledgerByMachine`, `MockProvider`), A4 (fotos y `photo_id`).

## Produce

```ts
advanceHours(db, machineId, hours): { consumed: PartType[]; restock: PartType[] }
assertDemoMode(): Response | null
POST /api/demo/reset | advance | inject | country     GET /api/demo/mode
```

## Terminado cuando

- Suite completa verde, incluida la integración.
- Dos ensayos seguidos sin tocar código ni la base de datos, con tiempos anotados.
- Criterios de aceptación 1 a 8 del spec de demo (§8) marcados uno por uno en el runbook; el 7 (red apagada) probado de verdad.

## Notas

(Tiempos de ensayo, problemas de integración y a quién se le devolvieron.)
