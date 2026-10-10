# Task 0: fundación y contratos

**Agente:** A1 · **Máquina:** M1 · **Rama:** `feat/a1-core` · **Bloquea a:** todos

## Misión

Dejar en `main` un proyecto Next.js que compila, con los tipos, el esquema, el catálogo, la semilla y los stubs que los otros cinco agentes usan como contrato. Nadie más empieza hasta que esto esté mergeado.

## Rutas que posee

`package.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/lib/types.ts`, `schema.ts`, `db.ts`, `rows.ts`, `catalog.ts`, `src/data/catalog.json`, `src/data/seed.ts`, todos los stubs de `src/lib` y `tools/`, `tests/foundation.test.ts`.

## Tareas

Código exacto de cada paso: Plan, "Task 0".

- [x] 1. Scaffold Next.js (App Router, TypeScript, `src/`, alias `@/*`) e instalar `better-sqlite3`, `zod`, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `vitest`, `tsx`. Scripts `test` y `typecheck`. (Plan: Task 0, pasos 1 y 2)
- [x] 2. `src/lib/types.ts` con todos los tipos compartidos (`PartType`, `CatalogItem`, `GateInput`, `Verification`, `ProposalView`, `PaymentProvider`, `VisionResult`, ...). (paso 3)
- [x] 3. `schema.ts`, `db.ts` (`getDb`, `newDb`), `rows.ts`, `catalog.ts`. (paso 4)
- [x] 4. `catalog.json` con los 4 productos reales y `seed.ts` con Forja3D MX, 4 impresoras y stock. (paso 5)
- [x] 5. Stubs con las firmas exactas de la lista del plan (Task 0, paso 6); cada uno lanza `not implemented: <agente>`. (paso 6)
- [x] 6. `tests/foundation.test.ts` (semilla y catálogo). Correr `npx vitest run && npx tsc --noEmit`. (pasos 7 y 8)
- [ ] 7. Commit, push, merge a `main`, anunciar C0 a los otros cinco agentes. (paso 9)

## Produce

Cada firma pública de la lista de stubs del plan. Esa lista es el contrato; cambiarla después exige un commit `contract:`.

## Terminado cuando

- `npx vitest run` pasa 2 pruebas; `npx tsc --noEmit` sin errores.
- `main` contiene todo y los otros agentes pueden crear sus worktrees desde ahí.
- Anunciado C0.

## Notas

Implementación verificada en el worktree existente, rama `bowfin` (M1). Se reutilizó el scaffold Next.js y se conservaron la UI y `src/contracts.ts`; los contratos nuevos de este plan están en `src/lib/types.ts`.

La semilla se ejecuta en una transacción para no perder datos si falla. Las dos pruebas también verifican los hashes de tokens, el reseteo repetido y el rollback. `npm test` conserva la prueba del launcher; Vitest incluye `src/**/*.test.ts` y `tests/**/*.test.ts`. `VISION_MODE=replay` se conserva para la demo sin credenciales.

Verificación: `npm test` (launcher y 2 pruebas), `npm run typecheck` y `npm run build` pasan. Catálogo copiado del snapshot del plan; monedas y condiciones comerciales pendientes de confirmar antes de pagos.

Commit local autorizado; sin push ni merge automático. C0 pendiente hasta integrar en `main`; los otros agentes aún no deben empezar.
