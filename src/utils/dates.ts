declare const dateStringBrand: unique symbol;

/**
 * A calendar date as YYYY-MM-DD, with no time and no timezone.
 *
 * The brand is what makes `a < b` provably a chronological comparison rather
 * than a convention we hope holds: the format is fixed-width and big-endian,
 * so lexicographic order IS date order — but only for strings that really are
 * in this format. Values enter through this module or through asDateString.
 */
export type DateString = string & { readonly [dateStringBrand]: true };

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): value is DateString {
  return DATE_STRING_PATTERN.test(value);
}

/** Use at boundaries where a plain string is known to be a calendar date. */
export function asDateString(value: string): DateString {
  if (!isDateString(value)) {
    throw new Error(`Expected a YYYY-MM-DD date, received "${value}".`);
  }
  return value;
}

/**
 * Local calendar day, not UTC. `toISOString().slice(0, 10)` would roll the
 * date over for anyone whose offset crosses midnight before UTC does.
 */
function toDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateString;
}

export function todayString(): DateString {
  return toDateString(new Date());
}

export function addDaysString(days: number): DateString {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** `new Date('2026-08-20')` parses as UTC midnight; build it locally instead. */
function parseDateString(value: DateString): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isOverdue(
  dueDate: DateString | null,
  completed: boolean,
  today: DateString = todayString()
): boolean {
  if (dueDate === null || completed) return false;
  return dueDate < today;
}

export function formatDueDate(dueDate: DateString): string {
  if (dueDate === todayString()) return 'Today';
  if (dueDate === addDaysString(1)) return 'Tomorrow';
  if (dueDate === addDaysString(-1)) return 'Yesterday';

  return parseDateString(dueDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

declare const timeStringBrand: unique symbol;

/**
 * A wall-clock time of day as HH:MM, 24-hour, with no date and no timezone.
 *
 * Branded for the same reason DateString is: fixed-width and big-endian means
 * lexicographic order is chronological order, but only for strings genuinely
 * in this shape. Postgres `time` serialises as HH:MM:SS, so values arriving
 * from the API go through asTimeString, which trims the seconds.
 */
export type TimeString = string & { readonly [timeStringBrand]: true };

const TIME_STRING_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeString(value: string): value is TimeString {
  return TIME_STRING_PATTERN.test(value);
}

/** Accepts HH:MM or Postgres's HH:MM:SS, and returns HH:MM. */
export function asTimeString(value: string): TimeString {
  const trimmed = value.slice(0, 5);
  if (!isTimeString(trimmed)) {
    throw new Error(`Expected an HH:MM time, received "${value}".`);
  }
  return trimmed;
}

export function toTimeString(hour: number, minute: number): TimeString {
  const clampedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const clampedMinute = Math.min(59, Math.max(0, Math.trunc(minute)));

  return `${String(clampedHour).padStart(2, '0')}:${String(clampedMinute).padStart(
    2,
    '0'
  )}` as TimeString;
}

export function timeParts(time: TimeString): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/**
 * The local Date a due date and time refer to. Built field by field rather
 * than parsed from a combined string, because `new Date('2026-08-20T09:00')`
 * is only local by convention and `...T09:00Z` is not local at all.
 */
export function toLocalDate(date: DateString, time: TimeString | null): Date {
  const [year, month, day] = date.split('-').map(Number);
  const { hour, minute } = time ? timeParts(time) : { hour: 0, minute: 0 };

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function formatTime(time: TimeString): string {
  const { hour, minute } = timeParts(time);
  const date = new Date(2000, 0, 1, hour, minute);

  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Days added to a given date, not to today. Used when planning ahead. */
export function addDaysTo(date: DateString, days: number): DateString {
  const shifted = parseDateString(date);
  shifted.setDate(shifted.getDate() + days);
  return toDateString(shifted);
}
