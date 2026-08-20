/**
 * Formats a Date as YYYY-MM-DD in the device's LOCAL calendar.
 *
 * Deliberately NOT `date.toISOString().slice(0, 10)`, which is the obvious
 * one-liner and is wrong: toISOString converts to UTC first. At 9pm in Lagos
 * (UTC+1) that is still today, but in Los Angeles (UTC-7) at 6pm it has
 * already rolled over. `due_date` is a plain calendar date with no timezone,
 * so it has to be computed in the calendar the user is actually living in.
 */
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

/** Today shifted by `days`. setDate handles month and year rollover for us. */
export function addDaysString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * Parses YYYY-MM-DD as a LOCAL date.
 *
 * `new Date('2026-08-20')` is specified to parse as UTC midnight, which in
 * any negative offset renders as the 19th. Passing the parts separately to
 * the constructor builds it in local time instead.
 */
function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * String comparison is safe here: ISO dates are zero-padded and
 * big-endian, so lexicographic order is chronological order.
 */
export function isOverdue(
  dueDate: string | null,
  completed: boolean,
  today: string = todayString()
): boolean {
  if (dueDate === null || completed) return false;
  return dueDate < today;
}

export function formatDueDate(dueDate: string): string {
  if (dueDate === todayString()) return 'Today';
  if (dueDate === addDaysString(1)) return 'Tomorrow';
  if (dueDate === addDaysString(-1)) return 'Yesterday';

  return parseDateString(dueDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
