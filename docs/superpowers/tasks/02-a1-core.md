# A1: núcleo (gate, política, FX, gate-input)

**Máquina:** M1 · **Rama:** `feat/a1-core` · **Empieza en:** C0 · **Desbloquea:** C1

## Misión

Las reglas de negocio puras. "El LLM sugiere, el código decide": aquí vive todo lo que decide.

## Rutas que posee

`src/lib/gate.ts`, `policy.ts`, `fx.ts`, `gate-input.ts`; `tests/gate.test.ts`, `policy.test.ts`, `gate-input.test.ts`.
No tocar nada más. Eres también el árbitro de cambios de contrato (`contract:`).

## Tareas

Código y pruebas exactas: Plan, "Workstream A1".

- [ ] **A1.1 FX y gate.** `toMxn` y `evaluateGate` con las 7 reglas (`evidence`, `compat`, `variant_exact`, `ships_to`, `price_cap`, `budget`, `quote_valid`). Comparar modelos por tokens completos, no por subcadena. 11 pruebas.
  - Debe cubrir: MK3S no coincide dentro de MK3S+ y al revés; la foto con otro modelo falla `evidence`; el tope igual pasa y un centavo más falla; cotización vencida o precio cambiado; variante alterada.
- [ ] **A1.2 Política.** `needsRestock` (`qty < minQty`) y `applyHours` (consume repuesto al fin de vida, nunca baja de 0). 4 pruebas.
- [ ] **A1.3 Gate input.** `spentThisMonthMxn` (mes UTC, solo `paid`), `buildGateInput`, `recheck`. 4 pruebas.
- [ ] Push de la rama y aviso al coordinador (A6): "A1 listo para merge".

## Consume

`types.ts`, `catalog.ts`, `rows.ts`, `db.ts` (congelados en Task 0).

## Produce (otros dependen de esto)

```ts
toMxn(amount: number, currency: Currency): number
evaluateGate(i: GateInput): GateResult
needsRestock(s: Stock): boolean
applyHours(s: Stock, hours: number): { stock: Stock; consumed: boolean }
spentThisMonthMxn(db, now): number
buildGateInput(db, p): GateInput
recheck(db, proposalId, now): GateResult
```

## Terminado cuando

- 19 pruebas de A1 verdes (11 + 4 + 4) y `tsc` limpio.
- Las firmas coinciden con los stubs de Task 0 (no se renombró nada).
- Rama empujada y lista para merge.

## Notas

(Desvíos del plan, decisiones de contrato.)
