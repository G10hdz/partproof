# A5 sobre el backend que ya existe

Complementa `06-a5-ui.md`. El backend (A1 a A4 y la integración) ya está hecho en la rama `feat/integration` (PR #8) y probado contra el sandbox de Reap. La UI no escribe consultas SQL ni lógica de pago: lee de `server` y muta con las Server Actions.

## Preparar el worktree

```bash
git fetch origin
git worktree add ../partproof-ui -b feat/a5-ui origin/feat/integration
cd ../partproof-ui && npm ci
npm run dev                      # servidor en memoria, sin red ni llaves
BACKEND=real DEMO_MODE=1 npm run dev   # SQLite, gate, visión en replay y pago mock con montos reales
```

## Lo que pide `06-a5-ui.md` y qué usar en su lugar

| En la tarea A5 | Usar | Dónde |
|---|---|---|
| `getDb`, `getItem`, `getCompany`, `fleetRows` | `server.getCompany()`, `listSites()`, `listMachines()`, `listStock()` | `import { server } from '@/server/api'` |
| `proposalById`, `recentProposals` | `server.getProposal(id)`, `server.listProposals()` | idem |
| `mcpLog` | `server.listEvents()` (la nota viene en `payload.note`, mostrar como texto) | idem |
| `ledgerByMachine`, `monthTotalMxn` | `server.getLedger()`: `rows`, `cost_per_hour`, `monthly_total`, `monthly_budget` | idem |
| `getProviderMode`, `getVisionMode` | `server.getModes()`: `{ provider, vision, demo }` | idem |
| `approveAndPay`, `approveAction` | `approveProposal(id)` | `src/app/actions.ts` |
| `rejectAction` | `rejectProposal(id)` | idem |
| (nuevo) consultar el pago | `refreshProposal(id)` cada 2 s mientras `status === 'approved'` | idem |
| (nuevo) cotizar de nuevo | `requoteProposal(id)` cuando `status === 'failed'` | idem |
| botón "Avanzar horas" | `advanceHours(machineId, horas)` | idem |
| reset del demo | `resetDemo()` | idem |
| `/api/vision/analyze`, `CaptureForm` | No hace falta: la máquina pide por MCP con la foto de su placa. Mostrar la foto con `<img src={`/api/photos/${p.photo_id}`}>` | `src/app/api/photos/[id]` |
| `/watch/[id]` | Sale. La aprobación obligatoria es la página de Reap: mostrar `checkout.approvalUrl` como QR y como enlace | — |
| `src/lib/queries.ts`, `tests/queries.test.ts` | No hacen falta; los tipos están en `src/contracts.ts` | — |

Todas las acciones devuelven `{ ok: true, data } | { ok: false, error }`. Mostrar `error` tal cual.

## Estados que la UI tiene que cubrir

| `ProposalView.status` | Checkout | Mostrar |
|---|---|---|
| `proposed` | — | Checklist del gate en verde, desglose del quote, botón Aprobar |
| `rejected` | — | Checklist con la regla que falló y su razón; Aprobar deshabilitado |
| `approved` | `REQUIRES_ACTION` | QR de `checkout.approvalUrl` y su vencimiento: "Aprueba en Reap desde tu teléfono" |
| `approved` | `PROCESSING` | "Orden colocada, en confirmación" con `checkout.orderId` |
| `paid` | `COMPLETED` | `orderId`, monto final, enlace al libro |
| `failed` | `FAILED` o `EXPIRED` | Razón y botón "Cotizar de nuevo" |

- Checklist en dos grupos: fase A (sin red: evidencia, compatibilidad, variante, envío) y fase B (sobre el quote de Reap: tope, presupuesto, vigencia). Cada `GateCheck` trae `phase`.
- Desglose del quote: `quote.itemsSubtotal`, `quote.shipping`, `quote.tax`, `quote.finalAmount` y `quote_amount_company` en MXN.
- Dos plantas: `site_id` es `gdl` (Guadalajara) o `tor` (Toronto). Mostrar la planta en la flota y en la propuesta.
- Banner: `REAP SANDBOX` o `MOCK` según `getModes().provider`; `EN VIVO` o `REPETICIÓN` según `vision`; telemetría `SIMULADA`.

## Escenas del demo (datos semilla)

| Máquina | Planta | Pieza | Resultado esperado |
|---|---|---|---|
| P1 MK4S | Toronto | Cable acelerómetro | Pasa; 32.34 CAD (420.42 MXN); se aprueba y llega al libro |
| P2 MK3S | Toronto | Tubo PTFE | Rechazo fase A: "Esta pieza solo es compatible con MK3S+, MMU2S; la placa dice MK3S" |
| P3 MK3S+ | Guadalajara | Tubo PTFE | Rechazo de Reap: no envía a MX (ITEMS_UNSHIPPABLE) |
| P4 K1 | Toronto | Boquilla | Rechazo fase B: 102 CAD con envío desde Australia (1,326 MXN) sobre el tope de 1,000 |

Con `BACKEND=real DEMO_MODE=1`, "Avanzar horas" en una máquina dispara su solicitud por MCP.

## No tocar

`src/server/*`, `src/domain/*`, `src/contracts.ts`, `src/app/api/*`. Si la UI necesita un dato que no existe, pedirlo al backend.
