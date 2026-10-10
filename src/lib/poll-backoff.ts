// Cadencia con la que la UI consulta el estado del pago en el proveedor.
export function pollDelay(_step: number, _retryAfterMs?: number): number {
  return 2_000;
}
