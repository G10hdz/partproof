# PartProof

PartProof es una demo para granjas de impresión 3D. Una impresora pide su refacción con evidencia. Un gate determinista decide si la compra sigue. El pago pasa por el sandbox de Reap.

La empresa de ejemplo es Forja3D, con plantas en Guadalajara y Toronto.

## Cómo correrlo

```bash
npm ci
cp .env.example .env.local
npm run dev
```

La app escucha en http://127.0.0.1:3000. Sin llaves responde un servidor en memoria con montos reales del sandbox.

Backend real (SQLite, gate, MCP, visión en replay y pago mock):

```bash
BACKEND=real DEMO_MODE=1 npm run dev
```

Con Reap sandbox: llenar `REAP_API_KEY` y `REAP_ENROLLMENT_ID` en `.env.local` y agregar `PAYMENT_PROVIDER=reap`.

Verificación (lo mismo que corre CI):

```bash
npm run typecheck
npm test
npm run build
```

## Estado

Conectado: servidor MCP con token por máquina, gate en dos fases, visión (replay grabado con MiniMax M3 por OpenRouter), pago con Reap sandbox, SQLite y Server Actions. Guía para la UI: [06b](docs/superpowers/tasks/06b-a5-ui-sobre-backend.md).

Simulado: el agente de Klipper (`tools/klipper-agent.ts`) y las horas de las máquinas. Las placas de `demo/photos` son imágenes preparadas, no fotos reales.

El texto del formulario y el guion de 3 minutos están en `docs/submission/`.

## Wireframe HTML

`public/wireframe/index.html`: nueve pantallas, tres composiciones por pantalla, comparación A/B/C, vista móvil y navegación del recorrido. Captura, aprobación, pago y ajustes son simulados. Los esquemas de equipos y piezas no constituyen evidencia.

```bash
python3 -m http.server 4318 --bind 127.0.0.1 --directory public/wireframe
# Abrir http://127.0.0.1:4318
node scripts/wireframe.test.mjs
```

También se sirve desde `/wireframe/index.html` con `npm run dev`. No abrir con `file://`: el navegador necesita servir el módulo JavaScript por HTTP.

Diseño elegido: **C en todas las pantallas**. Entrega a los seis agentes: `/wireframe/agents.html?agent=1` con Next.js, o `http://127.0.0.1:4318/agents.html?agent=1` con el servidor anterior. Cambiar `agent=1..6` o usar el selector; cada responsable ve sus pantallas relevantes, entregable y criterio de aceptación. A/B quedan archivadas en el comparador. Guía: [handoff C](docs/superpowers/specs/2026-10-09-option-c-agent-handoff.md).
