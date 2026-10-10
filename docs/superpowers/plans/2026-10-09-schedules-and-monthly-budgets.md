# Presupuesto por mes y compras programadas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir presupuestos distintos por mes y programar la reposición de una pieza (una vez o cada mes) sin pago automático.

**Architecture:** Los meses con excepción viven en `Company.budget_overrides` y el gate los lee con `budgetFor`. Las programaciones son una tabla JSON `schedule` más un módulo `src/server/schedules.ts` que, al vencer una, llama al `createProposal` existente con la placa registrada; la propuesta resultante sigue el flujo normal de aprobación humana en Reap.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, `node:sqlite`, vitest, zod.

**Spec:** `docs/superpowers/specs/2026-10-09-schedules-and-monthly-budgets-design.md`

## Cambios respecto al spec

- `Schedule` suma `anchor_day` (día del mes original) y `created_at`; sin `anchor_day`, 31 ene → 28 feb → 28 mar derivaría.
- `budgetFor` vive en `src/domain/budget.ts` (archivo propio) y `gate.ts` lo importa.
- La lógica de ejecución vive en `src/server/schedules.ts`, no dentro de `workflow.ts`. Recibe `createProposal` por inyección.

## Prerrequisito

Las Tareas 1–6 solo tocan backend y se pueden hacer ya sobre `feat/schedules-budgets` (creada desde `origin/main`). Las Tareas 7–8 editan `SettingsForm.tsx`, `Nav` y las páginas de UI que llegan con el PR #16: **mergear #16 y hacer `git rebase origin/main` antes de la Tarea 7.** La Tarea 9 verifica todo.

## Global Constraints

- Todo texto visible al usuario y todos los mensajes de error van en español.
- El mes se calcula en **UTC** (igual que `monthlySpend` en `workflow.ts`).
- Nada se paga solo: una programación solo crea una propuesta; nunca llama a `approve`.
- La foto de una propuesta programada es `plate_<id en minúsculas>` (la placa registrada), igual que `onLowStock` en `backend.ts`.
- Una sola propuesta abierta por máquina y pieza (índice `proposal_open` existente); no se duplica.
- Sin dependencias nuevas.
- Comandos: `npx tsc --noEmit`, `npx vitest run <ruta>`, `npm run build`.
- Mensajes de commit terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Frontera de mes en UTC: el 31 dic 23:59:59Z usa la excepción de diciembre; el 1 ene 00:00:00Z usa la base. (Tarea 1)
2. Mensual en días 29–31: 31 ene → 28 feb → 31 mar; año bisiesto 29 feb; meses saltados crean una sola propuesta. (Tareas 3 y 5)
3. Doble ejecución: dos `runDueSchedules` concurrentes no duplican propuestas. (Tarea 5)
4. `CRON_SECRET` sin definir: el endpoint responde 401 siempre, nunca queda abierto. (Tarea 6)
5. Fecha inexistente (`2026-02-31`), pieza que la máquina no usa o fecha pasada: se rechazan con mensaje, no se guardan. (Tarea 5)

---

### Task 1: Presupuesto por mes en el dominio y el gate

**Files:**
- Create: `src/domain/budget.ts`
- Create: `src/domain/budget.test.ts`
- Modify: `src/contracts.ts` (interface `Company`, nueva `SettingsInput`, `PartProofServer.saveSettings`)
- Modify: `src/domain/gate.ts` (import y línea `const budgetMinor`)

**Interfaces:**
- Produces: `budgetFor(company: Pick<Company,'monthly_budget'|'budget_overrides'>, now: Date): number`, `monthKey(d: Date): string`, `MONTH_KEY: RegExp`, `validateSettings(input: SettingsInput): void` (lanza `Error` en español). Tipo `SettingsInput` en `@/contracts`.

- [ ] **Step 1: Write the failing test** — crear `src/domain/budget.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Company, GateInputB } from '@/contracts';
import { budgetFor, monthKey, validateSettings } from './budget';
import { evaluateGateB } from './gate';

const base = { monthly_budget: 6000, purchase_cap: 1000 };

describe('budgetFor', () => {
  it('usa la excepción del mes y la base en los demás', () => {
    const c = { ...base, budget_overrides: { '2026-12': 3000 } };
    expect(budgetFor(c, new Date('2026-12-05T10:00:00Z'))).toBe(3000);
    expect(budgetFor(c, new Date('2026-11-05T10:00:00Z'))).toBe(6000);
  });
  it('sin budget_overrides usa la base', () => {
    expect(budgetFor(base, new Date('2026-12-05T10:00:00Z'))).toBe(6000);
  });
  it('el mes se cuenta en UTC', () => {
    const c = { ...base, budget_overrides: { '2026-12': 3000 } };
    expect(budgetFor(c, new Date('2026-12-31T23:59:59Z'))).toBe(3000);
    expect(budgetFor(c, new Date('2027-01-01T00:00:00Z'))).toBe(6000);
    expect(monthKey(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01');
  });
});

describe('validateSettings', () => {
  it('acepta límites válidos con excepciones', () => {
    expect(() => validateSettings({ ...base, budget_overrides: { '2026-12': 3000 } })).not.toThrow();
    expect(() => validateSettings(base)).not.toThrow();
  });
  it.each([
    ['presupuesto NaN', { monthly_budget: NaN, purchase_cap: 1 }],
    ['tope negativo', { monthly_budget: 100, purchase_cap: -1 }],
    ['tope mayor que el presupuesto', { monthly_budget: 100, purchase_cap: 200 }],
    ['mes 13', { ...base, budget_overrides: { '2026-13': 3000 } }],
    ['mes sin cero', { ...base, budget_overrides: { '2026-1': 3000 } }],
    ['monto negativo', { ...base, budget_overrides: { '2026-12': -5 } }],
    ['tope mayor que la excepción', { ...base, budget_overrides: { '2026-12': 500 } }],
  ])('rechaza %s', (_name, input) => {
    expect(() => validateSettings(input)).toThrow();
  });
});

describe('gate B con excepción', () => {
  const company: Company = { id: 'c', name: 'C', currency: 'MXN', ...base, billing_email: 'a@b.c', budget_overrides: { '2026-12': 400 } };
  const input = (now: string): GateInputB => ({
    company, monthly_spend: 0, fx_to_company: { CAD: 13, MXN: 1 }, now: new Date(now),
    quote: { id: 'q', checkoutUrl: 'https://x', merchantDomain: 'x', itemsSubtotal: { amount: 21.99, currency: 'CAD' },
      shipping: null, tax: null, finalAmount: { amount: 32.34, currency: 'CAD' }, expiresAt: '2026-12-31T23:59:00Z' },
  });
  it('la regla budget usa la excepción del mes (420.42 MXN > 400)', () => {
    const budget = evaluateGateB(input('2026-12-05T00:00:00Z')).find((c) => c.rule === 'budget')!;
    expect(budget.passed).toBe(false);
  });
  it('en otro mes usa la base (420.42 MXN <= 6000)', () => {
    const budget = evaluateGateB(input('2026-11-05T00:00:00Z')).find((c) => c.rule === 'budget')!;
    expect(budget.passed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/budget.test.ts`
Expected: FAIL (`Failed to resolve import "./budget"`).

- [ ] **Step 3: Write minimal implementation**

3a. En `src/contracts.ts`, dentro de `interface Company`, después de `billing_email: string;` agregar:

```ts
  // Presupuesto distinto para meses concretos ('YYYY-MM' en UTC); un mes sin entrada usa monthly_budget.
  budget_overrides?: Record<string, number>;
```

3b. En `src/contracts.ts`, antes de `export interface PartProofServer`, agregar:

```ts
export interface SettingsInput {
  monthly_budget: number;
  purchase_cap: number;
  // Si se omite se conservan las excepciones actuales; un objeto vacío las borra.
  budget_overrides?: Record<string, number>;
}
```

3c. En `src/contracts.ts`, reemplazar la línea `saveSettings(input: { monthly_budget: number; purchase_cap: number }): Promise<void>;` por:

```ts
  saveSettings(input: SettingsInput): Promise<void>;
```

3d. Crear `src/domain/budget.ts`:

```ts
// Presupuesto mensual con excepciones por mes. Puro: sin red ni base de datos.
import type { Company, SettingsInput } from '@/contracts';

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function budgetFor(company: Pick<Company, 'monthly_budget' | 'budget_overrides'>, now: Date): number {
  return company.budget_overrides?.[monthKey(now)] ?? company.monthly_budget;
}

const amount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function validateSettings(input: SettingsInput): void {
  if (!amount(input.monthly_budget) || !amount(input.purchase_cap)) throw new Error('Presupuesto o tope inválido');
  if (input.purchase_cap > input.monthly_budget) throw new Error('El tope por compra no puede superar el presupuesto mensual');
  for (const [month, value] of Object.entries(input.budget_overrides ?? {})) {
    if (!MONTH_KEY.test(month)) throw new Error(`Mes inválido: ${month}`);
    if (!amount(value)) throw new Error(`Presupuesto inválido para ${month}`);
    if (input.purchase_cap > value) throw new Error(`El tope por compra supera el presupuesto de ${month}`);
  }
}
```

3e. En `src/domain/gate.ts`, junto a `import { normalizeModel } from './compat';` agregar `import { budgetFor } from './budget';` y reemplazar
`const budgetMinor = Math.round(company.monthly_budget * MINOR_UNITS);` por
`const budgetMinor = Math.round(budgetFor(company, now) * MINOR_UNITS);`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain && npx tsc --noEmit`
Expected: PASS (todas las pruebas de `src/domain`); `tsc` sin errores (si `tsc` se queja de `fake-server.ts`/`real-server.ts` por `saveSettings`, no debería: el tipo nuevo es compatible hacia atrás).

- [ ] **Step 5: Commit**

```bash
git add src/domain/budget.ts src/domain/budget.test.ts src/domain/gate.ts src/contracts.ts
git commit -m "feat(domain): per-month budget overrides in the gate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `saveSettings` y libro con excepciones

**Files:**
- Modify: `src/server/real-server.ts` (`saveSettings`, `getLedger`, imports)
- Modify: `src/server/fake-server.ts` (`saveSettings`, `getLedger`, imports)
- Modify: `src/app/actions.ts` (esquema zod de `saveSettings`)
- Create: `src/server/settings.test.ts`

**Interfaces:**
- Consumes: `budgetFor`, `monthKey`, `validateSettings` de `@/domain/budget`; `SettingsInput` de `@/contracts`.
- Produces: `saveSettings(input: SettingsInput)` persiste `budget_overrides`; `getLedger().monthly_budget` es el del mes actual (UTC).

- [ ] **Step 1: Write the failing test** — crear `src/server/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PartProofServer } from '@/contracts';
import { monthKey } from '@/domain/budget';
import { openStore } from './db';
import { createFakeServer } from './fake-server';
import { createRealServer } from './real-server';
import type { Workflow } from './workflow';

const real = (): PartProofServer =>
  createRealServer({
    store: openStore(':memory:'), workflow: { monthlySpend: () => 0 } as unknown as Workflow,
    providerMode: 'mock', visionMode: 'replay', demo: true,
  });

describe.each([['real', real], ['fake', createFakeServer]])('saveSettings (%s)', (_name, make) => {
  it('guarda excepciones y el libro usa la del mes actual', async () => {
    const s = make();
    const month = monthKey(new Date());
    await s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { [month]: 2500 } });
    expect((await s.getCompany()).budget_overrides).toEqual({ [month]: 2500 });
    expect((await s.getLedger()).monthly_budget).toBe(2500);
  });

  it('omitir budget_overrides conserva las existentes; {} las borra', async () => {
    const s = make();
    await s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { '2030-01': 2000 } });
    await s.saveSettings({ monthly_budget: 7000, purchase_cap: 1000 });
    expect((await s.getCompany()).budget_overrides).toEqual({ '2030-01': 2000 });
    await s.saveSettings({ monthly_budget: 7000, purchase_cap: 1000, budget_overrides: {} });
    expect((await s.getCompany()).budget_overrides).toEqual({});
  });

  it('rechaza tope mayor que el presupuesto y meses inválidos sin guardar nada', async () => {
    const s = make();
    await expect(s.saveSettings({ monthly_budget: 100, purchase_cap: 200 })).rejects.toThrow();
    await expect(s.saveSettings({ monthly_budget: 6000, purchase_cap: 1000, budget_overrides: { '2026-13': 1 } })).rejects.toThrow();
    expect((await s.getCompany()).monthly_budget).toBe(6000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/settings.test.ts`
Expected: FAIL (excepciones no se guardan / no se rechaza tope > presupuesto).

- [ ] **Step 3: Write minimal implementation**

3a. `src/server/real-server.ts`: agregar `import { budgetFor, validateSettings } from '@/domain/budget';` junto a los imports. Reemplazar el cuerpo de `saveSettings` por:

```ts
    async saveSettings(input) {
      validateSettings(input);
      const company = store.getCompany();
      store.putCompany({
        ...company, monthly_budget: input.monthly_budget, purchase_cap: input.purchase_cap,
        budget_overrides: input.budget_overrides ?? company.budget_overrides ?? {},
      });
    },
```

En `getLedger`, reemplazar `monthly_budget: company.monthly_budget` por `monthly_budget: budgetFor(company, new Date())`.

3b. `src/server/fake-server.ts`: agregar `import { budgetFor, validateSettings } from '@/domain/budget';` (después del bloque `import type {...} from '@/contracts';`). Reemplazar `saveSettings` por:

```ts
    async saveSettings(input) {
      validateSettings(input);
      company = {
        ...company, monthly_budget: input.monthly_budget, purchase_cap: input.purchase_cap,
        budget_overrides: input.budget_overrides ?? company.budget_overrides ?? {},
      };
    },
```

y en `getLedger` reemplazar `monthly_budget: company.monthly_budget` por `monthly_budget: budgetFor(company, new Date())`.

3c. `src/app/actions.ts`: reemplazar la acción `saveSettings` por:

```ts
export async function saveSettings(input: SettingsInput): Promise<ActionResult<null>> {
  const parsed = z.object({
    monthly_budget: Money,
    purchase_cap: Money,
    budget_overrides: z.record(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), Money).optional(),
  }).strict().parse(input);
  return run(async () => { await server.saveSettings(parsed); return null; });
}
```

y agregar `type SettingsInput` al `import { PART_TYPES, type EvidencePreview, ... } from '@/contracts';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (suite completa) y `tsc` limpio.

- [ ] **Step 5: Commit**

```bash
git add src/server/real-server.ts src/server/fake-server.ts src/app/actions.ts src/server/settings.test.ts
git commit -m "feat(server): persist per-month budget overrides

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fechas mensuales y tipos de programación

**Files:**
- Modify: `src/contracts.ts` (tipos `Schedule*`, métodos en `PartProofServer`)
- Create: `src/domain/schedule.ts`
- Create: `src/domain/schedule.test.ts`

**Interfaces:**
- Produces (en `@/contracts`): `ScheduleRepeat`, `ScheduleOutcome`, `Schedule`, `ScheduleInput`; en `PartProofServer`: `listSchedules(): Promise<Schedule[]>`, `createSchedule(input: ScheduleInput): Promise<Schedule>`, `cancelSchedule(id: string): Promise<Schedule>`, `runDueSchedules(): Promise<Schedule[]>`.
- Produces (en `src/domain/schedule.ts`): `monthlyRunAfter(nextRun: string, anchorDay: number, now: Date): string` — primera ocurrencia mensual **estrictamente posterior** a `now`, partiendo de `nextRun`, con el día recortado al último día del mes.

- [ ] **Step 1: Write the failing test** — crear `src/domain/schedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { monthlyRunAfter } from './schedule';

const at = (s: string) => new Date(s);

describe('monthlyRunAfter', () => {
  it('31 ene -> 28 feb y luego 31 mar (el día ancla no se pierde)', () => {
    const feb = monthlyRunAfter('2026-01-31T00:00:00.000Z', 31, at('2026-01-31T00:00:00Z'));
    expect(feb).toBe('2026-02-28T00:00:00.000Z');
    expect(monthlyRunAfter(feb, 31, at('2026-02-28T00:00:00Z'))).toBe('2026-03-31T00:00:00.000Z');
  });
  it('año bisiesto: 31 ene 2028 -> 29 feb 2028', () => {
    expect(monthlyRunAfter('2028-01-31T00:00:00.000Z', 31, at('2028-01-31T00:00:00Z'))).toBe('2028-02-29T00:00:00.000Z');
  });
  it('meses saltados dan una sola fecha futura (no una por mes perdido)', () => {
    expect(monthlyRunAfter('2026-01-31T00:00:00.000Z', 31, at('2026-04-15T00:00:00Z'))).toBe('2026-04-30T00:00:00.000Z');
  });
  it('cruza de diciembre a enero y conserva la hora', () => {
    expect(monthlyRunAfter('2026-12-15T09:30:00.000Z', 15, at('2026-12-15T09:30:00Z'))).toBe('2027-01-15T09:30:00.000Z');
  });
  it('la fecha resultante siempre es posterior a now', () => {
    const now = at('2026-06-10T12:00:00Z');
    expect(Date.parse(monthlyRunAfter('2026-06-10T12:00:00.000Z', 10, now))).toBeGreaterThan(now.getTime());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/schedule.test.ts`
Expected: FAIL (`Failed to resolve import "./schedule"`).

- [ ] **Step 3: Write minimal implementation**

3a. `src/domain/schedule.ts`:

```ts
// Fechas de compras programadas mensuales. Puro; todo en UTC.
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export function monthlyRunAfter(nextRun: string, anchorDay: number, now: Date): string {
  const start = new Date(nextRun);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  let next = start;
  while (next.getTime() <= now.getTime()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    next = new Date(Date.UTC(year, month, Math.min(anchorDay, daysIn(year, month)), start.getUTCHours(), start.getUTCMinutes()));
  }
  return next.toISOString();
}
```

3b. `src/contracts.ts`: antes de `export interface PartProofServer` agregar:

```ts
export type ScheduleRepeat = 'once' | 'monthly';
export type ScheduleOutcome = 'proposed' | 'rejected' | 'skipped' | 'error';
// Compra programada: al vencer crea una propuesta; nunca paga por su cuenta.
export interface Schedule {
  id: string;
  machine_id: string;
  part_type: PartType;
  next_run: string;      // ISO UTC
  anchor_day: number;    // día del mes de la fecha original; evita que 31 ene -> 28 feb -> 28 mar
  repeat: ScheduleRepeat;
  active: boolean;
  created_at: string;
  last_run: string | null;
  last_result: { status: ScheduleOutcome; proposal_id: string | null; message: string } | null;
}
export interface ScheduleInput {
  machine_id: string;
  part_type: PartType;
  next_run: string;      // ISO UTC; la UI manda medianoche UTC del día elegido
  repeat: ScheduleRepeat;
}
```

y dentro de `PartProofServer`, después de `recordEvent(...)`:

```ts
  listSchedules(): Promise<Schedule[]>;
  createSchedule(input: ScheduleInput): Promise<Schedule>;
  cancelSchedule(id: string): Promise<Schedule>;
  // Crea la propuesta de cada programación vencida. Seguro de repetir: cada una se reserva antes de cotizar.
  runDueSchedules(): Promise<Schedule[]>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/schedule.test.ts`
Expected: PASS (5 pruebas). `npx tsc --noEmit` fallará en `real-server.ts` y `fake-server.ts` por los métodos nuevos faltantes: es esperado y se resuelve en la Tarea 6; en esta tarea solo se exige que pase la prueba de `schedule.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/contracts.ts src/domain/schedule.ts src/domain/schedule.test.ts
git commit -m "feat(domain): monthly schedule dates and Schedule contract

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Tabla `schedule` en el store

**Files:**
- Modify: `src/server/db.ts` (SCHEMA, imports, `seed`, métodos)
- Create: `src/server/schedule-fixtures.ts` (helper compartido por las pruebas de las Tareas 4 y 5)
- Create: `src/server/schedule-store.test.ts`

**Interfaces:**
- Consumes: `Schedule` de `@/contracts`.
- Produces (solo pruebas): `sched(overrides?: Partial<Schedule>): Schedule` en `src/server/schedule-fixtures.ts`.
- Produces: `store.listSchedules(): Schedule[]` (orden por `next_run`, luego `id`), `store.getSchedule(id): Schedule | null`, `store.putSchedule(s: Schedule): void`. `store.seed()` vacía la tabla.

- [ ] **Step 1: Write the failing test** — crear `src/server/schedule-fixtures.ts`:

```ts
import type { Schedule } from '@/contracts';

export const sched = (o: Partial<Schedule> = {}): Schedule => ({
  id: 's1', machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-01T00:00:00.000Z', anchor_day: 1,
  repeat: 'once', active: true, created_at: '2026-09-01T00:00:00.000Z', last_run: null, last_result: null, ...o,
});
```

y crear `src/server/schedule-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { openStore } from './db';
import { sched } from './schedule-fixtures';

describe('store de programaciones', () => {
  it('guarda, lee, actualiza y ordena por fecha', () => {
    const store = openStore(':memory:');
    store.putSchedule(sched({ id: 'b', next_run: '2026-11-01T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-01T00:00:00.000Z' }));
    expect(store.listSchedules().map((s) => s.id)).toEqual(['a', 'b']);
    store.putSchedule(sched({ id: 'a', active: false }));
    expect(store.getSchedule('a')?.active).toBe(false);
    expect(store.getSchedule('nope')).toBeNull();
  });
  it('seed() borra las programaciones', () => {
    const store = openStore(':memory:');
    store.putSchedule(sched());
    store.seed();
    expect(store.listSchedules()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/schedule-store.test.ts`
Expected: FAIL (`store.putSchedule is not a function`).

- [ ] **Step 3: Write minimal implementation** — en `src/server/db.ts`:

3a. Agregar `Schedule` al `import type { Company, EventView, LedgerRow, Machine, ProposalView, Site, Stock } from '@/contracts';`.

3b. En `SCHEMA`, después de la tabla `event`, agregar:

```sql
CREATE TABLE IF NOT EXISTS schedule (id TEXT PRIMARY KEY, data TEXT NOT NULL);
```

3c. En `seed()`, cambiar la lista a `['company', 'site', 'machine', 'stock', 'proposal', 'purchase', 'event', 'schedule']`.

3d. Antes de `addEvent`, agregar al objeto `store`:

```ts
    listSchedules: () =>
      parse<Schedule>(db.prepare(`SELECT data FROM schedule ORDER BY json_extract(data, '$.next_run'), id`).all()),
    getSchedule: (id: string) => parse<Schedule>(db.prepare('SELECT data FROM schedule WHERE id = ?').all(id))[0] ?? null,
    putSchedule: (s: Schedule) => db.prepare('INSERT OR REPLACE INTO schedule (id, data) VALUES (?, ?)').run(s.id, JSON.stringify(s)),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/schedule-store.test.ts`
Expected: PASS (2 pruebas).

- [ ] **Step 5: Commit**

```bash
git add src/server/db.ts src/server/schedule-fixtures.ts src/server/schedule-store.test.ts
git commit -m "feat(server): schedule table in the store

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Módulo de programaciones (crear, cancelar, ejecutar vencidas)

**Files:**
- Create: `src/server/schedules.ts`
- Create: `src/server/schedules.test.ts`

**Interfaces:**
- Consumes: `Store` (`getMachine`, `getStock`, `findOpenProposal`, `getProposal`, `listSchedules`, `getSchedule`, `putSchedule`, `tx`) de `./db`; `monthlyRunAfter` de `@/domain/schedule`; `RequestPartInput`, `RequestPartResult`, `Schedule`, `ScheduleInput` de `@/contracts`.
- Produces: `createSchedules(deps: { store: Store; createProposal(input: RequestPartInput): Promise<RequestPartResult>; now?: () => Date; newId?: () => string })` que devuelve `{ list(): Schedule[]; create(input: ScheduleInput): Schedule; cancel(id: string): Schedule; runDue(): Promise<Schedule[]> }`.

Reglas de `runDue()`: por cada programación `active` con `next_run <= now`, **primero** (en `store.tx`) la reserva — si `once` pasa a `active=false`, si `monthly` avanza `next_run` con `monthlyRunAfter` — y **después** llama a `createProposal` con `photo_id = plate_<machine en minúsculas>`, `hours_since_replace` = horas actuales del stock y `note: 'Compra programada'`. Resultado: `skipped` si ya hay propuesta abierta de esa máquina y pieza (no se llama a `createProposal`), `proposed`, `rejected` (con la razón de la propuesta), o `error` (sin stock, `needs_confirmation` o excepción).

- [ ] **Step 1: Write the failing test** — crear `src/server/schedules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RequestPartInput, RequestPartResult } from '@/contracts';
import { openStore } from './db';
import { sched } from './schedule-fixtures';
import { createSchedules } from './schedules';

const NOW = new Date('2026-10-10T12:00:00Z');
const PROPOSED = (id: string): RequestPartResult => ({
  proposal_id: id, status: 'proposed', verification: { passed: true, phase_reached: 'B', checks: [] },
});

function setup(script: (input: RequestPartInput) => Promise<RequestPartResult> = async () => PROPOSED('pr-1')) {
  const store = openStore(':memory:');
  store.seed();
  const calls: RequestPartInput[] = [];
  let n = 0;
  const schedules = createSchedules({
    store, now: () => NOW, newId: () => `sch-${++n}`,
    createProposal: async (input) => { calls.push(input); return script(input); },
  });
  return { store, schedules, calls };
}

describe('crear y cancelar', () => {
  it('crea con el día ancla de la fecha y la guarda activa', () => {
    const { schedules, store } = setup();
    const s = schedules.create({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-31T00:00:00.000Z', repeat: 'monthly' });
    expect(s).toMatchObject({ id: 'sch-1', active: true, anchor_day: 31, last_run: null, last_result: null });
    expect(store.getSchedule('sch-1')).toEqual(s);
  });
  it.each([
    ['máquina inexistente', { machine_id: 'PX', part_type: 'nozzle', next_run: '2026-10-31T00:00:00.000Z', repeat: 'once' }],
    ['pieza que la máquina no usa', { machine_id: 'P1', part_type: 'nozzle', next_run: '2026-10-31T00:00:00.000Z', repeat: 'once' }],
    ['fecha pasada', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-09T00:00:00.000Z', repeat: 'once' }],
    ['fecha inexistente', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-02-31T00:00:00.000Z', repeat: 'once' }],
    ['repetición inválida', { machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-31T00:00:00.000Z', repeat: 'weekly' }],
  ] as const)('rechaza %s', (_name, input) => {
    const { schedules, store } = setup();
    expect(() => schedules.create(input as never)).toThrow();
    expect(store.listSchedules()).toHaveLength(0);
  });
  it('permite programar para hoy', () => {
    const { schedules } = setup();
    expect(() => schedules.create({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: '2026-10-10T00:00:00.000Z', repeat: 'once' })).not.toThrow();
  });
  it('cancelar desactiva y conserva el historial; id desconocido lanza', () => {
    const { schedules, store } = setup();
    store.putSchedule(sched());
    expect(schedules.cancel('s1').active).toBe(false);
    expect(() => schedules.cancel('nope')).toThrow();
  });
});

describe('runDue', () => {
  it('una vez: crea la propuesta con la placa registrada y se desactiva', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    const ran = await schedules.runDue();
    expect(ran).toHaveLength(1);
    expect(calls).toEqual([{ machine_id: 'P1', part_type: 'accelerometer_cable', hours_since_replace: 1500, photo_id: 'plate_p1', note: 'Compra programada' }]);
    expect(store.getSchedule('s1')).toMatchObject({
      active: false, last_run: NOW.toISOString(), last_result: { status: 'proposed', proposal_id: 'pr-1' },
    });
  });
  it('no toca las que aún no vencen ni las canceladas', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-11T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'b', next_run: '2026-10-01T00:00:00.000Z', active: false }));
    expect(await schedules.runDue()).toEqual([]);
    expect(calls).toHaveLength(0);
  });
  it('ejecutar dos veces seguidas no duplica', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(await schedules.runDue()).toEqual([]);
    expect(calls).toHaveLength(1);
  });
  it('dos ejecuciones concurrentes crean una sola propuesta', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await Promise.all([schedules.runDue(), schedules.runDue()]);
    expect(calls).toHaveLength(1);
  });
  it('mensual: sigue activa y salta a la próxima fecha futura, una propuesta aunque falten meses', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ repeat: 'monthly', anchor_day: 31, next_run: '2026-07-31T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(1);
    expect(store.getSchedule('s1')).toMatchObject({ active: true, next_run: '2026-10-31T00:00:00.000Z' });
  });
  it('con propuesta abierta queda skipped y no llama a createProposal', async () => {
    const { schedules, store, calls } = setup();
    store.putProposal({
      id: 'open-1', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable', status: 'proposed', product: null, quote: null,
      quote_amount_company: null, checkout: null, provider: 'mock', verification: { passed: false, phase_reached: 'A', checks: [] },
      reason: null, hours_since_replace: 1, photo_id: 'plate_p1', created_at: NOW.toISOString(),
    }, 1);
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(0);
    expect(store.getSchedule('s1')?.last_result).toMatchObject({ status: 'skipped', proposal_id: 'open-1' });
  });
  it('rechazo del gate: guarda la razón de la propuesta', async () => {
    const { schedules, store } = setup(async () => {
      store.putProposal({
        id: 'pr-9', machine_id: 'P1', site_id: 'tor', part_type: 'accelerometer_cable', status: 'rejected', product: null, quote: null,
        quote_amount_company: null, checkout: null, provider: 'mock', verification: { passed: false, phase_reached: 'B', checks: [] },
        reason: 'Total excede el tope', hours_since_replace: 1, photo_id: 'plate_p1', created_at: NOW.toISOString(),
      }, 1);
      return { proposal_id: 'pr-9', status: 'rejected', verification: { passed: false, phase_reached: 'B', checks: [] } };
    });
    store.putSchedule(sched({ next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(store.getSchedule('s1')?.last_result).toMatchObject({ status: 'rejected', proposal_id: 'pr-9', message: 'Total excede el tope' });
  });
  it('needs_confirmation y excepciones quedan como error sin romper las demás', async () => {
    let n = 0;
    const { schedules, store } = setup(async () => {
      n += 1;
      if (n === 1) return { proposal_id: null, status: 'needs_confirmation', reason: 'Placa ilegible' };
      throw new Error('Reap caído');
    });
    store.putSchedule(sched({ id: 'a', next_run: '2026-10-01T00:00:00.000Z' }));
    store.putSchedule(sched({ id: 'b', next_run: '2026-10-02T00:00:00.000Z' }));
    await schedules.runDue();
    expect(store.getSchedule('a')?.last_result).toMatchObject({ status: 'error', message: 'Placa ilegible' });
    expect(store.getSchedule('b')?.last_result).toMatchObject({ status: 'error', message: 'Reap caído' });
  });
  it('pieza que ya no está en el stock queda como error', async () => {
    const { schedules, store, calls } = setup();
    store.putSchedule(sched({ part_type: 'nozzle', next_run: '2026-10-10T00:00:00.000Z' }));
    await schedules.runDue();
    expect(calls).toHaveLength(0);
    expect(store.getSchedule('s1')?.last_result?.status).toBe('error');
  });
});
```

(Nota: el seed deja a P1 con `accelerometer_cable` y `hours_since_replace` 1500, ver `seedStock` en `src/server/seed.ts`; si cambian esos valores, ajusta el `1500` de la primera prueba de `runDue`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/schedules.test.ts`
Expected: FAIL (`Failed to resolve import "./schedules"`).

- [ ] **Step 3: Write minimal implementation** — crear `src/server/schedules.ts`:

```ts
// Compras programadas: al vencer crean una propuesta con el createProposal de siempre. Nunca aprueban ni pagan.
import type { RequestPartInput, RequestPartResult, Schedule, ScheduleInput } from '@/contracts';
import { monthlyRunAfter } from '@/domain/schedule';
import type { Store } from './db';

export interface SchedulesDeps {
  store: Store;
  createProposal(input: RequestPartInput): Promise<RequestPartResult>;
  now?: () => Date;
  newId?: () => string;
}

type Outcome = NonNullable<Schedule['last_result']>;
const REPEATS: readonly string[] = ['once', 'monthly'];

export function createSchedules(deps: SchedulesDeps) {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());

  function create(input: ScheduleInput): Schedule {
    const machine = store.getMachine(input.machine_id);
    if (!machine) throw new Error(`Máquina ${input.machine_id} no existe`);
    if (!store.getStock(machine.id, input.part_type)) throw new Error('La máquina no usa esa pieza');
    if (!REPEATS.includes(input.repeat)) throw new Error('Repetición inválida');
    const at = new Date(input.next_run);
    // Fecha inexistente (31 de febrero): el ISO de salida ya no coincide con el día pedido.
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== input.next_run.slice(0, 10)) throw new Error('Fecha inválida');
    const t = now();
    if (at.getTime() < Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) throw new Error('La fecha ya pasó');
    const schedule: Schedule = {
      id: newId(), machine_id: machine.id, part_type: input.part_type, next_run: at.toISOString(), anchor_day: at.getUTCDate(),
      repeat: input.repeat, active: true, created_at: t.toISOString(), last_run: null, last_result: null,
    };
    store.putSchedule(schedule);
    return schedule;
  }

  function cancel(id: string): Schedule {
    const current = store.getSchedule(id);
    if (!current) throw new Error(`Programación ${id} no existe`);
    const next = { ...current, active: false };
    store.putSchedule(next);
    return next;
  }

  async function fire(s: Schedule): Promise<Outcome> {
    const stock = store.getStock(s.machine_id, s.part_type);
    if (!stock) return { status: 'error', proposal_id: null, message: 'La máquina ya no usa esa pieza' };
    const open = store.findOpenProposal(s.machine_id, s.part_type);
    if (open) return { status: 'skipped', proposal_id: open.view.id, message: 'Ya había una solicitud abierta para esta pieza' };
    try {
      const r = await deps.createProposal({
        machine_id: s.machine_id, part_type: s.part_type, hours_since_replace: stock.hours_since_replace,
        photo_id: `plate_${s.machine_id.toLowerCase()}`, note: 'Compra programada',
      });
      if (r.proposal_id === null) return { status: 'error', proposal_id: null, message: r.reason };
      if (r.status === 'proposed') return { status: 'proposed', proposal_id: r.proposal_id, message: 'Propuesta lista para aprobar' };
      return { status: 'rejected', proposal_id: r.proposal_id, message: store.getProposal(r.proposal_id)?.view.reason ?? 'El gate rechazó la propuesta' };
    } catch (err) {
      return { status: 'error', proposal_id: null, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async function runDue(): Promise<Schedule[]> {
    const t = now();
    const ran: Schedule[] = [];
    for (const due of store.listSchedules().filter((s) => s.active && Date.parse(s.next_run) <= t.getTime())) {
      // Reservar antes de cotizar: una segunda ejecución concurrente ya no la ve vencida.
      const claimed = store.tx(() => {
        const current = store.getSchedule(due.id);
        if (!current || !current.active || Date.parse(current.next_run) > t.getTime()) return null;
        store.putSchedule(current.repeat === 'monthly'
          ? { ...current, next_run: monthlyRunAfter(current.next_run, current.anchor_day, t) }
          : { ...current, active: false });
        return current;
      });
      if (!claimed) continue;
      const result = await fire(claimed);
      const done: Schedule = { ...store.getSchedule(claimed.id)!, last_run: t.toISOString(), last_result: result };
      store.putSchedule(done);
      ran.push(done);
    }
    return ran;
  }

  return { list: () => store.listSchedules(), create, cancel, runDue };
}

export type Schedules = ReturnType<typeof createSchedules>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/schedules.test.ts`
Expected: PASS (todas). Si la prueba "concurrentes" falla, el problema es la reserva: `store.tx` debe envolver lectura y escritura juntas (como arriba).

- [ ] **Step 5: Commit**

```bash
git add src/server/schedules.ts src/server/schedules.test.ts
git commit -m "feat(server): scheduled purchases create proposals

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Conectar servidores, acciones y endpoint de cron

**Files:**
- Modify: `src/server/real-server.ts` (`RealServerDeps`, 4 métodos)
- Modify: `src/server/fake-server.ts` (estado `schedules`, 4 métodos, `resetDemo`)
- Modify: `src/app/actions.ts` (3 acciones, `PATHS`)
- Create: `src/app/api/cron/schedules/route.ts`
- Create: `src/app/api/cron/schedules/route.test.ts`
- Create: `src/server/schedules-flow.test.ts`

**Interfaces:**
- Consumes: `createSchedules` de `./schedules`; `monthlyRunAfter` de `@/domain/schedule`.
- Produces: `PartProofServer.listSchedules/createSchedule/cancelSchedule/runDueSchedules` en ambos servidores; Server Actions `createSchedule(input: { machine_id; part_type; date: 'YYYY-MM-DD'; repeat })`, `cancelSchedule(id)`, `runSchedules()` (todas devuelven `ActionResult`); `POST /api/cron/schedules` con `Authorization: Bearer $CRON_SECRET`.

- [ ] **Step 1: Write the failing tests**

1a. `src/app/api/cron/schedules/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => vi.unstubAllEnvs());
const call = (auth?: string) =>
  POST(new Request('http://x/api/cron/schedules', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

describe('POST /api/cron/schedules', () => {
  it('sin CRON_SECRET siempre responde 401, incluso con cabecera', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer ')).status).toBe(401);
  });
  it('rechaza un secreto incorrecto', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    expect((await call('Bearer otro')).status).toBe(401);
    expect((await call()).status).toBe(401);
  });
  it('con el secreto correcto ejecuta y responde cuántas corrió', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    const res = await call('Bearer s3cret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: 0 });
  });
});
```

1b. `src/server/schedules-flow.test.ts` (flujo real con gate y proveedor mock, sin red):

```ts
import { describe, expect, it } from 'vitest';
import { evaluateGateA, evaluateGateB } from '@/domain/gate';
import { CATALOG } from './catalog';
import { openStore } from './db';
import { createMockProvider } from './payments';
import { createRealServer } from './real-server';
import { FX_TO_MXN } from './seed';
import { createWorkflow } from './workflow';

function build() {
  const store = openStore(':memory:');
  store.seed();
  const workflow = createWorkflow({
    store, provider: createMockProvider(), providerMode: 'mock', catalog: CATALOG, fx: FX_TO_MXN, evaluateGateA, evaluateGateB,
    analyzePhoto: async () => ({ mode: 'replay', result: { nameplate_model: 'Original Prusa MK4S', hotend: null, visible_damage: ['none'], label_text: null, confidence: 0.95 } }),
  });
  return { store, server: createRealServer({ store, workflow, providerMode: 'mock', visionMode: 'replay', demo: true }) };
}

describe('programadas con el flujo real', () => {
  it('P1 vencida crea una propuesta que pasa el gate y queda pendiente de aprobación', async () => {
    const { server, store } = build();
    const today = new Date().toISOString().slice(0, 10);
    const created = await server.createSchedule({ machine_id: 'P1', part_type: 'accelerometer_cable', next_run: `${today}T00:00:00.000Z`, repeat: 'once' });
    const ran = await server.runDueSchedules();
    expect(ran).toHaveLength(1);
    expect(ran[0].last_result?.status).toBe('proposed');
    const proposal = store.getProposal(ran[0].last_result!.proposal_id!)!.view;
    expect(proposal.status).toBe('proposed');
    expect(created.id).toBe(ran[0].id);
    expect((await server.listSchedules())[0].active).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/cron src/server/schedules-flow.test.ts`
Expected: FAIL (no existe `route.ts`; `server.createSchedule is not a function`).

- [ ] **Step 3: Write minimal implementation**

3a. `src/server/real-server.ts`: agregar `import { createSchedules } from './schedules';`; en `RealServerDeps` agregar `now?: () => Date;`; justo después de `if (store.isEmpty()) store.seed();` agregar:

```ts
  const schedules = createSchedules({ store, createProposal: (input) => workflow.createProposal(input), now: deps.now });
```

y antes de `async recordEvent` agregar:

```ts
    async listSchedules() { return schedules.list(); },
    async createSchedule(input) { return schedules.create(input); },
    async cancelSchedule(id) { return schedules.cancel(id); },
    async runDueSchedules() { return schedules.runDue(); },
```

3b. `src/server/fake-server.ts`: agregar `Schedule` al import de tipos de `@/contracts` y `import { monthlyRunAfter } from '@/domain/schedule';`. Junto a `let ledger: LedgerRow[] = [];` agregar `let schedules: Schedule[] = [];`. En `resetDemo` agregar `schedules = [];`. Antes de `async recordEvent` agregar:

```ts
    async listSchedules() { return schedules; },
    async createSchedule(input) {
      const machine = machines.find((m) => m.id === input.machine_id);
      if (!machine) throw new Error(`Máquina ${input.machine_id} no existe`);
      if (!stock.some((s) => s.machine_id === machine.id && s.part_type === input.part_type)) throw new Error('La máquina no usa esa pieza');
      const at = new Date(input.next_run);
      if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== input.next_run.slice(0, 10)) throw new Error('Fecha inválida');
      const s: Schedule = {
        id: crypto.randomUUID(), machine_id: machine.id, part_type: input.part_type, next_run: at.toISOString(),
        anchor_day: at.getUTCDate(), repeat: input.repeat, active: true, created_at: now(), last_run: null, last_result: null,
      };
      schedules = [...schedules, s];
      return s;
    },
    async cancelSchedule(id) {
      const s = schedules.find((x) => x.id === id);
      if (!s) throw new Error(`Programación ${id} no existe`);
      const next = { ...s, active: false };
      schedules = schedules.map((x) => (x.id === id ? next : x));
      return next;
    },
    // Demo en memoria: reutiliza la propuesta de demo de esa pieza en lugar de cotizar.
    async runDueSchedules() {
      const t = new Date();
      const ran: Schedule[] = [];
      schedules = schedules.map((s) => {
        if (!s.active || Date.parse(s.next_run) > t.getTime()) return s;
        const p = proposals.find((x) => x.machine_id === s.machine_id && x.part_type === s.part_type);
        const done: Schedule = {
          ...s, last_run: t.toISOString(),
          active: s.repeat === 'monthly',
          next_run: s.repeat === 'monthly' ? monthlyRunAfter(s.next_run, s.anchor_day, t) : s.next_run,
          last_result: p
            ? { status: p.status === 'rejected' ? 'rejected' : 'proposed', proposal_id: p.id, message: p.reason ?? 'Propuesta de demo' }
            : { status: 'error', proposal_id: null, message: 'No hay una propuesta de demo para esta pieza' },
        };
        ran.push(done);
        return done;
      });
      return ran;
    },
```

3c. `src/app/actions.ts`: cambiar `const PATHS = ['/', '/proposals', '/ledger', '/mcp-log', '/watch'];` a incluir `'/schedules'` y `'/settings'`; agregar `type Schedule` al import de `@/contracts`; al final del archivo:

```ts
const ScheduleForm = z.object({
  machine_id: Id,
  part_type: z.enum(PART_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repeat: z.enum(['once', 'monthly']),
}).strict();

// La fecha llega como YYYY-MM-DD y se programa a medianoche UTC de ese día.
export async function createSchedule(input: z.input<typeof ScheduleForm>): Promise<ActionResult<Schedule>> {
  const v = ScheduleForm.parse(input);
  return run(() => server.createSchedule({ machine_id: v.machine_id, part_type: v.part_type, next_run: `${v.date}T00:00:00.000Z`, repeat: v.repeat }));
}

export async function cancelSchedule(id: string): Promise<ActionResult<Schedule>> {
  return run(() => server.cancelSchedule(Id.parse(id)));
}

export async function runSchedules(): Promise<ActionResult<Schedule[]>> {
  return run(() => server.runDueSchedules());
}
```

3d. `src/app/api/cron/schedules/route.ts`:

```ts
import { timingSafeEqual } from 'node:crypto';
import { server } from '@/server/api';

export const runtime = 'nodejs';

// Disparador para un cron externo. Sin CRON_SECRET definido responde siempre 401: nunca queda abierto.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  const ran = await server.runDueSchedules();
  return Response.json({ ran: ran.length });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` limpio y toda la suite verde (incluidas `route.test.ts` y `schedules-flow.test.ts`). Si `schedules-flow` falla porque `createMockProvider` busca fixtures, ejecuta desde la raíz del repo (usa `process.cwd()`).

- [ ] **Step 5: Commit**

```bash
git add src/server/real-server.ts src/server/fake-server.ts src/app/actions.ts src/app/api/cron src/server/schedules-flow.test.ts
git commit -m "feat(server): wire scheduled purchases, actions and cron endpoint

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Editor de excepciones por mes en Ajustes

> **Requiere #16 mergeado y `git rebase origin/main`** (usa `SettingsForm.tsx` y `src/app/settings/page.tsx`).

**Files:**
- Modify: `src/components/SettingsForm.tsx` (reescribir)
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `saveSettings(input: SettingsInput)` de `@/app/actions`; `Company.budget_overrides`.

- [ ] **Step 1: Reescribir `src/components/SettingsForm.tsx`** (no hay prueba de componente en el repo; la validación real está en `validateSettings`, ya probada):

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions';

interface Row { month: string; amount: string }

export default function SettingsForm({ budget, cap, currency, overrides }: { budget: number; cap: number; currency: string; overrides: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<Row[]>(Object.entries(overrides).sort().map(([month, amount]) => ({ month, amount: String(amount) })));
  const router = useRouter();

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const monthly_budget = Number(f.get('monthly_budget'));
    const purchase_cap = Number(f.get('purchase_cap'));
    const budget_overrides: Record<string, number> = {};
    for (const row of rows) {
      if (!row.month || row.amount === '') { setMsg('Completa el mes y el monto de cada excepción, o quítala.'); return; }
      if (row.month in budget_overrides) { setMsg(`El mes ${row.month} está repetido.`); return; }
      budget_overrides[row.month] = Number(row.amount);
    }
    start(async () => {
      try {
        const r = await saveSettings({ monthly_budget, purchase_cap, budget_overrides });
        setMsg(r.ok ? 'Límites guardados.' : r.error);
        router.refresh();
      } catch { setMsg('No se pudo guardar. Revisa los montos e intenta de nuevo.'); }
    });
  }

  return <form className="capture-form" onSubmit={submit}>
    <label htmlFor="monthly_budget">Presupuesto mensual base ({currency})<input id="monthly_budget" name="monthly_budget" type="number" min={0} max={10000000} step="0.01" defaultValue={budget} required disabled={pending} /></label>
    <label htmlFor="purchase_cap">Tope por compra ({currency})<input id="purchase_cap" name="purchase_cap" type="number" min={0} max={10000000} step="0.01" defaultValue={cap} required disabled={pending} /></label>
    <fieldset className="override-list"><legend>Excepciones por mes</legend>
      {rows.length === 0 && <p className="muted small">Todos los meses usan el presupuesto base.</p>}
      {rows.map((row, i) => <div className="inline" key={i}>
        <input aria-label="Mes" type="month" value={row.month} onChange={(e) => update(i, { month: e.target.value })} disabled={pending} />
        <input aria-label={`Presupuesto del mes (${currency})`} type="number" min={0} max={10000000} step="0.01" value={row.amount} onChange={(e) => update(i, { amount: e.target.value })} disabled={pending} />
        <button type="button" className="secondary" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} disabled={pending}>Quitar</button>
      </div>)}
      <button type="button" className="secondary" onClick={() => setRows((r) => [...r, { month: '', amount: '' }])} disabled={pending}>Agregar mes</button>
    </fieldset>
    <p className="muted small">Un mes sin excepción usa el presupuesto base. El tope por compra no puede superar el presupuesto de ningún mes. Aplica a las próximas verificaciones.</p>
    <button className="primary" type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar límites'}</button>
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </form>;
}
```

- [ ] **Step 2: En `src/app/settings/page.tsx`** pasar las excepciones y mostrar el presupuesto efectivo del mes:

Reemplazar `<SettingsForm budget={c.monthly_budget} cap={c.purchase_cap} currency={c.currency} />` por
`<SettingsForm budget={c.monthly_budget} cap={c.purchase_cap} currency={c.currency} overrides={c.budget_overrides ?? {}} />`.

- [ ] **Step 3: Agregar estilo** al final de `src/app/globals.css`:

```css
.override-list{border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:9px}
.override-list legend{font-size:12px;color:var(--muted);padding:0 6px}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: limpio. Manual: `npm run dev`, abrir `/settings`, agregar un mes con monto menor que el tope → guardar muestra el error "El tope por compra supera el presupuesto de YYYY-MM"; con monto válido → "Límites guardados." y al recargar la excepción sigue ahí.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsForm.tsx src/app/settings/page.tsx src/app/globals.css
git commit -m "feat(ui): per-month budget exceptions in settings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pantalla de compras programadas

> **Requiere #16 mergeado y rebase** (usa `Ui.tsx`, `format.ts`, `lib/nav.ts`, `layout.tsx`).

**Files:**
- Modify: `src/components/format.ts` (añadir `dateOnly`), `src/components/format.test.ts`
- Modify: `src/lib/nav.ts`
- Create: `src/components/ScheduleForm.tsx`
- Create: `src/components/ScheduleControls.tsx` (cancelar y ejecutar ahora)
- Create: `src/components/ScheduleRunner.tsx` (ejecución una vez por sesión)
- Create: `src/app/schedules/page.tsx`
- Modify: `src/app/layout.tsx` (montar `ScheduleRunner`)

**Interfaces:**
- Consumes: `createSchedule`, `cancelSchedule`, `runSchedules` de `@/app/actions`; `server.listSchedules/listMachines/listStock/listSites`.

- [ ] **Step 1: Write the failing test** — agregar a `src/components/format.test.ts` dentro del `describe('format')`:

```ts
  it('dateOnly muestra el día UTC sin correrlo por zona horaria', () => {
    expect(dateOnly('2026-10-31T00:00:00.000Z')).toContain('31');
    expect(dateOnly('2026-10-31T00:00:00.000Z')).toContain('2026');
  });
```

y agregar `dateOnly` al `import { ... } from './format';`.

Run: `npx vitest run src/components/format.test.ts` — Expected: FAIL (`dateOnly` no existe).

- [ ] **Step 2: Implementar `dateOnly`** — en `src/components/format.ts` agregar:

```ts
// Las programaciones guardan medianoche UTC; mostrarlas en zona de México correría el día.
export const dateOnly = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
```

Run de nuevo: PASS.

- [ ] **Step 3: Navegación** — en `src/lib/nav.ts` agregar después de Propuestas: `{ href: '/schedules', label: 'Programadas' },`.

- [ ] **Step 4: `src/components/ScheduleForm.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PartType } from '@/contracts';
import { createSchedule } from '@/app/actions';
import { PART_LABELS } from './format';

export interface Option { machine_id: string; label: string; parts: PartType[] }

export default function ScheduleForm({ options, today }: { options: Option[]; today: string }) {
  const [machine, setMachine] = useState(options[0]?.machine_id ?? '');
  const parts = options.find((o) => o.machine_id === machine)?.parts ?? [];
  const [part, setPart] = useState<PartType>(parts[0] ?? 'nozzle');
  const [date, setDate] = useState(today);
  const [repeat, setRepeat] = useState(false);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function changeMachine(id: string) {
    setMachine(id);
    const next = options.find((o) => o.machine_id === id)?.parts[0];
    if (next) setPart(next);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const r = await createSchedule({ machine_id: machine, part_type: part, date, repeat: repeat ? 'monthly' : 'once' });
        setMsg(r.ok ? 'Compra programada.' : r.error);
        if (r.ok) router.refresh();
      } catch { setMsg('No se pudo programar. Revisa los datos e intenta de nuevo.'); }
    });
  }
  return <form className="capture-form" onSubmit={submit}>
    <label htmlFor="sch-machine">Máquina<select id="sch-machine" value={machine} onChange={(e) => changeMachine(e.target.value)} disabled={pending}>{options.map((o) => <option key={o.machine_id} value={o.machine_id}>{o.label}</option>)}</select></label>
    <label htmlFor="sch-part">Refacción<select id="sch-part" value={part} onChange={(e) => setPart(e.target.value as PartType)} disabled={pending}>{parts.map((p) => <option key={p} value={p}>{PART_LABELS[p]}</option>)}</select></label>
    <label htmlFor="sch-date">Fecha<input id="sch-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required disabled={pending} /></label>
    <label className="inline" htmlFor="sch-repeat"><input id="sch-repeat" type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} disabled={pending} /> Repetir cada mes</label>
    <p className="muted small">Llegada la fecha se crea una propuesta; una persona debe aprobarla en Reap. Nada se paga solo.</p>
    <button className="primary" type="submit" disabled={pending || !machine}>{pending ? 'Programando…' : 'Programar'}</button>
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </form>;
}
```

- [ ] **Step 5: `src/components/ScheduleControls.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSchedule, runSchedules } from '@/app/actions';

export function CancelSchedule({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  return <span><button className="secondary" disabled={pending} onClick={() => start(async () => { const r = await cancelSchedule(id); if (!r.ok) setMsg(r.error); router.refresh(); })}>Cancelar</button>{msg && <small role="status" className="notice-text">{msg}</small>}</span>;
}

export function RunNow() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  return <div><button className="secondary" disabled={pending} onClick={() => start(async () => {
    const r = await runSchedules();
    setMsg(r.ok ? (r.data.length ? `Se revisaron ${r.data.length} programadas.` : 'No había programadas vencidas.') : r.error);
    router.refresh();
  })}>{pending ? 'Ejecutando…' : 'Ejecutar programadas ahora'}</button>{msg && <p role="status" className="muted small">{msg}</p>}</div>;
}
```

- [ ] **Step 6: `src/components/ScheduleRunner.tsx`** (una vez por sesión de navegador, silencioso):

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { runSchedules } from '@/app/actions';

const KEY = 'partproof:schedules-ran';

export default function ScheduleRunner() {
  const router = useRouter();
  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch { /* sin sessionStorage: se ejecuta una vez por carga */ }
    runSchedules().then((r) => { if (r.ok && r.data.length) router.refresh(); }, () => {});
  }, [router]);
  return null;
}
```

- [ ] **Step 7: `src/app/schedules/page.tsx`**

```tsx
import Link from 'next/link';
import { server } from '@/server/api';
import { CancelSchedule, RunNow } from '@/components/ScheduleControls';
import ScheduleForm from '@/components/ScheduleForm';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateOnly } from '@/components/format';

export const metadata = { title: 'Programadas' };
const TONE = { proposed: 'good', rejected: 'bad', error: 'bad', skipped: 'neutral' } as const;
const OUTCOME = { proposed: 'Propuesta creada', rejected: 'Rechazada por el gate', skipped: 'Omitida', error: 'Error' } as const;

export default async function SchedulesPage() {
  const [schedules, machines, stock] = await Promise.all([server.listSchedules(), server.listMachines(), server.listStock()]);
  const options = machines.map((m) => ({ machine_id: m.id, label: `${m.id} · ${m.nameplate_model}`, parts: stock.filter((s) => s.machine_id === m.id).map((s) => s.part_type) }));
  return <>
    <PageHeader title="Programadas" description="Reposiciones que se solicitan solas en una fecha. Crean una propuesta; una persona la aprueba." />
    <div className="grid cols-2">
      <section className="panel"><h2>Programaciones</h2>
        {!schedules.length ? <EmptyState title="Nada programado">Programa una refacción para que su solicitud se abra en la fecha elegida.</EmptyState> :
          <div className="proposal-list">{schedules.map((s) => <div className="proposal-row" key={s.id} style={{ alignItems: 'flex-start' }}>
            <div><strong>{s.machine_id} / {PART_LABELS[s.part_type]}</strong>
              <small>{s.active ? `Próxima: ${dateOnly(s.next_run)}` : 'Inactiva'} · {s.repeat === 'monthly' ? 'cada mes' : 'una vez'}</small>
              {s.last_result && <small>Última ejecución: <Badge tone={TONE[s.last_result.status]}>{OUTCOME[s.last_result.status]}</Badge> {s.last_result.message}{s.last_result.proposal_id && <> · <Link className="link" href={`/proposals/${s.last_result.proposal_id}`}>ver propuesta</Link></>}</small>}</div>
            {s.active && <CancelSchedule id={s.id} />}</div>)}</div>}
        <div style={{ marginTop: 14 }}><RunNow /></div></section>
      <section className="panel"><h2>Nueva programación</h2><ScheduleForm options={options} today={new Date().toISOString().slice(0, 10)} /></section>
    </div></>;
}
```

- [ ] **Step 8: Montar el runner** — en `src/app/layout.tsx` agregar `import ScheduleRunner from '@/components/ScheduleRunner';` y colocar `<ScheduleRunner />` justo antes de `<Banner />`.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: todo verde y `/schedules` aparece en las rutas del build.

- [ ] **Step 10: Commit**

```bash
git add src/components src/lib/nav.ts src/app/schedules src/app/layout.tsx
git commit -m "feat(ui): scheduled purchases screen

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Verificación de punta a punta y PR

**Files:** ninguno nuevo (documentación de la variable en `README.md` si existe una sección de variables de entorno).

- [ ] **Step 1: Suite completa**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: todo verde.

- [ ] **Step 2: Prueba manual con backend real**

Run: `BACKEND=real DEMO_MODE=1 CRON_SECRET=demo npm run dev` y, en otra terminal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/cron/schedules                          # 401
curl -s -X POST -H 'Authorization: Bearer demo' localhost:3000/api/cron/schedules                          # {"ran":0}
```

En el navegador: `/schedules` → programar P1 / Cable de acelerómetro para hoy → "Ejecutar programadas ahora" → la fila muestra "Propuesta creada" con enlace; la propuesta aparece en `/proposals` pendiente de aprobar. Programar P2 / Tubo PTFE para hoy → "Rechazada por el gate" con la razón de compatibilidad.

- [ ] **Step 3: Documentar** `CRON_SECRET` en `README.md` si existe lista de variables (`grep -n "DEMO_MODE" README.md`); si no existe esa sección, omitir.

- [ ] **Step 4: Push y PR**

```bash
git push -u origin feat/schedules-budgets
gh pr create --base main --head feat/schedules-budgets --title "feat: per-month budgets and scheduled purchases" --body "Spec: docs/superpowers/specs/2026-10-09-schedules-and-monthly-budgets-design.md"
```

Completa el cuerpo con: qué cambia, que nada se paga solo, que `CRON_SECRET` es obligatorio para el endpoint, y lo que sigue sin probar contra Reap real.

---

## Self-review

- **Cobertura del spec:** presupuesto base + excepciones (T1, T2, T7); validación de `saveSettings` (T1, T2); `Schedule`, tabla y estados (T3, T4); `runDueSchedules` con reserva previa, mensual recortado, salto de meses, propuesta abierta (T3, T5); foto = placa registrada (T5); disparadores app + botón + cron con secreto (T6, T8); UI `/schedules` y `/settings` (T7, T8); pruebas listadas en el spec (T1, T3, T5, T6). Sin huecos.
- **Placeholders:** ninguno; cada paso de código trae el código.
- **Consistencia de tipos:** `Schedule`, `ScheduleInput`, `SettingsInput`, `monthlyRunAfter`, `createSchedules(...).{list,create,cancel,runDue}`, acciones `createSchedule/cancelSchedule/runSchedules` y métodos `listSchedules/createSchedule/cancelSchedule/runDueSchedules` usan los mismos nombres en todas las tareas.
- **Orden:** T3 deja `tsc` en rojo a propósito hasta T6 (el contrato gana métodos que los servidores implementan ahí); T1–T2 y T4–T6 no dependen de #16; T7–T8 sí.
