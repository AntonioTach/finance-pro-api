/**
 * Date helpers shared by balance / corte calculations.
 *
 * Transactions store `date` as a timestamp at local 12:00 (see
 * TransactionsService.create), while cortes and transfers use DATEONLY
 * strings. These helpers translate a YYYY-MM-DD string into the local-time
 * boundaries used when comparing against transaction timestamps.
 */

/** Today's date as YYYY-MM-DD in the server's local timezone. */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Last instant of the given YYYY-MM-DD day, local time. */
export function endOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999`);
}
