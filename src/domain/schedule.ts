// Fechas de compras programadas mensuales. Puro; todo en UTC.
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export function monthlyRunAfter(nextRun: string, anchorDay: number, now: Date): string {
  const start = new Date(nextRun);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  let next = start;
  while (next.getTime() <= now.getTime()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    next = new Date(Date.UTC(year, month, Math.min(anchorDay, daysIn(year, month)), start.getUTCHours(), start.getUTCMinutes()));
  }
  return next.toISOString();
}
