# PartProof

Shell de demo para Forja3D MX. Datos de flota estáticos; pagos, visión, MCP y persistencia todavía sin integrar. Las insignias MOCK y REPETICIÓN indican el modo previsto para la demo, no integraciones funcionales.

```bash
npm ci
npm run dev
```

Base en [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation). Verificación:

```bash
npm run typecheck
npm run build
bash scripts/agents.test.sh
```

El [plan de seis agentes](docs/superpowers/plans/2026-10-09-partproof-six-agents.md) define contratos, propiedad de archivos, tres agentes en Mac y tres en Pop, checkpoints y transporte Git sin remote. Revisar y commitear la base antes de `bash scripts/agents.sh prepare mac` o `prepare pop`.

No hay compras ni credenciales incluidas. No se han iniciado agentes en Pop. `PARTPROOF_MODEL` permite elegir un modelo instalado; consultar `opencode models` en cada máquina.

## Wireframe HTML

`public/wireframe/index.html`: nueve pantallas, tres composiciones por pantalla, comparación A/B/C, vista móvil y navegación del recorrido. Captura, aprobación, pago y ajustes son simulados. Los esquemas de equipos y piezas no constituyen evidencia.

```bash
python3 -m http.server 4318 --bind 127.0.0.1 --directory public/wireframe
# Abrir http://127.0.0.1:4318
node scripts/wireframe.test.mjs
```

También se sirve desde `/wireframe/index.html` con `npm run dev`. No abrir con `file://`: el navegador necesita servir el módulo JavaScript por HTTP.

Diseño elegido: **C en todas las pantallas**. Entrega a los seis agentes: `/wireframe/agents.html?agent=1` con Next.js, o `http://127.0.0.1:4318/agents.html?agent=1` con el servidor anterior. Cambiar `agent=1..6` o usar el selector; cada responsable ve sus pantallas relevantes, entregable y criterio de aceptación. A/B quedan archivadas en el comparador. Guía: [handoff C](docs/superpowers/specs/2026-10-09-option-c-agent-handoff.md).
