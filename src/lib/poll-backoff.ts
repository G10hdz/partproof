// Cadencia con la que la UI consulta el estado del pago: crece hasta 30 s. Si el proveedor
// manda Retry-After, ese tiempo manda sobre el paso (tope de sanidad: 60 s).
const STEPS = [2_000, 5_000, 10_000, 30_000];
const MAX_DELAY = 60_000;

export function pollDelay(step: number, retryAfterMs?: number): number {
  const base = STEPS[Math.min(Math.max(0, step), STEPS.length - 1)];
  return Math.min(MAX_DELAY, Math.max(base, retryAfterMs ?? 0));
}
