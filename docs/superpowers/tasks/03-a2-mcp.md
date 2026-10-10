# A2: MCP, pipeline y cliente Klipper

**Máquina:** M1 · **Rama:** `feat/a2-mcp` · **Empieza en:** C0 · **Pruebas reales desde:** C1 · **Desbloquea:** C2

## Misión

Que una impresora pueda pedir una pieza por MCP con evidencia, y que ni un token ajeno, ni parámetros extra, ni una nota maliciosa cambien el resultado.

## Rutas que posee

`src/lib/pipeline.ts`, `src/lib/mcp-tool.ts`, `src/app/api/mcp/route.ts`, `tools/klipper-agent/client.ts`, `tools/klipper-agent/cli.ts`, `tests/mcp.test.ts`, `tests/pipeline.test.ts`.

## Tareas

Código y pruebas exactas: Plan, "Workstream A2".

- [ ] **A2.1 Handler `request_part`.** zod `.strict()`, enum de `part_type`, token por máquina (hash), nota limitada a 500 caracteres. Mockear `pipeline` con `vi.mock` hasta que A1 esté en `main`. 5 pruebas.
  - Debe cubrir: token de P2 pidiendo para P1 falla; `price`, `variant_id` y `merchant` se rechazan; la nota pasa como dato y no agrega claves.
- [ ] **A2.2 Pipeline.** `createProposalFromRequest`: evento, candidatos del catálogo, cotización de 10 min, gate, propuesta `proposed` o `rejected`, `verification` con descartados. Devuelve la abierta si ya existe una para la misma máquina y pieza. 6 pruebas (correr tras C1).
- [ ] **A2.3 Ruta y cliente.** `POST /api/mcp` con el transporte HTTP del SDK y `requestPartViaMcp`.
  - Antes de codificar: `ls node_modules/@modelcontextprotocol/sdk/dist/esm/server/` y `client/` para confirmar los nombres reales del transporte; ajustar los imports del plan si difieren. La lógica ya probada queda en `handleRequestPart`; la ruta es un adaptador delgado.
  - Verificación manual: levantar `npm run dev`, insertar una foto y ejecutar el CLI con `demo-token-p1`. Esperado: propuesta con variante `67588566679782`. Con `demo-token-p2` para P1: `unauthorized`.
- [ ] Push y aviso: "A2 listo para merge".

## Consume

De A1: `evaluateGate`, `buildGateInput`. De Task 0: `findByPart`, `getMachine`, `sha256`, `PART_TYPES`.

## Produce

```ts
class McpAuthError extends Error {}
handleRequestPart(db, token, rawArgs, now?): Promise<ProposalView>
createProposalFromRequest(db, { machineId, partType, hours, photoId, note? }, now?): ProposalView
requestPartViaMcp({ baseUrl, token, machineId, partType, hours, photoId, note? }): Promise<unknown>
POST /api/mcp   (Authorization: Bearer <token>)
```

A5 y A6 usan `createProposalFromRequest` y `requestPartViaMcp`.

## Terminado cuando

- 11 pruebas verdes (5 + 6) y `tsc` limpio.
- La verificación manual de A2.3 coincide con lo esperado.
- La nota maliciosa queda solo en el evento y no abre compra.

## Notas

(Nombres reales del transporte del SDK, desvíos.)
