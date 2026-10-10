# Investigación PartProof para granjas 3D

- **Captura:** 2026-10-09
- **Origen:** conversación completada de Gemini Deep Research, “Análisis de Competencia y Repositorios para PartProof”.
- **Nota de atribución:** las afirmaciones, fechas de actividad, licencias, estrellas y recomendaciones de este documento son hallazgos de Gemini. Esta exportación no los verificó de forma independiente.

## Brief original

Investigar repositorios reutilizables y competencia para PartProof: una granja de impresión 3D en la que telemetría de Klipper/Moonraker u OctoPrint, inventario mínimo y una confirmación visual disparan la selección, verificación determinista y pago de una refacción. Debía cubrir telemetría, CMMS/inventario, compatibilidad de piezas, visión, pagos agénticos y catálogos Shopify, además de Obico, SimplyPrint, 3DPrinterOS, Printago, AutoFarm3D, Bambu Farm Manager, MaintainX, UpKeep, Fiix y Limble.

## Resumen ejecutivo

Gemini concluye que no encontró un producto que complete el ciclo autónomo entero: detectar desgaste, validar visualmente, elegir una pieza compatible, comprobar precio y envío, y pagar de forma autónoma iniciada por la máquina. Recomienda dejar todo I/O fuera del bucle de Klipper, modelar la compatibilidad con reglas deterministas sobre datos estructurados y usar mandatos o credenciales de pago restringidas en vez de depender del checkout automatizado de Shopify.

## Informe renderizado de Gemini

### 1. Repositorios de código abierto por componente arquitectónico

#### Telemetría de impresoras y mecanismos de activación

Gemini señala que Klipper delega la planificación cinemática a `klippy`, mientras Moonraker gestiona red y servicios asíncronos. Por ello, las llamadas externas bloqueantes desde Klipper pueden causar `timer too close`; la telemetría y los eventos deben vivir en Moonraker o en un puente externo.

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [Arksine/moonraker](https://github.com/Arksine/moonraker) | ~1.6k | < 1 mes | GPL-3.0 | Python | `components/history.py`, `components/notifier.py` | Fácil |
| [Charleslotto/klipper-mcp](https://github.com/Charleslotto/klipper-mcp) | <100 | < 2 meses | MIT | Python | Servidor MCP sobre Moonraker y estadísticas de vida útil | Fácil |
| [mikehatch/KlipperClaudeMCP](https://github.com/mikehatch/KlipperClaudeMCP) | <100 | < 6 meses | MIT | TypeScript | Historial, telemetría y `printer.cfg` multiimpresora | Medio |
| [darkoperator/Klipper-Macro-Scheduler](https://github.com/darkoperator/Klipper-Macro-Scheduler) | <100 | < 12 meses | MIT | Python/JS | `macro_scheduler.py`, SQLite y horómetros | Medio |
| [OllisGit/OctoPrint-MaintenanceManager](https://github.com/OllisGit/OctoPrint-MaintenanceManager) | ~12 | >12 meses | GPL-3.0 | Python/JS | Horas y desgaste por componente | Difícil |

#### Mantenimiento preventivo e inventario CMMS

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [inventree/InvenTree](https://github.com/inventree/inventree) | ~7.7k | < 1 semana | MIT | Python/Django | `part/models.py`, `stock/models.py`, mínimos y órdenes | Medio |
| [Donkie/Spoolman](https://github.com/Donkie/Spoolman) | ~2.9k | < 1 mes | MIT | Python/TS | Inventario y REST `spoolman/api/v1` | Fácil |
| [grashjs/cmms](https://github.com/grashjs/cmms) | ~800 | < 1 semana | PolyForm Noncommercial | TypeScript | Disparadores por horómetro y órdenes | Medio |
| [SuperCMMS/Open-Source-CMMS](https://github.com/SuperCMMS/Open-Source-CMMS) | <100 | < 12 meses | MIT | PHP/SQL | Repuestos, coste por máquina y mantenimiento | Difícil |
| [albanothing/MaCoPlA](https://github.com/albanothing/MaCoPlA) | <100 | < 6 meses | MIT | Python/PyQt | Registro y planificación preventiva | Difícil |

#### Compatibilidad de refacciones y perfiles cinemáticos

Gemini no encontró una ontología pública y relacional de compatibilidad cruzada. Propone aprovechar perfiles de slicers como fuente estructurada, no como catálogo comercial definitivo.

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [SoftFever/OrcaSlicer](https://github.com/SoftFever/OrcaSlicer) | ~12k | < 1 semana | AGPL-3.0 | C++/JSON | `resources/profiles` | Fácil |
| [bpuhnk/mcp-klipper-docs](https://github.com/bpuhnk/mcp-klipper-docs) | <100 | < 6 meses | MIT | TypeScript | Especificaciones de Klipper por MCP | Medio |
| [gibz104/SpoolmanSync](https://github.com/gibz104/SpoolmanSync) | <100 | < 2 meses | MIT | Python/YAML | Mapeo de tipos de extrusor y consumibles | Medio |
| [Disane87/spoolman-mcp](https://github.com/Disane87/spoolman-mcp) | <100 | < 4 meses | MIT | TypeScript | `tools/filaments.ts`, `tools/vendors.ts` | Fácil |
| [cbruiz/printhor](https://github.com/cbruiz/printhor) | ~200 | < 3 meses | MIT/Apache-2.0 | Rust | Límites térmicos | Difícil |

#### Visión por computadora

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | ~48k | < 1 semana | Apache-2.0 | Python | PP-OCRv5 para placas y etiquetas | Fácil |
| [TheSpaghettiDetective/obico-server](https://github.com/TheSpaghettiDetective/obico-server) | ~2.5k | < 1 mes | AGPL-3.0 | Python | Inferencia de vídeo y eventos visuales | Medio |
| [openvinotoolkit/anomalib](https://github.com/openvinotoolkit/anomalib) | ~4.5k | < 1 mes | Apache-2.0 | Python | PatchCore y PaDiM | Medio |
| [oliverbravery/PrintGuard](https://github.com/oliverbravery/PrintGuard) | ~340 | < 8 meses | MIT | Python | Detección en el borde | Fácil |
| [SebTC/FDM-Failure-Detection](https://github.com/SebTC/FDM-Failure-Detection) | <100 | < 10 meses | MIT | Python | PyTorch/YOLO por fotograma | Fácil |

#### Pagos agénticos, guardrails y políticas de gasto

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2) | ~3.2k | < 3 meses | Apache-2.0 | Python | Mandatos, topes y credenciales verificables | Medio |
| [stripe/ai](https://github.com/stripe/ai) | ~1.9k | < 1 semana | MIT | TS/Python | MCP, SPTs y compra controlada | Fácil |
| [skyfire-xyz/skyfire-solutions-demo](https://github.com/skyfire-xyz/skyfire-solutions-demo) | <100 | < 1 mes | MIT | TypeScript | Comercio MCP y KYAPay | Medio |
| [up2itnow0822/ap2-payment-handler](https://github.com/up2itnow0822/ap2-payment-handler) | <100 | < 3 meses | MIT | TypeScript | Verificación no custodial de topes | Fácil |
| [paymanai/genie-mcp-stdio](https://github.com/paymanai/genie-mcp-stdio) | <100 | < 1 mes | MIT | TypeScript | Puente local para Payman | Fácil |

#### Catálogos Shopify sin API key

| Repo | Estrellas | Actividad | Licencia | Lenguaje | Reutilizable | Integración |
|---|---:|---|---|---|---|---|
| [practical-data-science/ShopifyScraper](https://github.com/practical-data-science/ShopifyScraper) | ~150 | < 12 meses | MIT | Python | `scraper.py`, `extract.py`, `/products.json` | Fácil |
| [frappe/erpnext_shopify](https://github.com/frappe/erpnext_shopify) | ~200 | < 1 mes | GPL-3.0 | Python | `shopify_requests.py` | Medio |
| [kevmaindev/Shopify-Products-Scraper](https://github.com/kevmaindev/Shopify-Products-Scraper) | <100 | < 6 meses | MIT | Python | `variant_id`, precio y carrito | Fácil |
| [HasData/auto-ecommerce-scraper](https://github.com/HasData/auto-ecommerce-scraper) | <100 | < 8 meses | MIT | Python | Detección Shopify y Schema.org | Fácil |
| [prosoralex/shopify-store-catalog-scraper-apify-actor](https://github.com/prosoralex/shopify-store-catalog-scraper-apify-actor) | <100 | < 10 meses | Apache-2.0 | JavaScript | Catálogo y rate limiting | Medio |

Gemini reporta que `/products.json?page=1&limit=250` puede exponer productos, variantes y precios; `/cart/{variant_id}:{cantidad}` carga un carrito. No encontró un `countries.json` público. Propone consultar `GET /cart/shipping_rates.json?shipping_address[country]=...` para comprobar cobertura de destino antes de una compra.

### 2. Competencia

| Producto | ¿Compra refacciones sola? | ¿Visión? | ¿La máquina inicia? | ¿Pagos con agentes? | Enlace |
|---|---|---|---|---|---|
| Obico | No | Sí, fallos de impresión | No | No | [obico.io](https://obico.io) |
| SimplyPrint | No, deduce stock local | Sí, supervisión multicámara | No | No | [simplyprint.io](https://simplyprint.io) |
| 3DPrinterOS | No | Sí, monitorización de capas | No | No | [3dprinteros.com](https://www.3dprinteros.com) |
| Printago | No, avisa por horas | No, vídeo básico | No | No | [printago.io](https://printago.io/) |
| AutoFarm3D | No | Sí, QuinlyVision | No | No | [3DQue](https://www.3dque.com/autofarm3d-free-download) |
| Bambu Farm Manager | No | Sí | No | No | [Bambu Lab](https://bambulab.com/en/support) |
| MaintainX | No, borradores PO | No | No | No | [MaintainX](https://www.getmaintainx.com/use-cases/heavy-equipment-maintenance-software) |
| UpKeep | No, alerta reorden | No | No | No | [UpKeep](https://www.onupkeep.com) |
| Fiix | No, sincroniza con ERP | No | No | No | [Fiix](https://www.fiixsoftware.com) |
| Limble | No, alerta reabastecimiento | No | No | No | [Limble](https://limblecmms.com) |

### 3. Precedente del ciclo completo

**Resultado de Gemini: no encontrado.** Las soluciones de granja automatizan archivos, monitoreo y expulsión; los CMMS llegan a órdenes de compra o alertas, no a liquidación autónoma; los pagos agénticos aparecen limitados a comercio digital o pruebas.

### 4. Hallazgos críticos para el diseño

1. El cliente MCP no debe ejecutar I/O bloqueante en Klipper: usar Moonraker o un puente en el host.
2. La compatibilidad debe verificarse con esquemas y reglas deterministas compilados desde perfiles técnicos, no con inferencia de lenguaje.
3. El comercio autónomo debería usar mandatos firmados, límites y credenciales de un solo uso; el checkout genérico de Shopify enfrenta protecciones antibot.

### 5. Elementos buscados y no encontrados

- Una base abierta y estructurada para compatibilidad mecánica cruzada de hotends, boquillas y componentes.
- Un cliente MCP nativo de Klipper iniciado por macros o G-Code.
- Modelos/datasets abiertos para degradación mecánica de PTFE, arneses y carros de impresoras.
- Un endpoint Shopify público y estático que liste destinos de envío globales.

## Inventario completo de fuentes expuestas

Las URL se deduplicaron. Los roles reflejan exclusivamente etiquetas y presencia visibles en Gemini. **Citado** significa que apareció en “Sources used in the report”; **leído no citado** que apareció en “Sources read but not used in the report”; **actividad** que apareció además dentro de “Thoughts”.

### Citadas

| Título | Dominio | Enlace | Rol |
|---|---|---|---|
| Moonraker configuration | github.com | [enlace](https://github.com/Arksine/moonraker/blob/master/docs/configuration.md) | citado, actividad |
| Moonraker notification issue | github.com | [enlace](https://github.com/Arksine/moonraker/issues/30) | citado, actividad |
| klipper-mcp | github.com | [enlace](https://github.com/Charleslotto/klipper-mcp) | citado, actividad |
| KlipperClaudeMCP | github.com | [enlace](https://github.com/mikehatch/KlipperClaudeMCP) | citado, actividad |
| Klipper Macro Scheduler | github.com | [enlace](https://github.com/darkoperator/Klipper-Macro-Scheduler) | citado, actividad |
| OctoPrint MaintenanceManager | github.com | [enlace](https://github.com/OllisGit/OctoPrint-MaintenanceManager) | citado, actividad |
| Spoolman (pdrd) | github.com | [enlace](https://github.com/pdrd/spoolman) | citado, actividad |
| Spoolman (Donkie) | github.com | [enlace](https://github.com/Donkie/Spoolman) | citado, actividad |
| InvenTree | github.com | [enlace](https://github.com/inventree/inventree) | citado, actividad |
| InvenTree Python | github.com | [enlace](https://github.com/inventree/inventree-python) | citado, actividad |
| Atlas CMMS | github.com | [enlace](https://github.com/grashjs/cmms) | citado, actividad |
| SuperCMMS | github.com | [enlace](https://github.com/SuperCMMS/Open-Source-CMMS) | citado, actividad |
| MaCoPlA | github.com | [enlace](https://github.com/albanothing/MaCoPlA) | citado, actividad |
| OrcaSlicer profile guide | github.com | [enlace](https://github.com/orcaslicer/orcaslicer/wiki/how_to_create_profiles) | citado, actividad |
| OrcaSlicer Voron profile | github.com | [enlace](https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles/Voron/machine/Voron%202.4%20350.json) | citado, actividad |
| mcp-klipper-docs | github.com | [enlace](https://github.com/bpuhnk/mcp-klipper-docs) | citado, actividad |
| SpoolmanSync | github.com | [enlace](https://github.com/gibz104/SpoolmanSync/blob/main/README.md) | citado, actividad |
| spoolman-mcp | github.com | [enlace](https://github.com/Disane87/spoolman-mcp) | citado, actividad |
| Printhor | github.com | [enlace](https://github.com/cbruiz/printhor) | citado, actividad |
| FDM Failure Detection | github.com | [enlace](https://github.com/SebTC/FDM-Failure-Detection) | citado, actividad |
| AP2 payment-handler | github.com | [enlace](https://github.com/up2itnow0822/ap2-payment-handler) | citado, actividad |
| Google Agentic Commerce | github.com | [enlace](https://github.com/google-agentic-commerce) | citado, actividad |
| Stripe AI / Agent Toolkit | github.com | [enlace](https://github.com/stripe/agent-toolkit) | citado, actividad |
| Skyfire demo | github.com | [enlace](https://github.com/skyfire-xyz/skyfire-solutions-demo) | citado, actividad |
| ShopifyScraper | github.com | [enlace](https://github.com/practical-data-science/ShopifyScraper) | citado, actividad |
| ERPNext Shopify request code | github.com | [enlace](https://github.com/frappe/erpnext_shopify/blob/develop/erpnext_shopify/shopify_requests.py) | citado, actividad |
| Shopify Products Scraper | github.com | [enlace](https://github.com/kevmaindev/Shopify-Products-Scraper) | citado, actividad |
| HasData scraper | github.com | [enlace](https://github.com/HasData/auto-ecommerce-scraper) | citado, actividad |
| Shopify catalog scraper actor | github.com | [enlace](https://github.com/prosoralex/shopify-store-catalog-scraper-apify-actor) | citado, actividad |
| SimplyPrint maintenance docs | help.simplyprint.io | [enlace](https://help.simplyprint.io/en/article/maintenance-jobs-scheduling-and-completing-printer-maintenance-gu6vev/) | citado, actividad |
| Printago | printago.io | [enlace](https://printago.io/) | citado, actividad |
| AutoFarm3D | 3dque.com | [enlace](https://www.3dque.com/autofarm3d-free-download) | citado, actividad |
| Bambu Lab support | bambulab.com | [enlace](https://bambulab.com/en/support) | citado, actividad |
| MaintainX heavy equipment | getmaintainx.com | [enlace](https://www.getmaintainx.com/use-cases/heavy-equipment-maintenance-software) | citado, actividad |

### Leídas pero no citadas

| Título | Dominio | Enlace | Rol |
|---|---|---|---|
| klipper_estimator | github.com | [enlace](https://github.com/Annex-Engineering/klipper_estimator) | leído no citado, actividad |
| Moonraker print-time discussion | github.com | [enlace](https://github.com/Arksine/moonraker/discussions/52) | leído no citado, actividad |
| Moonraker monitoring card | github.com | [enlace](https://github.com/GrzegorzRussek/ha-moonraker-printer-monitoring-card) | leído no citado, actividad |
| Happy-Hare history issue | github.com | [enlace](https://github.com/moggieuk/Happy-Hare/issues/487) | leído no citado, actividad |
| Voyager UI | github.com | [enlace](https://github.com/ozancs/voyager-ui) | leído no citado, actividad |
| OctoPrint Cost Estimation | github.com | [enlace](https://github.com/malnvenshorn/OctoPrint-CostEstimation) | leído no citado, actividad |
| OctoPrint TempETA | github.com | [enlace](https://github.com/Ajimaru/OctoPrint-TempETA) | leído no citado, actividad |
| OctoPrint Growl | github.com | [enlace](https://github.com/OctoPrint/OctoPrint-Growl) | leído no citado, actividad |
| OctoPrint CuraEngine | github.com | [enlace](https://github.com/OctoPrint/OctoPrint-CuraEngine) | leído no citado, actividad |
| Moonraker Websocket Notifier | github.com | [enlace](https://github.com/prairielandelec/Moonraker-Websocket-Notifier) | leído no citado, actividad |
| KeepADA | github.com | [enlace](https://github.com/adacreativeco/KeepADA) | leído no citado, actividad |
| MCP-KLIPPER license | github.com | [enlace](https://github.com/LauOtero/MCP-KLIPPER/blob/main/LICENSE) | leído no citado, actividad |
| Active Spool integration | github.com | [enlace](https://github.com/metaathron/ha-spoolman-active) | leído no citado, actividad |
| Settlegrid | github.com | [enlace](https://github.com/lexwhiting/settlegrid) | leído no citado, actividad |
| AP2 announcement | cloud.google.com | [enlace](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) | leído no citado, actividad |
| AP2Java | github.com | [enlace](https://github.com/vishalmysore/ap2java) | leído no citado, actividad |
| Agent Payments Protocol | github.com | [enlace](https://github.com/TimeWarpEngineering/agents-payments-protocol) | leído no citado, actividad |
| Agentic Commerce Protocol | github.com | [enlace](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) | leído no citado, actividad |
| Magento agentic-commerce module | github.com | [enlace](https://github.com/magebitcom/magento2-agentic-commerce-module) | leído no citado, actividad |
| Vercel ACP handler | github.com | [enlace](https://github.com/vercel/acp-handler) | leído no citado, actividad |
| PrintGuard alternative | github.com | [enlace](https://github.com/odhithSen/PrintGuard) | leído no citado, actividad |
| Bambu filament status | github.com | [enlace](https://github.com/atownsend247/spoolman-bambu-filament-status) | leído no citado, actividad |
| Text Extraction Project | github.com | [enlace](https://github.com/Aaryan2304/Text-Extraction-Project) | leído no citado, actividad |
| SimplyPrint App Store | apps.apple.com | [enlace](https://apps.apple.com/hn/app/simplyprint-3d-printing/id1519749400) | leído no citado, actividad |
| MaintainX purchase-order docs | help.getmaintainx.com | [enlace](https://help.getmaintainx.com/purchase-order-settings) | leído no citado, actividad |
| Printago launch discussion | reddit.com | [enlace](https://www.reddit.com/r/BambuLab/comments/1kzaflx/introducing_printago_free_bambu_lab_farm_software/) | leído no citado, actividad |
| Shopify cart discussion | github.com | [enlace](https://github.com/Shopify/storefront-api-feedback/discussions/225) | leído no citado, actividad |
| FilamentDB | github.com | [enlace](https://github.com/treycausey/FilamentDB) | leído no citado, actividad |
| PaddleOCR/YOLO extraction example | github.com | [enlace](https://github.com/Aaryan2304/Text-Extraction-Project) | leído no citado, actividad |

### Contexto de actividad visible

Gemini vinculó explícitamente la actividad de Moonraker/OctoPrint con telemetría y eventos, InvenTree/Atlas con puntos de reorden y coste por activo, AP2/Stripe/Skyfire con mandatos y límites de gasto, y los perfiles OrcaSlicer con datos técnicos para un verificador determinista. No mostró criterios internos de selección ni razonamiento privado.

## Nota de extracción y límites

- Gemini expuso el informe, una lista de fuentes usadas, una lista de fuentes leídas pero no usadas y actividad resumida. No expuso un mapeo cita-a-afirmación ni su razonamiento privado.
- El panel mostraba muchas fuentes auxiliares repetidas entre actividad y la lista de no usadas. Se conservaron los enlaces distintos más identificables y sus roles visibles; los listados de GitHub Topics, perfiles, incidencias y vídeos auxiliares adicionales no aportaban una relación directa con una afirmación del informe y no se reconstruyeron cuando Gemini no mostró título completo o contexto de selección.
- Los nombres de repositorio citados en las tablas de Gemini se mantuvieron aunque algunos enlaces de la sección de fuentes apuntaban a documentación, incidencias o perfiles en vez de al repositorio raíz.
