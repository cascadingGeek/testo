/**
 * Local calendar day, not UTC. `toISOString().slice(0, 10)` would roll the
 * date over for anyone whose offset crosses midnight before UTC does.
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

export function addDaysString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** `new Date('2026-08-20')` parses as UTC midnight; build it locally instead. */
function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** ISO dates are zero-padded, so string order is chronological order. */
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
