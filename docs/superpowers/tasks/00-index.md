# PartProof: tareas por agente

Plan completo (con todo el código y las pruebas): `docs/superpowers/plans/2026-10-09-partproof-implementation.md`.
Specs: `docs/superpowers/specs/2026-10-09-wear-triggered-parts-agent-design.md` y `2026-10-09-demo-design.md`.

Cada archivo de esta carpeta es autocontenido para un agente: misión, rutas que posee, tareas con casillas, contratos que consume y produce, criterio de terminado. El código exacto de cada paso vive en el plan, bajo el id de tarea indicado (por ejemplo "Plan: A1.1").

## Agentes y máquinas

| Archivo | Agente | Máquina | Rama | Depende de |
|---|---|---|---|---|
| `01-task0-foundation.md` | A1 (dueño) | M1 | `feat/a1-core` | nada, bloquea a todos |
| `02-a1-core.md` | A1 | M1 | `feat/a1-core` | Task 0 |
| `03-a2-mcp.md` | A2 | M1 | `feat/a2-mcp` | Task 0; A1 para pruebas reales |
| `04-a3-payments.md` | A3 | M1 | `feat/a3-payments` | Task 0; A1 y A2.2 para pruebas de approve |
| `05-a4-vision.md` | A4 | M2 | `feat/a4-vision` | Task 0 |
| `06-a5-ui.md` | A5 | M2 | `feat/a5-ui` | Task 0; A2, A3, A4 para la ruta feliz |
| `07-a6-demo.md` | A6 | M2 | `feat/a6-demo` | Task 0; A1, A2, A3 para integración |

## Reglas comunes (todos los agentes)

1. No empezar hasta que el checkpoint C0 (Task 0 en `main`) esté anunciado.
2. Editar solo las rutas de tu archivo. Archivos congelados tras Task 0: `src/lib/types.ts`, `schema.ts`, `db.ts`, `rows.ts`, `catalog.ts`, `src/data/*` y las firmas de los stubs.
3. Necesitas cambiar un contrato: pídelo al dueño de A1 y espera un commit `contract: ...` en `main`; luego rebase.
4. Antes de cada push: `npx vitest run && npx tsc --noEmit`. Solo se empuja en verde.
5. Commits convencionales, uno por tarea. Terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
6. Si algo del plan choca con la realidad (API del SDK, tipos), arregla en tu rama y deja una nota en tu sección "Notas" de este archivo; no cambies el plan de otro.
7. Cada tarea termina con su prueba en verde. Sin prueba verde no se marca la casilla.

## Preparar cada máquina

```bash
git remote -v                      # debe existir un remoto compartido; si no, crearlo antes de empezar
git fetch origin
git worktree add ../partproof-<agente> -b feat/<rama> origin/main    # una por agente
cd ../partproof-<agente> && npm install
```

M1 guarda la llave de Reap en `.env.local`. Antes del ensayo final se copia a M2 (la demo corre en M2).

## Estado actual

Task 0 implementado y verificado en `bowfin`: semilla y catálogo (2 pruebas), prueba del launcher, typecheck y build en verde. Pendiente integrar en `main` y anunciar C0; no iniciar A1–A6 todavía. Detalles en `01-task0-foundation.md`.

## Checkpoints y merge

| Checkpoint | Condición | Quién lo anuncia |
|---|---|---|
| C0 | Task 0 en `main`; todos rebasados y verdes con stubs | A1 |
| C1 | A1, A3 (Mock) y A4 en `main` | A6 |
| C2 | A2 en `main`; una solicitud por MCP crea una propuesta | A6 |
| C3 | A5 en `main`; ruta feliz a mano en el navegador | A6 |
| C4 | Integración verde; ensayo en M2 igual al runbook | A6 |
| C5 | Llega la llave y documentación de Reap; A3.4 en `main`; ensayo repetido con `PAYMENT_PROVIDER=reap` | A3 |

Orden de merge (lo hace A6, con la suite completa después de cada uno): Task 0, A1, A3, A4, A2, A5, A6.

## Mensajes entre agentes

Formato corto en el canal que usen: `[A2 -> A1] necesito: <cambio de contrato>, motivo: <una línea>`. Quien recibe responde con el hash del commit en `main` o con "no, usa X".
