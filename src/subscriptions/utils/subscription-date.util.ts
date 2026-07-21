export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function clampSubscriptionDay(paymentDay: number, daysInMonth: number): number {
  return Math.min(paymentDay, daysInMonth);
}
