# Opción C — entrega para seis agentes

**Decisión:** el usuario aprobó C para todas las pantallas. Usar `public/wireframe/agents.html`, no reinterpretar A/B ni copiar la toolbar de revisión a la app.

## Abrir el artifact

```bash
python3 -m http.server 4318 --bind 127.0.0.1 --directory public/wireframe
# http://127.0.0.1:4318/agents.html?agent=1
```

Con Next.js: `/wireframe/agents.html?agent=1`; cambiar agent=1..6. El selector de pantalla permite revisar las nueve vistas, aunque el selector de agente destaca las relevantes para su módulo.

| Agente | Máquina | Revisar en C | Entrega necesaria para esa UI |
|---|---|---|---|
| 1 — datos/integración | Mac | Flota, Detalle, Libro, Ajustes | DTO de máquinas/stock/propuestas/libro; acciones de operador; presupuesto e importes correctos; stock actualizado solo tras pago confirmado; transacciones e idempotencia. |
| 2 — gate | Mac | Propuesta, Aprobación | Siete checks con boolean y razón legible. P1 válido, P2 incompatibilidad exacta y P4 envío. Revalidar al pagar, no solo deshabilitar botón. |
| 3 — UI | Mac | Las nueve vistas | Implementar composición C sobre Server Components y acciones del plan. Móvil, reloj, navegación, estados vacíos/carga/error y accesibilidad. |
| 4 — MCP/Klipper | Pop | Flota, Bitácora, Propuesta | Solicitud automática con identidad de máquina; una abierta por máquina/pieza; notas como datos; ninguna autorización de compra; rechazo visible y sin tokens. |
| 5 — visión | Pop | Evidencia, Detalle, Propuesta | Foto asociada a máquina; modelo/hotend; modo live/replay; lectura insuficiente pide nueva evidencia; nunca inferir desgaste o usar esquema como foto real. |
| 6 — pagos | Pop | Aprobación, Resultado, Libro | Mock/Reap explícito; reference/amount/currency confirmados; fallo y estado ambiguo distintos; idempotencia y conciliación; no duplicar compra. |

## Contratos y ownership

La selección de agente del artifact es una guía de consumo de pantallas. El agente 3 es dueño de la implementación visual; los demás producen datos y comportamiento del servidor. Archivos asignados, tipos, firmas y checkpoints siguen en [plan de implementación](../plans/2026-10-09-partproof-six-agents.md) y `src/contracts.ts`; este handoff no crea interfaces nuevas.

1. Agentes 1, 2, 5 y 6 entregan los módulos del checkpoint C1.
2. Agente 3 conecta C a queries/acciones, reemplazando snapshots por datos reales.
3. Agente 4 conecta solicitud MCP real con C1. El técnico no tiene que crear manualmente la solicitud de P1.
4. Integrador verifica los escenarios y el recorrido final. No comprar ni desplegar como parte de la revisión del wireframe.

## Estados compartidos para revisar

- **P1:** stock bajo → solicitud automática → siete checks correctos → aprobación humana → pago confirmado → libro, una sola vez.
- **P2:** MK3S contra PTFE MK3S+/MMU2S; razón visible, aprobar deshabilitado, servidor también bloquea.
- **P4:** hotend FlowTech coincide; envío a MX falla. Mostrar ambos resultados sin confundir compatibilidad con país.
- **Evidencia insuficiente:** confianza < 0.7 o modelo ausente, sin propuesta aprobable. El mockup muestra la composición; el estado real lo entrega visión.
- **Quote vencida:** acción de aprobación deshabilitada y revalidación servidor. No presentar quote estática de wireframe como vigente en producción.
- **Pago fallido:** sin gasto ni stock nuevo. **Pago ambiguo:** conciliación pendiente, sin comprar otra vez.
- **Nota maliciosa:** texto literal en bitácora, sin cambios de variante, merchant, cantidad o precio.

## Qué trasladar y qué reemplazar

Trasladar estructura C, orden visual, secciones, nomenclatura y acciones del recorrido. Reemplazar dibujos, datos fijos, temporizador estático, mensajes de simulación y export ilustrativo por evidencia/estado del servidor. Mantener las etiquetas de sandbox/proveedor/visión según el modo real.

Las columnas pueden ajustar su ancho al contenido real y al teléfono; eso no reabre la decisión C. Un estado técnico nuevo se representa dentro de la misma composición, sin convertir cada fallo en una ruta distinta.

No se validaron integraciones reales ni usabilidad con técnicos al aprobar el wireframe. Reap sigue condicionado a documentación y llave sandbox confirmadas.
