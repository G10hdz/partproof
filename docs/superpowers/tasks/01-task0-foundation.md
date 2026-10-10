# Task 0: fundación y contratos

**Agente:** A1 · **Máquina:** M1 · **Rama:** `feat/a1-core` · **Bloquea a:** todos

## Misión

Dejar en `main` un proyecto Next.js que compila, con los tipos, el esquema, el catálogo, la semilla y los stubs que los otros cinco agentes usan como contrato. Nadie más empieza hasta que esto esté mergeado.

## Rutas que posee

`package.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/lib/types.ts`, `schema.ts`, `db.ts`, `rows.ts`, `catalog.ts`, `src/data/catalog.json`, `src/data/seed.ts`, todos los stubs de `src/lib` y `tools/`, `tests/foundation.test.ts`.

## Tareas

Código exacto de cada paso: Plan, "Task 0".

- [ ] 1. Scaffold Next.js (App Router, TypeScript, `src/`, alias `@/*`) e instalar `better-sqlite3`, `zod`, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `vitest`, `tsx`. Scripts `test` y `typecheck`. (Plan: Task 0, pasos 1 y 2)
- [ ] 2. `src/lib/types.ts` con todos los tipos compartidos (`PartType`, `CatalogItem`, `GateInput`, `Verification`, `ProposalView`, `PaymentProvider`, `VisionResult`, ...). (paso 3)
- [ ] 3. `schema.ts`, `db.ts` (`getDb`, `newDb`), `rows.ts`, `catalog.ts`. (paso 4)
- [ ] 4. `catalog.json` con los 4 productos reales y `seed.ts` con Forja3D MX, 4 impresoras y stock. (paso 5)
- [ ] 5. Stubs con las firmas exactas de la lista del plan (Task 0, paso 6); cada uno lanza `not implemented: <agente>`. (paso 6)
- [ ] 6. `tests/foundation.test.ts` (semilla y catálogo). Correr `npx vitest run && npx tsc --noEmit`. (pasos 7 y 8)
- [ ] 7. Commit, push, merge a `main`, anunciar C0 a los otros cinco agentes. (paso 9)

## Produce

Cada firma pública de la lista de stubs del plan. Esa lista es el contrato; cambiarla después exige un commit `contract:`.

## Terminado cuando

- `npx vitest run` pasa 2 pruebas; `npx tsc --noEmit` sin errores.
- `main` contiene todo y los otros agentes pueden crear sus worktrees desde ahí.
- Anunciado C0.

## Notas

(El agente anota aquí desvíos del plan.)
