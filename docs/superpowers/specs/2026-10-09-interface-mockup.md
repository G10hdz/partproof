# PartProof: pantallas y recorrido del mockup

Estado: propuesta visual para diseñar el recorrido; no cambia el funcionamiento de los specs técnicos.

## Decisión aprobada: opción C

El usuario eligió C para implementación en todas las pantallas. Esta decisión sustituye la comparación de alternativas: A y B se conservan solo como historial de exploración. No volver a elegir una composición distinta por pantalla.

C usa lateral carbón, contenido claro, pieza/equipo o estado como foco principal y columna de resumen contextual. En móvil la composición se apila sin perder evidencia, razones de bloqueo ni acción principal. Aprobación incluye el formato compacto de reloj mostrado en C.

Fuente visual de entrega: `public/wireframe/agents.html` (solo C, selector de responsable, nueve vistas y escenarios). Reutiliza el renderer y CSS del comparador; no existe una segunda implementación divergente. Las anotaciones fuera del frame describen contratos y responsabilidades; no se llevan a la app.

El artifact sigue siendo un wireframe: sus snapshots y mensajes simulados no sustituyen SQLite, los siete checks ni la aprobación humana. Cada agente debe convertir su parte en datos/comportamiento real según el spec técnico, conservando la composición C.

## Dirección visual

- Referencia 6: base crema, texto carbón, números grandes, filas con divisores finos y naranja como acento. Es la base de identidad.
- Referencias 2 y 3: vista de operación con máquina/evidencia dominante y datos relevantes alrededor; evitar indicadores decorativos que parezcan telemetría real.
- Referencias 1 y 4: protagonismo del equipo o refacción, espacio libre y jerarquía clara entre imagen, nombre y acción.
- Referencia 5: captura de evidencia móvil, encuadre amplio y controles simples.
- Referencia 7: resumen ordenado antes de confirmar. El pago se realiza por el proveedor; no se diseñan campos de tarjeta, CVV ni selector de billeteras.
- Paleta propuesta: crema #F3EEE6, superficies #FAF8F4, carbón #171816, naranja #F65C24. Usar naranja con texto carbón; los estados usan texto/icono además de color.
- Tipografía: Helvetica Neue/system sans para interfaz, monospace para id/horas/referencias. Serif puntual opcional en el saludo, como referencia 6.
- Paneles con radios de 16-24 px, botones de 12 px, sombras discretas. La prioridad son lectura, imagen y espacio, no efectos.
- Escritorio: navegación lateral estrecha, contenido principal y resumen contextual a la derecha. Móvil: columna única, navegación Flota/Propuestas/Libro; Registro y Ajustes en menú.
- SANDBOX permanente. MOCK o REAP SANDBOX para pago, LIVE o REPETICIÓN para visión. En mockups ilustrativos se indica “datos de ejemplo”.

## Recorrido principal

Flota → la máquina solicita automáticamente → Propuesta y evidencia → Verificaciones → Aprobación humana → Resultado del pago → Libro.

Captura de foto es una rama cuando hace falta evidencia. El usuario no tiene que crear la solicitud de P1. Un bloqueo permanece en la misma propuesta, con explicación y aprobación deshabilitada.

## Referencias adicionales de escritorio

Segundo grupo de seis imágenes enviado por el usuario (numeración independiente del primer grupo):

- 1, Est-Trans: navegación superior, filtros compactos, tabla de actividad y panel contextual a la derecha. Referencia para Flota con solicitudes y Libro con movimientos.
- 2, Lunor: navegación lateral clara, grilla ordenada y listas legibles. Referencia para jerarquía de la app y organización de máquinas.
- 3, Earnings: lateral oscuro y resumen financiero dominante. Referencia para presupuesto y gasto del Libro.
- 4, Management: contraste de paneles y preview visual. Referencia para evidencia en Detalle/Propuesta.
- 5, My Cards: composición dividida, lista de movimientos y cifras claras. Referencia para Libro y detalle de compra, sin UI de tarjeta bancaria.
- 6, Hello Nikky: navegación lateral y columna de resumen. Referencia para la variante de Flota con información contextual.

Flota puede adoptar una composición dashboard de operación; Libro una composición financiera. Propuesta, Evidencia, Aprobación, Resultado y Ajustes mantienen su naturaleza de ficha, captura, confirmación, comprobante y formulario. Los gráficos de las referencias solo se trasladan si ayudan a explicar datos existentes del producto.

## Formato del artifact y alternativas

El siguiente artifact será un wireframe HTML navegable, no una imagen renderizada. Contendrá tres opciones por cada una de las nueve vistas, conservando los mismos elementos y acciones:

- A: navegación superior, lectura editorial y contenido en filas.
- B: navegación lateral, estructura de workspace y paneles por sección.
- C: composición contextual, bloque principal dominante y resumen secundario; contraste claro/oscuro.

Las diferencias deben ser de composición y jerarquía, no tres cambios de color. Permitir seleccionar pantalla y opción, y seguir el recorrido dentro de cada alternativa. Captura y reloj usan encuadre móvil. Datos y acciones se marcan como simulados; no conectar pagos ni cámara real para el wireframe.

Cada artifact generado o actualizado se commitea automáticamente tras su comprobación, sin push automático.

## Mapeo final de referencias del usuario

Último grupo de seis imágenes: Flota → catálogo de productos; Detalle de máquina → producto Logitech oscuro; Resultado → cart con pieza y resumen lateral, sin editar cantidades; Propuesta → invoice con documento y resumen; Bitácora → trade history; Ajustes → formulario Settings. Estas asignaciones tienen prioridad sobre las referencias generales anteriores.

Artifact implementado: `public/wireframe/index.html`, CSS y módulo JS junto al HTML. Nueve vistas × tres composiciones = 27 alternativas. Incluye comparador, encuadre móvil, variantes de bloqueo P2/P4, estados de pago confirmado/fallido/ambiguo, filtros de bitácora, selección de equipo y exportación de CSV ilustrativo. Cada pantalla es un snapshot de ejemplo, no un sistema de compras con estado persistente.

Verificación: `node scripts/wireframe.test.mjs` y revisión en Chrome de las 27 vistas, aprobación bloqueada de P2/P4 y formulario móvil. Vista previa: `public/wireframe/preview.png`. Cámara, visión, MCP y pago reales no se conectan en este artifact.

## Pantallas y elementos

| Vista | Pregunta del usuario | Elementos principales | Acción |
|---|---|---|---|
| 1. Flota `/` | ¿Qué máquina necesita atención? | Forja3D MX; cuatro equipos P1-P4; modelo/hotend; horas; stock/mínimo; solicitudes pendientes; gasto mensual contra 6000 MXN | Ver máquina o propuesta. “Avanzar horas” en zona de controles de demo |
| 2. Detalle de máquina, subvista de Flota | ¿Qué pasó y qué evidencia existe? | Imagen del equipo; id/modelo/hotend; pieza; stock; horas desde cambio/vida nominal; historial de eventos; foto de placa | Abrir propuesta; completar evidencia |
| 3. Captura de evidencia, modal/subvista móvil | ¿La placa se lee bien? | Máquina a la que pertenece; visor/preview; guía de encuadre; tomar/subir foto; repetir; estado de lectura; modelo leído y registrado | Usar foto; repetir si borrosa; confirmar modelo solo como dato del técnico, sin saltarse gate |
| 4. Propuesta `/proposals`, selección por id | ¿Esta pieza le queda y puede comprarse? | Máquina solicitante y origen; imagen de pieza; nombre/variante; tienda; importe original y equivalente MXN; evidencia; vigencia; siete verificaciones con razones; resultado destacado | Ir a aprobar si válida; rechazar. Bloqueada: aprobación deshabilitada y razón visible |
| 5. Aprobación, subvista de Propuesta + `/watch` | ¿Qué estoy autorizando? | Máquina, pieza, cantidad 1, merchant, destino MX, total cotizado, vigencia, proveedor sandbox y resumen de verificaciones | “Aprobar compra” o “Rechazar”. Reloj muestra la misma decisión en formato compacto |
| 6. Resultado, estado de Propuesta | ¿El pago se confirmó? | Procesando/confirmado/fallo/pendiente de conciliación; referencia; importe/moneda confirmados; máquina; proveedor; actualización de stock | Ver movimiento en libro cuando paid. Pago ambiguo: no ofrecer otra compra |
| 7. Libro `/ledger` | ¿Cuánto gastó cada máquina? | Total del mes; presupuesto 6000 MXN; filas por compra; fecha, máquina, pieza, importe y proveedor; costo/hora con denominador claro; detalle de movimiento | Exportar CSV; ver propuesta origen |

## Pantallas de soporte

- **Registro `/mcp-log`:** cronología de solicitudes, máquina, resultado y nota literal. Detalle desplegable de evidencia/validaciones; nunca mostrar token. Caso de inyección visible como dato, sin acción de compra.
- **Ajustes `/settings`:** país MX, moneda MXN visible, presupuesto mensual y tope por compra; guardar/cancelar y confirmación de cambios. Llaves fuera del mockup operativo.
- **Controles demo:** avanzar horas, reset e inyectar nota en panel identificado como simulación; no compiten visualmente con acciones del técnico.

## Estados que deben verse en el mockup

1. **P1 lista para aprobación:** MK4S, cable de acelerómetro, stock 0/1, siete verificaciones correctas. Cotización 21.99 CAD y 285.87 MXN con tasa de ejemplo explícita; no inventar impuestos ni envío incluido.
2. **P2 bloqueada:** tubo PTFE para MK3S+; equipo MK3S. Mensaje: “Esta pieza no es compatible con la MK3S”. Detalle muestra la restricción de la ficha.
3. **P4 bloqueada:** FlowTech compatible con hotend, tienda no envía a MX. Separar esas dos verificaciones para explicar el rechazo.
4. **Evidencia insuficiente:** foto borrosa/modelo no legible; pedir otra foto; no mostrar una propuesta aprobable.
5. **Cotización vencida:** vigencia terminada; deshabilitar aprobar y explicar que requiere nueva cotización, sin asumir que existe aún una acción implementada.
6. **Pago confirmado:** referencia y proveedor visibles, una sola compra en libro. Variante de mockup, marcada como ejemplo; no presentarla como transacción real.
7. **Pago fallido o ambiguo:** estado textual y acción segura; nunca convertir falta de respuesta en “pagado” ni ofrecer doble compra.
8. **Estado vacío/carga:** sin propuestas, sin compras o lectura en curso; no rellenar con métricas inventadas.

## Composición del primer tablero visual

Diseñar primero cuatro frames: Flota escritorio, Propuesta válida P1 escritorio, Propuesta bloqueada P2 móvil y Libro móvil. Después Captura y Aprobación móvil/reloj. Reutilizar estructura de Propuesta para P4, vencimiento y resultado de pago.

- Flota: encabezado breve + cuatro máquinas; resumen mensual oscuro al lado; solicitudes como filas, no otro dashboard de gráficos.
- Propuesta escritorio: evidencia/imagen y ficha en columna principal; checklist/resumen de compra al lado. Vigencia junto al CTA, no escondida en menú.
- Propuesta móvil: máquina → pieza → evidencia → resumen de verificaciones → importe/vigencia → acción. La acción no debe ocultar el rechazo al quedar fija abajo.
- Libro móvil: tarjeta oscura de gasto mensual sobre fondo crema, números grandes y movimientos en filas, siguiendo referencia 6.

Accesibilidad: contraste legible, objetivos táctiles de al menos 44 px, foco visible, etiqueta de estado además del color y errores junto al dato que requiere atención. Los activos de equipo/producto se identifican como ilustrativos hasta tener fotos reales; una imagen estética no cuenta como evidencia.

## Entrega al agente 3

Este documento guía la UI de Task 3 del plan de seis agentes. Detalle de máquina, captura, aprobación y resultado son subviews/estados de las rutas existentes; no requieren agregar cuatro páginas ni modificar contratos para dibujar el mockup. La implementación funcional de cada acción sigue dependiendo de su módulo y checkpoint.

Sin pruebas de usabilidad ni pagos reales en esta etapa. Los importes de ejemplo conservan los supuestos CAD/AUD y tasas del spec.
