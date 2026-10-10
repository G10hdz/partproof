# A4: visión

**Máquina:** M2 · **Rama:** `feat/a4-vision` · **Empieza en:** C0 · **Desbloquea:** C1

## Misión

Leer la placa de la impresora y el daño visible en una foto, con salida estructurada. No promete detectar desgaste. Sin API, la demo sigue con resultados guardados.

## Rutas que posee

`src/lib/vision/*`, `src/app/api/vision/analyze/route.ts`, `demo/photos/*`, `demo/replay.json`, `tests/vision.test.ts`, `tests/vision-route.test.ts`.

## Tareas

Código y pruebas exactas: Plan, "Workstream A4".

- [ ] **A4.1 Esquema, repetición y análisis.** `parseVision` (zod), `lookupReplay` por hash de imagen, `analyzeWith` (llamada a `claude-sonnet-5-5` con herramienta forzada `report_plate`), `analyzeImage` con respaldo a repetición, `getVisionMode`. 5 pruebas con cliente falso.
  - El prompt trata el texto de la imagen como dato, nunca como instrucción.
- [ ] **Fotos de demostración.** Guardar en `demo/photos/`: `plate_p1.jpg` a `plate_p4.jpg` (placa legible con el modelo exacto de la semilla), `damage_cable.jpg`, `unclear.jpg` (borrosa). Generar `demo/replay.json` con llamadas reales (script en el plan, A4.1 paso 6) y revisar a ojo que cada placa lea `Original Prusa MK4S`, `Original Prusa MK3S`, `Original Prusa MK3S+`, `Creality K1`. Si no, retomar la foto.
- [ ] **A4.2 Ruta de análisis.** `POST /api/vision/analyze` (multipart), `storeVision`, `needsConfirmation` (confianza menor a 0.7 o modelo ausente). 2 pruebas. Push y aviso: "A4 listo para merge".

## Consume

`VisionResult` y la tabla `photo` de Task 0; `getDb`.

## Produce

```ts
analyzeImage(bytes: Buffer, mediaType: string): Promise<VisionResult>
getVisionMode(): 'live' | 'replay'
storeVision(db, machineId, result): string      // photo_id
needsConfirmation(result): boolean
POST /api/vision/analyze  -> { photo_id, result, needs_confirmation, mode }
```

A5 (`CaptureForm`) y A6 (`advance`, `inject`) usan el `photo_id`.

## Terminado cuando

- 7 pruebas verdes y `tsc` limpio.
- Con `VISION_MODE=replay` y sin red, las 6 fotos de ejemplo devuelven su resultado guardado.
- Una foto desconocida en modo repetición falla con un mensaje claro (no inventa).

## Notas

(Calidad de lectura de las placas reales, desvíos.)
