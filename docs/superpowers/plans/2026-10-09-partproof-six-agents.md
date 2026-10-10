# PartProof — Implementation Plan: seis agentes, dos máquinas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la demo de una granja de impresión con petición MCP, siete reglas, aprobación humana y libro, repartida entre tres agentes en Mac y tres en Pop.

**Architecture:** Una app Next.js local, SQLite y módulos de servidor. Cada agente trabaja en una rama y worktree propios; solo el integrador combina cambios. Las dos máquinas intercambian commits, nunca bases de datos, secretos ni node_modules.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, better-sqlite3, zod, Vitest, SDK oficial MCP, SDK Anthropic.

**Spec:** [Producto](../specs/2026-10-09-wear-triggered-parts-agent-design.md), [Demo](../specs/2026-10-09-demo-design.md).

## Global Constraints

- “No es una SPA ni usa Vite. Las páginas se renderizan en servidor.”
- “Las llaves de Claude y Reap viven solo en el servidor.”
- “El LLM sugiere, el código decide.”
- “Sin parámetros de precio, merchant o variante”.
- Banner permanente SANDBOX; MOCK y REPETICIÓN visibles cuando corresponda.
- Solo Forja3D MX; drones, detección de desgaste y hardware wearable fuera del trabajo.
- Monedas CAD/AUD, envío y tasas del spec son fixtures de demo pendientes de confirmación, no datos verificados en vivo.
- No adaptar Reap con endpoints ni formatos de llave inventados. Sin documentación y llave confirmadas se queda MOCK; no cumple el punto 1 del hackathon.
- Dinero: convertir a unidades menores con redondeo explícito al comparar y registrar. No cambiar los campos públicos del spec; tolerar cero, rechazar negativos, NaN e infinitos.
- `src/contracts.ts` es la frontera común. Solo el integrador acepta cambios coordinados; los seis agentes lo consumen.
- Todos los endpoints y módulos SQLite/MCP/visión/pagos usan runtime Node. Demo se ejecuta con `next start` y disco persistente.
- Cada agente es dueño de sus pruebas junto al módulo. Solo agente 1 modifica manifiesto, lockfile y configuración de tests.

## Shell y resolución de ambigüedades

La base contiene navegación para Flota, Propuestas, Libro, Ajustes, Registro MCP y reloj. Las pantallas pendientes se identifican como shell; no simulan compras ni gate exitoso.

Se agregan estas decisiones de integración para hacer ejecutables ambos specs:

1. `note` es un campo opcional limitado a 1000 caracteres, guardado solo en el evento; ninguna capa de gate, visión o pago lo recibe. Precio, merchant, variante, cantidad y campos desconocidos se rechazan.
2. Si falta modelo o confianza < 0.7, `request_part` devuelve `needs_confirmation` sin propuesta. No se inventa id. Un modelo distinto con confianza suficiente crea rechazo por evidencia.
3. Compatibilidad se normaliza mediante alias explícitos (`Original Prusa MK3S` → `MK3S`), nunca comparación por prefijo: MK3S y MK3S+ son distintos.
4. La boquilla FlowTech compara hotend; su rechazo principal debe ser envío a MX.
5. El avance de horas descuenta stock exactamente una vez por cambio y reinicia horas desde cambio con el resto. Con stock cero registra necesidad de mantenimiento sin generar stock negativo.
6. El MCP recibe solicitudes, no autoriza pagos. Aprobación requiere sesión humana del operador; token de máquina no sirve para acciones UI. Demo local con mismo origen y bind a loopback; exposición externa necesita autenticación del operador.
7. Mantener un registro único por propuesta e idempotencia de proveedor; un timeout ambiguo no se convierte en una compra nueva. Confirmar el resultado antes de marcar `paid`, aumentar stock y escribir libro en una transacción.
8. No usar fotos inventadas como si fueran evidencia real. Sin fotos preparadas, mostrar “falta foto”; el replay requiere hash exacto de archivos conocidos.

## Reparto y propiedad

| Agente | Máquina | Entregable | Archivos propios |
|---|---|---|---|
| 1 | Mac | Datos, integración, configuración | `src/server/db.ts`, `schema.sql`, `seed.ts`, `queries.ts`, `workflow.ts`, `actions.ts`, `auth.ts`, `catalog.json`, `fx.ts`, `package.json`, lockfile, configuración tests, `src/server/*.test.ts` de sus módulos |
| 2 | Mac | Política, matcher, gate puro | `src/domain/policy.ts`, `matcher.ts`, `gate.ts` y sus pruebas |
| 3 | Mac | UI de las seis pantallas | `src/app/layout.tsx`, `globals.css`, páginas y `src/components/` |
| 4 | Pop | MCP + simulación Klipper | `src/server/mcp.ts`, `src/server/mcp.test.ts`, `src/app/api/mcp/route.ts`, `src/app/api/demo/`, `tools/klipper-agent.ts` y pruebas |
| 5 | Pop | Visión, fotos, repetición | `src/server/vision.ts`, `vision.test.ts`, `photos.ts`, `photos.test.ts`, `src/app/api/photos/route.ts`, `demo/photos/`, `demo/vision-replay.json` |
| 6 | Pop | Providers de pago | `src/server/payments.ts`, `payments.test.ts`, `docs/reap-integration.md` |

El agente 1 es el integrador; no es un séptimo agente. Las rutas `/api/demo/*` son propiedad del 4; las Server Actions son propiedad del 1; la UI solo las consume. Ningún agente modifica specs ni `scripts/agents.sh`.

## Interfaces congeladas

Tipos compartidos: `src/contracts.ts`. Exportaciones que debe producir cada tarea:

```ts
// 1 — todos server-only; identidad de operador se verifica dentro de acciones.
listMachines(): Promise<Machine[]>;
listStock(): Promise<Stock[]>;
getCompany(): Promise<Company>;
listProposals(): Promise<ProposalView[]>;
getProposal(id: string): Promise<ProposalView | null>;
getLedger(): Promise<LedgerView>;
listEvents(): Promise<EventView[]>;
createProposal(input: RequestPartInput): Promise<RequestPartResult>;
approveProposal(id: string): Promise<void>;
rejectProposal(id: string): Promise<void>;
advanceHours(machineId: string, hours: number): Promise<void>;
saveSettings(input: { country: string; monthly_budget: number; purchase_cap: number }): Promise<void>;
resetDemo(): Promise<void>;
authenticateMachine(token: string, machineId: string): Promise<boolean>;
recordMcpRejection(machineId: string | null, reason: string): Promise<void>;
// 2 — síncronas, puras.
shouldRequest(stock: Pick<Stock, 'qty' | 'min_qty'>): boolean;
matchProducts(part: PartType, catalog: Product[]): Product[];
evaluateGate(input: GateInput): GateResult;
// 4 — cliente MCP usado después del avance, no llama createProposal directamente.
notifyMachine(machineId: string): Promise<RequestPartResult>;
// 5 — resuelve el photo_id local y nunca descarga una URL arbitraria.
analyzePhoto(photoId: string): Promise<{ result: VisionResult; mode: VisionMode }>;
// 6 — factura de catálogo del servidor; nunca toma merchant/precio del cliente.
getPaymentProvider(): { provider: PaymentProvider; mode: ProviderMode };
```

El agente 1 define en `queries.ts` estos DTO para UI, y los reexporta como tipos:

```ts
type ProposalView = {
  id: string; machine_id: string; part_type: PartType; status: ProposalStatus;
  product: Product | null; quote: Quote | null; verification: GateResult;
  reason: string | null; hours_since_replace: number; photo_id: string;
};
type LedgerView = {
  rows: { proposal_id: string; machine_id: string; provider_ref: string;
    provider: ProviderMode; amount: number; currency: string;
    amount_company: number; created_at: string }[];
  monthly_total: number; monthly_budget: number; currency: string;
  cost_per_hour: { machine_id: string; amount: number | null }[];
};
type EventView = {
  id: string; machine_id: string | null; source: 'klipper' | 'photo';
  payload: unknown; created_at: string;
};
```

Guardar modo de proveedor e importe convertido en `purchase` además del esquema del spec: necesario para que el libro no mezcle AUD/CAD/MXN ni oculte MOCK. Costo/hora usa horas_total; cero horas devuelve null.

## Secuencia entre máquinas

**Base B0:** shell + contratos + fixtures iniciales revisados. Agente 1 agrega dependencias requeridas de una vez y fija versiones instalables; no asumir que el modelo Anthropic del spec está disponible. Tras B0 arrancan los seis agentes con la misma revisión.

**Ola 1:** 1 construye SQLite/queries; 2 gate; 3 UI contra los DTO; 4 validación/auth de MCP con dependencias inyectadas en tests; 5 visión con fixtures; 6 MockProvider. Nadie necesita stubs que aprueben compras.

**Checkpoint C1:** integrador recoge 2, 5 y 6; conecta workflow y acciones. Publica DB/queries/workflow/actions/auth estables. Agentes 3 y 4 incorporan ese commit antes de validar flujos completos.

**Ola 2:** 3 conecta UI real; 4 prueba SDK MCP y agente Klipper con servidor real; 6 integra Reap únicamente si se resuelven los bloqueos. Integrador recoge 3 y 4, verifica demo y registra estado de Reap.

No lanzar tres Ollama grandes simultáneamente en Pop: usar free cloud en los tres o limitar a una inferencia local y alternar. El launcher inicia un agente seleccionado; tres terminales por host permiten control explícito.

## Task 1: Datos e integración (Mac)

**Create:** archivos asignados en tabla. **Consumes:** contratos, `evaluateGate`, `analyzePhoto`, `getPaymentProvider`, `notifyMachine`. **Produces:** queries, workflow, acciones y auth de interfaces anteriores.

- [ ] Instalar dependencias faltantes en la base B0 antes de repartir. No inventar versiones; registrar lockfile. Mantener scripts typecheck/test/build.
- [ ] Crear prueba de semilla: cuatro máquinas; Forja3D MX/6000/1500; stock 1/mínimo 1; variantes exactas de los dos specs. Implementar schema con FK, `purchase.proposal_id UNIQUE`, restricciones de stock no negativo y un índice parcial de solicitud abierta por máquina/pieza (`proposed`, `approved`).
- [ ] Sembrar hashes de tokens por máquina obtenidos de variables locales, nunca tokens literales en Git. Tokens faltantes impiden el simulador; no generar un token público de respaldo.
- [ ] Escribir y ejecutar antes de implementar:

```ts
it('no duplica gasto ni stock al aprobar dos veces', async () => {
  const id = await pendingP1();
  await Promise.allSettled([approveProposal(id), approveProposal(id)]);
  expect((await getLedger()).rows.filter(r => r.proposal_id === id)).toHaveLength(1);
  expect((await listStock()).find(s => s.machine_id === 'P1')?.qty).toBe(1);
});
```

`pendingP1()` es fixture de este test: seed aislado, stock de P1=0, foto conocida y proveedor mock. Nunca usar la base de demo en tests.

- [ ] Implementar creación: política, una propuesta abierta, visión, matcher, quote de diez minutos, siete reglas, rechazo con razones. Modelo bajo confianza devuelve `needs_confirmation`. Ausencia de producto crea rechazo explícito.
- [ ] Implementar aprobación con sesión operador, reevaluar siete reglas, reserva de presupuesto serializada y transición atómica a `approved` antes de llamada externa. No mantener transacción SQLite abierta durante red. Repetir idempotencyKey tras recuperación; ante resultado ambiguo mantener reserva y requerir conciliación. Verificar amount/currency del resultado contra quote; precio distinto no se registra como éxito.
- [ ] Registrar compra/stock/estado paid en una sola transacción; error definitivo libera reserva y marca failed. Si el proveedor cobró pero no coincide con quote, conservar referencia y estado de conciliación en razón, sin fingir que no hubo cobro.
- [ ] Agregar pruebas de aprobación sin sesión, vencimiento antes de pago, dos compras que juntas exceden presupuesto, fallo mock y reinicio tras respuesta ambigua. Ajustes y reset solo operador; reset/advance solo `DEMO_MODE=1`.
- [ ] Publicar C1, incorporar UI/MCP y verificar que Server Actions no toman merchant/variant/precio del cliente. `advanceHours` actualiza stock una vez y llama `notifyMachine` después de commit.
- [ ] Ejecutar `npm run typecheck`, `npm test`, `npm run build`; commit solo archivos propios.

## Task 2: Gate determinista (Mac)

**Create:** `src/domain/{gate,policy,matcher}.ts` y pruebas co-localizadas. **Consumes:** contratos. **Produces:** tres funciones puras de interfaces.

- [ ] Crear fixture `validP1()` con P1/MK4S/Nextruder, cable variante 67588566679782, foto, horas 1480, confidence 0.9, quote 21.99 CAD vigente, CAD→MXN 13, presupuesto 6000/tope 1500/gasto 0.
- [ ] Ejecutar estas pruebas antes de implementación:

```ts
it('P1 pasa siete reglas', () => {
  const result = evaluateGate(validP1());
  expect(result.passed).toBe(true);
  expect(result.checks).toHaveLength(7);
});
it('no solicita stock en mínimo', () => {
  expect(shouldRequest({ qty: 1, min_qty: 1 })).toBe(false);
  expect(shouldRequest({ qty: 0, min_qty: 1 })).toBe(true);
});
```

- [ ] Implementar política literalmente `qty < min_qty`, matcher por enum, gate con siete checks y razones en español. Alias explícitos del modelo; comparar hotend para nozzle. Tipo de cambio ausente, moneda diferente, fechas inválidas, evidencia no finita o negativa fallan cerrado; horas cero son válidas.
- [ ] Agregar un caso por regla: foto ausente/modelo distinto; MK3S contra tubo MK3S+; variante alterada; cubictech/MX; tope; presupuesto; expiry exactamente `now` o precio/currency cambiados. Caso positivo MK3S+ y caso FlowTech con compat=true/shipping=false. Repetir test con nota maliciosa fuera de GateInput y demostrar mismo resultado.
- [ ] Ejecutar `npx vitest run src/domain` y `npm run typecheck`; commit archivos propios.

## Task 3: Pantallas (Mac)

**Modify:** shell y componentes propios. **Consumes:** queries y acciones del agente 1. **Produces:** seis pantallas responsive con datos reales de SQLite.

- [ ] Conectar Flota a `listMachines/listStock`, avance de horas a Server Action; Propuestas a `listProposals/getProposal`; Libro a `getLedger`; ajustes a `saveSettings`; Registro a `listEvents`; reloj a `getProposal/approveProposal`.
- [ ] No crear rutas JSON para duplicar Server Components. Nunca importar DB/SDK en componentes cliente. Formularios accesibles, foco visible, mensajes de éxito/error y submit deshabilitado durante operación.
- [ ] Propuesta muestra siete reglas, razón, foto y vigencia. Aprobar solo proposed y gate aprobado; el servidor vuelve a validar. Rechazo no se maquilla como fallo del provider. Reloj reutiliza tarjeta mínima de aprobación.
- [ ] Libro muestra insignia de provider por compra, total MXN, presupuesto y costo/hora; CSV con escaping de comillas/newlines y neutralización de fórmulas. Registro renderiza note como texto React, nunca HTML.
- [ ] Validar con C1: P2 botón deshabilitado/razón compat; P4 envío; `needs_confirmation` pide foto/modelo; error de red conserva propuesta; SIN datos no mostrar gastos inventados.
- [ ] `npm run typecheck` y `npm run build`; inspección manual a 390px y escritorio, navegación por teclado; commit solo UI.

## Task 4: MCP y Klipper (Pop)

**Create:** archivos propios de tabla. **Consumes:** createProposal/authenticateMachine/recordMcpRejection/advanceHours/resetDemo. **Produces:** route MCP SDK y notifyMachine.

- [ ] Usar SDK oficial y transporte HTTP del spec; no confundir endpoint JSON propio con MCP. Exportar solo `request_part` en tools/list.
- [ ] Definir schema Zod estricto de RequestPartInput; hours finito y >=0; machine/photo no vacíos; note <=1000. Token bearer hasheado y comparación segura; token P1 no puede pedir P2. Photo debe pertenecer a máquina.
- [ ] Test previo de auth y nota con cliente SDK:

```ts
it('token P1 no pide por P2', async () => {
  const result = await p1Client.callTool({ name: 'request_part', arguments: requestP2 });
  expect(result.isError).toBe(true);
  expect(createProposalSpy).not.toHaveBeenCalled();
});
```

`p1Client`, `requestP2` y spy se crean en fixture aislado del test; el SDK client se conecta al servidor HTTP de prueba con token hasheado del fixture.

- [ ] Añadir tests nota maliciosa no cambia propuesta/qty ni invoca provider; merchant/price/variant/quantity desconocidos se rechazan; una solicitud abierta devuelve existente sin duplicar eventos de compra. No loggear bearer tokens.
- [ ] Construir `tools/klipper-agent.ts`: leer horas/stock simulados, usar cliente SDK MCP y token local por máquina. `notifyMachine` llama tool por HTTP, jamás bypass al workflow. Endpoint Moonraker simulado `GET /api/demo/moonraker?machine_id=P1` devuelve stock/horas/foto del servidor, sin tokens.
- [ ] Rutas demo reset/advance/inject/mode solo DEMO_MODE=1 y sesión operador para mutaciones. inject envía nota por MCP; mode expone modos sin secretos. /advance adapta la misma acción; no descuenta stock otra vez.
- [ ] Tras C1 arrancar app en loopback; P1 llega a proposed sin toque de solicitud y aprobación requiere humano. `npx vitest run src/server/mcp.test.ts`, typecheck; commit archivos propios.

## Task 5: Visión (Pop)

**Create:** archivos propios de tabla. **Consumes:** VisionResult. **Produces:** analyzePhoto y carga de fotos server-only.

- [ ] Validar salida con Zod (confidence 0..1, enum visible_damage, strings/null). Confirmar modelo Anthropic disponible mediante documentación/llave; no sustituir silenciosamente el nombre del spec.
- [ ] Fixture de replay con hash de cada foto realmente disponible. Fotos faltantes bloquean el flujo; no fabricar daño ni resultados atribuidos a una llamada live.
- [ ] Test previo:

```ts
it('replay rechaza una foto desconocida', async () => {
  await expect(analyzePhoto(unknownPhotoId)).rejects.toThrow();
});
```

`unknownPhotoId` se registra en almacenamiento aislado con hash ausente del fixture. Añadir salida inválida, confianza 0.69, null model, modelo distinto y respuesta SDK inválida.

- [ ] Carga de fotos solo operador: límite 5MB, JPEG/PNG con validación de bytes, id generado por servidor, asociación a máquina. No aceptar path arbitrario, URL ni traversal. Servir por id autorizado sin rutas del filesystem.
- [ ] SDK recibe solo imagen y prompt fijo de lectura de placa/daño; nunca nota MCP, pagos, secretos ni texto extraído como instrucción. Fallo API cae a replay solo si hash conocido y muestra REPETICIÓN.
- [ ] `npx vitest run src/server/vision.test.ts src/server/photos.test.ts`, typecheck; commit archivos propios.

## Task 6: Pagos (Pop)

**Create:** payments.ts/tests y reap-integration.md. **Consumes:** PaymentProvider/Input/Result, catálogo servidor. **Produces:** getPaymentProvider.

- [ ] Implementar mock con idempotencyKey por propuesta, ref marcada mock, importe/moneda resueltos del catálogo. Fallo forzado de demo controlado por servidor. Provider mode no depende de texto libre ni de una llave pública.
- [ ] Test previo:

```ts
it('mock devuelve la misma compra para la misma propuesta', async () => {
  const { provider, mode } = getPaymentProvider();
  expect(mode).toBe('mock');
  expect(await provider.pay(cablePayment)).toEqual(await provider.pay(cablePayment));
});
```

`cablePayment` tiene variante 67588566679782, merchant digitmakers.ca, quantity=1, MX e idempotencyKey fija de fixture. Añadir variante desconocida, quantity distinta de 1 y fallo forzado.

- [ ] Documentar por separado respuestas confirmadas de API key, sandbox, /merchants, moneda, variantes permitidas, cotización, envío, idempotencia, consulta de estado tras timeout. ReapProvider no existe hasta contar con documentación suficiente; no fabricar un método pay real.
- [ ] Si se confirma todo, implementar sandbox con validación de respuestas, timeouts y conciliación; mantener interfaz y retornar importe confirmado. Configuración `reap` inválida falla cerrado, nunca fallback automático de un pago ambiguo a mock.
- [ ] Probar adapter con transporte simulado según documentación. Llamada real únicamente en sandbox configurado, fuera de tests automáticos; informar que MOCK no cumple Agentic module.
- [ ] `npx vitest run src/server/payments.test.ts`, typecheck; commit archivos propios.

## Preparación y transporte Git

No hay remote configurado en este checkout. Primero revisar shell, contratos y specs; no publicarlos ni committearlos automáticamente. Antes de repartir, el agente 1 ejecuta solo el primer paso de Task 1 (dependencias/configuración B0) en la base. El integrador prepara un commit base y luego:

```bash
# Mac: preparar los tres worktrees a partir del commit base revisado.
bash scripts/agents.sh check
bash scripts/agents.sh prepare mac
# Abrir tres terminales, una llamada por terminal:
bash scripts/agents.sh run 1
bash scripts/agents.sh run 2
bash scripts/agents.sh run 3
```

Transferir solo historial versionado, usando un bundle base:

```bash
# Mac; no incluir .env, fotos privadas ni SQLite en Git.
git bundle create /tmp/partproof-base.bundle HEAD
scp /tmp/partproof-base.bundle pop-os-codex:/tmp/partproof-base.bundle
# Pop (ejecutar en terminal del host):
git clone /tmp/partproof-base.bundle ~/partproof
cd ~/partproof
bash scripts/agents.sh prepare pop
# Tres terminales en Pop, cada una desde ~/partproof:
bash scripts/agents.sh run 4
bash scripts/agents.sh run 5
bash scripts/agents.sh run 6
```

El default es `opencode/big-pickle` de la cascada free; `deepseek-v4-flash-free` no aparece en esta instalación. Verificar `opencode models` en cada host antes de arrancar y escoger con `PARTPROOF_MODEL`. Para una terminal local, después de verificar Ollama en ese host: `PARTPROOF_MODEL=ollama-local/qwen2.5-coder:7b bash scripts/agents.sh run 4`. El nombre del provider debe existir en OpenCode de Pop; no asumir que la configuración del Mac existe ahí.

Recoger resultados de Pop sin depender de GitHub:

```bash
# Pop, después de commits de los agentes:
git bundle create /tmp/partproof-pop.bundle partproof/agent-4 partproof/agent-5 partproof/agent-6
# Mac:
scp pop-os-codex:/tmp/partproof-pop.bundle /tmp/partproof-pop.bundle
git fetch /tmp/partproof-pop.bundle 'refs/heads/partproof/*:refs/remotes/pop/partproof/*'
# Revisar log/diff; cherry-pick de commits elegidos, nunca merge ciego.
git log --oneline HEAD..refs/remotes/pop/partproof/agent-5
```

Para C1 generar bundle nuevo de HEAD integrado; Pop hace fetch, revisa y cada rama incorpora ese HEAD por merge. Las worktrees no comparten working directory, ni siquiera en el mismo host. Instalar con `npm ci` en cada una; no modificar lockfile fuera del integrador. SQLite por worktree vía `DATABASE_PATH` local ignorado en Git.

## Cierre y aceptación

- [ ] `npm run typecheck && npm test && npm run build` en integración.
- [ ] `npm run start`: UI indica SANDBOX/MOCK y estado real live/replay.
- [ ] Reset demo solo con DEMO_MODE=1; P1 +20h consume stock y solicita vía SDK MCP; aprobación humana paga una sola vez y libro registra 285.87 MXN de ejemplo (21.99 CAD × 13).
- [ ] P2 +20h bloquea PTFE por MK3S; P4 +10h pasa hotend pero bloquea envío MX.
- [ ] Inyección con nota no aumenta cantidad ni abre compra; registro la muestra como dato literal.
- [ ] Quote expirada bloquea pago; token de máquina no autoriza aprobación; concurrencia no excede presupuesto.
- [ ] Foto borrosa requiere confirmación; foto nueva offline falla explícitamente. Sin fotos de ejemplo, reportar demo incompleta.
- [ ] Libro muestra costo/hora y mes contra 6000; CSV válido y móvil accesible.
- [ ] Clasificar entrega: shell / demo MOCK / demo REAP SANDBOX. Solo última cumple Agentic module; anotar bloqueos reales sin maquillarlos.

No desplegar a serverless con SQLite local, ni arrancar agentes remotos, ni hacer compras al crear esta shell. Esos pasos pertenecen a la ejecución del plan.
