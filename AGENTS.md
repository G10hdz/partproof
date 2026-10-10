# Artifacts

- Cada artifact nuevo o actualizado se guarda en el repositorio y se commitea automáticamente después de verificarlo. Esta acción está autorizada por el usuario; no pedir confirmación por cada commit.
- Stage solo los archivos del artifact y los cambios necesarios para integrarlo. No incluir cambios ajenos, secretos, bases de datos ni outputs de build. No hacer push automáticamente.
- Mockup de PartProof: wireframe HTML con tres opciones de composición por pantalla; primero definir elementos de UI. Referencias y recorrido en `docs/superpowers/specs/2026-10-09-interface-mockup.md`.
- Decisión del usuario: implementar la opción C en todas las pantallas. A/B quedan como exploración archivada. Los seis agentes usan `public/wireframe/agents.html` y el plan como referencia de entrega; las anotaciones de agentes no son parte de la UI del producto.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
