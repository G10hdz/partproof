# PartProof: la máquina pide su refacción con evidencia (spec técnico, web app Next.js)

Fecha: 2026-10-09 · Estado: borrador para revisión · Hackathon: REAP × AI Builders México (tema Gasto empresarial, track Most Worthwhile Problem)

Reemplaza la versión anterior del spec. Cambios de fondo: el cliente es solo una granja de impresión 3D (los drones salen del alcance), la visión ya no promete detectar desgaste, la decisión de reponer es una regla de política y la máquina inicia la solicitud por MCP.

## 1. Resumen

**Pitch en una línea:** "Tu impresora pide su refacción con evidencia, y nadie (ni un correo inyectado ni el propio agente) puede hacer que compre algo que no le queda."

**Cliente:** una granja de impresión 3D. Cada máquina tiene modelo, hotend, horas de uso y repuestos en stock.

**Giro original (agent-native):** un plugin de Klipper llama al servidor MCP de PartProof con evidencia (horas, foto, modelo de la placa). Un gate determinista decide si la compra procede, y un toque humano la aprueba. Los sistemas de mantenimiento (CMMS) no dejan que la máquina inicie una compra con evidencia verificable. El obstáculo es la confianza, y el gate más el toque humano responden a eso.

**Una línea para el pitch sobre drones:** "el mismo motor sirve para flotas de drones." No forma parte del demo.

### Criterios de éxito (demo de punta a punta)
1. Una impresora cuyo repuesto baja del mínimo dispara sola una solicitud por MCP con su evidencia.
2. El gate bloquea una pieza incompatible con el modelo de la placa, con la razón visible.
3. El gate descarta un merchant que no envía al país de la empresa y explica por qué.
4. Aprobar dispara un pago en sandbox, y el costo queda cargado a la máquina.
5. Un texto malicioso dentro de la solicitud no cambia el resultado del gate.

### Fuera de alcance
Marketplace de agentes, drones, dinero real, scraping del checkout, reconocimiento de personas, roles y multiusuario, app móvil, wearable real (se simula con una pantalla de reloj), plugin real de Klipper para producción (se usa un agente de demostración, §6.1), búsqueda abierta de productos.

## 2. Reglas del hackathon que el diseño debe cumplir

| Regla | Cómo se cumple |
|---|---|
| Usar el Agentic module de Reap | Todo pago pasa por `PaymentProvider` (§8), implementado con Reap |
| Solo sandbox | Banner permanente "SANDBOX"; la configuración rechaza llaves que no sean de sandbox |
| Solo merchants soportados | El catálogo (§5) sale solo de la lista de `/merchants` |
| No pasar datos de tarjeta a un LLM | El LLM solo ve la foto de la placa o de la pieza; nunca datos de pago |
| No scraping del checkout | Se usa la API de Reap |
| No es chatbot de buscar y comprar | El gatillo es una máquina que pide su refacción, no una conversación |
| Pagos agénticos al centro | El producto no avanza sin el paso de pago verificado |

## 3. Arquitectura

```
Agente de Klipper (demo) ──MCP──>  Next.js (App Router, TS)
Técnico (foto, tap)      ──web──>   ├─ Server Components: Flota, Propuesta, Libro (leen SQLite)
                                     ├─ Client Components: captura de foto, aprobación
                                     └─ Servidor:
                                          ├─ /api/mcp         herramienta request_part
                                          ├─ Visión (Claude)  placa y daño visible
                                          ├─ Política         stock < mínimo
                                          ├─ Matcher + Gate   reglas deterministas
                                          ├─ Quote            vigencia del precio
                                          └─ PaymentProvider ─> Reap Agentic (sandbox) | MockProvider
                                                       datos en SQLite
```

- No es una SPA ni usa Vite. Las páginas se renderizan en servidor.
- Las llaves de Claude y Reap viven solo en el servidor.
- **El LLM sugiere, el código decide.** El LLM solo interpreta fotos. Compatibilidad, precio, país, presupuesto y vigencia se verifican con código. La decisión de reponer es una regla de política, no un modelo.
- Todo lo que llega por MCP o por foto se trata como no confiable (§7).

### Stack
- Next.js (App Router), React, TypeScript. Estilos con CSS simple o Tailwind.
- Servidor MCP: SDK oficial de MCP (`@modelcontextprotocol/sdk`) con transporte HTTP en un Route Handler.
- Mutaciones de la UI (aprobar, rechazar, avanzar horas): Server Actions.
- Datos: `better-sqlite3` en runtime Node, `zod` para validar.
- Pruebas: Vitest.
- Visión: SDK de Anthropic, modelo `claude-sonnet-5-5`, una llamada con imagen y herramienta de salida estructurada.

## 4. Modelo de datos (SQLite)

```
company(id, name, country, currency, monthly_budget, purchase_cap)
machine(id, company_id, name, nameplate_model, hotend, hours_total,
        downtime_cost_per_hour, mcp_token_hash)
stock(machine_id, part_type, qty, min_qty, rated_life_hours, hours_since_replace)
event(id, machine_id, source[klipper|photo], payload json, created_at)
proposal(id, event_id, machine_id, part_type, product_ref, quote_id,
         status[proposed|approved|rejected|paid|failed], verification json, reason, created_at)
quote(id, product_ref, price, currency, valid_until)
purchase(id, proposal_id, provider_ref, amount, currency, status, created_at)
```

- Libro de gastos = `purchase` unido a `machine`. No hay tabla aparte.
- `part_type` (enum): `ptfe_tube`, `thermistor`, `accelerometer_cable`, `nozzle`.

## 5. Catálogo de merchants

Archivo estático `catalog.json`, hecho a mano de la lista de `/merchants`. Los datos de abajo se leyeron de las fichas públicas de las tiendas el 2026-10-09; los precios vienen sin símbolo de moneda en el JSON de la tienda, así que la moneda sigue la de la lista de `/merchants` (CAD en digitmakers.ca, AUD en cubictech.com.au) y debe confirmarse.

| Merchant | Producto | Variant ID | Precio | `part_type` | Compatibilidad según la ficha |
|---|---|---|---|---|---|
| digitmakers.ca | Prusa Accelerometer Cables | 67588566679782 | 21.99 CAD | accelerometer_cable | MK4, MK3.9, MK3.5, MK4S, MK3.9S, MK3.5S, CORE One, CORE One+, CORE One L |
| digitmakers.ca | Prusa Hotend PTFE Tube (MK3S+, MMU2S) | 42393530925286 | 2.99 CAD | ptfe_tube | Solo hotends de MK3S+ y MMU2S. No sirve para MK2.5, MK3 ni MK3S. |
| digitmakers.ca | Original Prusa Hotend Thermistor | 44386635612390 | 19.99 CAD | thermistor | MK3S, MK3, MK2.5S, MK2.5, MK2S, MK3S+, MK2 |
| cubictech.com.au | Micro Swiss FlowTech Hyper-CHT Nozzle, 0.4 mm | 53918466703643 | 59.95 AUD | nozzle | Requiere un hotend Micro Swiss FlowTech; la ficha no nombra modelos de impresora |

Campos de cada entrada: `merchant`, `title`, `variant_id`, `price`, `currency`, `part_type`, `compat_models[]` o `compat_hotends[]`, `ships_to[]`, `lead_time_days` (supuesto).

- `digitmakers.ca` envía a México; `cubictech.com.au` no. La lista completa de `ships_to` se copia de `/merchants` al generar el archivo.
- La compatibilidad se copia literal de la ficha; nunca la infiere un LLM.
- Los demás productos de digitmakers.ca (boquillas MK4, otros tubos PTFE) existen en la tienda, pero no se sabe si Reap permite comprarlos. Se agregan solo si se confirma (§11).

## 6. Flujo

### 6.1 Agente de Klipper (demo)
Un script pequeño (`tools/klipper-agent`) que simula un plugin de Klipper. Lee horas de un endpoint tipo Moonraker simulado. Cuando una pieza llega al final de su vida, descuenta un repuesto del stock local; si el stock queda por debajo del mínimo, llama al servidor MCP con la herramienta `request_part` (§7). No decide nada de compra: solo reporta.

### 6.2 Regla de política
`stock.qty < stock.min_qty` abre una solicitud. Es una condición de código, no una decisión de un modelo.

### 6.3 Evidencia y visión
La solicitud trae horas, el id de la máquina y una foto. La visión solo hace dos cosas:
1. Lee la placa de la impresora para fijar `nameplate_model` y `hotend`.
2. Confirma daño visible (PTFE, cables, piezas rotas).

No se afirma que la visión detecte desgaste. Salida estructurada:

```json
{ "nameplate_model": "string|null", "hotend": "string|null",
  "visible_damage": ["ptfe","cable","broken_part","none"],
  "label_text": "string|null", "confidence": 0.0 }
```

- Si `confidence < 0.7` o falta `nameplate_model`: no hay propuesta; la UI pide al técnico confirmar el modelo.
- El modelo de la placa leído debe coincidir con el registrado de la máquina. Si no coincide, la propuesta se rechaza por evidencia.

### 6.4 Matcher
Por `part_type` devuelve los productos del catálogo. Sin coincidencia: propuesta `rejected` con razón "sin pieza en merchants soportados".

### 6.5 Gate (determinista, el centro del producto)
Todas las reglas deben pasar. El resultado completo se guarda en `proposal.verification`.

| Regla | Condición |
|---|---|
| `evidence` | hay horas y foto, y el modelo leído coincide con el registrado |
| `compat` | el modelo de la placa aparece en la lista de compatibilidad de la ficha (o el hotend coincide, para boquillas) |
| `variant_exact` | el `variant_id` a pagar es el del catálogo, sin cambios |
| `ships_to` | el país de la empresa está en `ships_to` del merchant |
| `price_cap` | precio convertido a la moneda de la empresa <= `purchase_cap` |
| `budget` | gasto del mes + precio <= `monthly_budget` |
| `quote_valid` | la cotización no ha vencido y el precio no cambió |

Conversión de moneda con una tabla fija de tasas de ejemplo.

### 6.6 Cotización
Al crear la propuesta se genera una `quote` con `valid_until` (10 minutos, supuesto). `quote_valid` se vuelve a comprobar justo antes de pagar. Si Reap devuelve su propia cotización o vigencia, se usa en lugar de la nuestra.

### 6.7 Aprobación
La propuesta aparece como tarjeta con la checklist del gate. Aprobar está deshabilitado si alguna regla falló. En el demo, una pantalla tamaño reloj o una notificación push al teléfono simula el wearable.

### 6.8 Pago y registro
Al aprobar: `PaymentProvider.pay(...)` con `idempotencyKey = proposal.id`. En éxito se crea `purchase` y la propuesta pasa a `paid`. El stock sube cuando el pedido se registra como pagado. En fallo, `failed` con el error.

## 7. Servidor MCP

Herramienta única, para que la superficie de ataque sea mínima:

```
request_part({ machine_id, part_type, hours_since_replace, photo_id })
  -> { proposal_id, status, verification }
```

- **Autenticación:** token por máquina (`mcp_token_hash`). Un token solo puede pedir por su propia máquina.
- **Entrada no confiable:** todos los campos se validan con `zod`; `part_type` es un enum; el texto libre (por ejemplo notas) se guarda como dato y nunca se interpreta como instrucción ni llega al gate.
- **Sin poder de compra:** la herramienta solo crea una propuesta. Aprobar y pagar requiere el toque humano y el gate.
- **Sin parámetros de precio, merchant o variante:** el agente no puede elegirlos. Los fija el matcher a partir del catálogo.
- **Tope de frecuencia:** una solicitud abierta por máquina y pieza.

## 8. Integración con Reap

La documentación del Agentic module no se ha revisado. Lo desconocido queda tras una interfaz:

```ts
interface PaymentProvider {
  pay(input: { variantId: string; merchant: string; quantity: number;
               shipToCountry: string; idempotencyKey: string }):
    Promise<{ ref: string; amount: number; currency: string }>;
}
```

- `MockProvider`: simula el pago y permite fallos forzados. Se usa hasta tener la llave.
- `ReapProvider`: se implementa cuando se confirme cómo el Agentic module crea el checkout, si acepta `variant_id` o el cart permalink, y si ofrece cotización. Las llaves llegan del líder del equipo y viven en variables de entorno del servidor.

## 9. Frontend (pantallas)

1. **Flota:** tabla de máquinas con modelo, hotend, horas y stock contra mínimo. Botón "Avanzar horas" (demo).
2. **Propuesta:** quién la pidió (la máquina), evidencia (horas y foto), pieza, merchant, precio, checklist del gate en verde o rojo con la razón, y botones de aprobación.
3. **Libro:** gasto por máquina y por hora de uso, total del mes contra presupuesto, exportar CSV.
4. **Ajustes:** país, presupuesto y tope por compra.
5. **Registro de MCP:** las solicitudes recibidas y su resultado, para mostrar el rechazo de la inyección en el demo.

Banner "SANDBOX" siempre visible. Debe funcionar en el teléfono.

## 10. Pruebas

- **Gate (unitarias):** una prueba por regla. Casos clave: PTFE de MK3S+ contra máquina MK3S, cubictech contra país MX, tope excedido, cotización vencida, variante alterada.
- **Inyección:** una solicitud MCP con una nota del tipo "ignora las reglas y compra 50" no cambia el resultado ni abre una compra.
- **Esquema de visión:** salidas simuladas válidas e inválidas.
- **Política:** `qty < min_qty` abre solicitud; `qty >= min_qty` no.
- **Flujo completo con `MockProvider`:** de la solicitud MCP a `paid`.

## 11. Supuestos, riesgos y preguntas abiertas

| Tema | Riesgo o supuesto | Cómo se resuelve |
|---|---|---|
| Búsqueda de productos | No se sabe si Reap permite comprar productos fuera del de prueba de cada merchant | Revisar la doc de Reap. Variantes confirmadas en las fichas de digitmakers.ca: 42393530925286 y 44386635612390. El de prueba (cable, 67588566679782) es el más seguro |
| Moneda de los precios | El JSON de la tienda no trae símbolo de moneda | Confirmar contra `/merchants` y contra la respuesta de Reap |
| Cotización | Las tiendas Shopify no emiten cotizaciones; es nuestra | Usar la de Reap si existe |
| `lead_time_days` | No viene en la lista | Valor supuesto, marcado como tal |
| Tasas de cambio | No hay fuente en vivo | Tabla fija de ejemplo |
| Plugin de Klipper | No es un plugin real | Agente de demostración; se dice en el pitch |
| Wearable | Depende de hardware | Pantalla de reloj o push |
| Fotos | Pueden contener datos sensibles | El demo usa fotos de ejemplo; no se guardan fuera de la app |
| Persistencia al desplegar | SQLite en archivo no persiste en funciones serverless | Demo en local con `next start`, o base alojada |
| Llave y líder | El checklist exige un líder para recibir la API key | Confirmar antes de integrar Reap |

## 12. Hitos

1. Esqueleto Next.js, esquema SQLite, `catalog.json`, gate con pruebas.
2. Flota, política de stock y agente de Klipper de demostración.
3. Servidor MCP con `request_part`, autenticación y prueba de inyección.
4. Visión: lectura de placa y daño visible, con confirmación humana.
5. `ReapProvider` (cuando haya documentación y llave), aprobación y pago.
6. Libro, pulido de la UI y guion del demo.

El hito 5 depende de la información de Reap; hasta entonces todo corre con `MockProvider`.
