# Presupuesto por mes y compras programadas

## Objetivo
Permitir (1) un presupuesto distinto para meses concretos y (2) programar la reposición de una pieza, una vez o cada mes. Nada se paga solo: una programación vencida crea una propuesta que una persona aprueba en Reap.

## Decisiones del usuario
- Al llegar la fecha se **crea una propuesta**; no hay pago automático (Reap no tiene mandates activos en sandbox).
- Recurrencia: **una vez o mensual**.
- Disparadores: **al abrir la app + botón** y **endpoint para cron externo**.
- Presupuesto: **base + excepciones por mes**.
- Foto de evidencia de lo programado: **placa registrada de la máquina** (`plate_photo_id`), indicada como tal en la propuesta.

## Presupuesto por mes
- `Company.budget_overrides: Record<'YYYY-MM', number>`; ausente equivale a `{}`.
- `budgetFor(company, now)` en `src/domain/gate.ts`: `overrides[mes UTC] ?? monthly_budget`. Lo usan la regla `budget` y `getLedger` (`monthly_budget` del `LedgerView` pasa a ser el del mes actual).
- `saveSettings` acepta `budget_overrides` opcional. Valida: clave `YYYY-MM` válida, monto finito ≥ 0, y `purchase_cap` ≤ presupuesto base y de cada excepción.
- UI en `/settings`: lista de excepciones (mes + monto) con agregar y quitar.

## Compras programadas
```ts
interface Schedule {
  id: string; machine_id: string; part_type: PartType;
  next_run: string;            // ISO UTC
  repeat: 'once' | 'monthly';
  active: boolean;
  last_run: string | null;
  last_result: { status: 'proposed' | 'rejected' | 'skipped' | 'error'; proposal_id: string | null; message: string } | null;
}
```
- Tabla `schedule (id TEXT PRIMARY KEY, data TEXT NOT NULL)`, mismo formato JSON que las demás.
- `runDueSchedules(now): Promise<Schedule[]>` en el workflow. Por cada programación activa con `next_run <= now`:
  1. En una transacción: si `once`, `active=false`; si `monthly`, `next_run` avanza meses (recortando al último día del mes) hasta quedar `> now`. Una sola propuesta aunque falten varios meses.
  2. Llama a `createProposal` con `photo_id = plate_photo_id` y las horas actuales del stock; pasa por gate A y B y la cotización de Reap.
  3. Guarda `last_run` y `last_result`. Si ya hay propuesta abierta de esa máquina y pieza (índice `proposal_open`), `skipped`; si algo lanza, `error` con el mensaje.
- La reserva del paso 1 ocurre antes de cotizar, así que dos ejecuciones simultáneas no duplican.
- Contrato: `PartProofServer` suma `listSchedules`, `createSchedule`, `cancelSchedule`, `runDueSchedules`. `fake-server` y `real-server` los implementan.

## Disparadores
- Server Action `runSchedules` desde un componente cliente que se ejecuta una vez por sesión (`sessionStorage`) y desde el botón "Ejecutar programadas ahora". No se ejecuta al renderizar.
- `POST /api/cron/schedules`: exige `Authorization: Bearer $CRON_SECRET`; sin la variable definida, siempre 401.

## UI
- `/schedules` en la navegación: lista con último resultado y enlace a la propuesta, formulario (máquina, pieza, fecha, "repetir cada mes"), cancelar y ejecutar ahora.
- Fecha mínima: hoy. Pieza limitada a las del stock de la máquina.

## Pruebas
- Gate: presupuesto con excepción gana a la base; mes sin excepción usa la base.
- Fechas: 31 ene → 28 feb; saltar meses perdidos crea una propuesta.
- Idempotencia: dos ejecuciones seguidas no duplican; propuesta abierta da `skipped`.
- Cron: sin secreto o con secreto incorrecto responde 401.
- `saveSettings` rechaza claves de mes inválidas y tope mayor que el presupuesto.

## Fuera de alcance
Pago automático, intervalos libres, calendario de varios años, notificaciones.
