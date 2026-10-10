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
