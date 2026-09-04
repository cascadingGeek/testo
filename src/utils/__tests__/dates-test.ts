import {
  addDaysString,
  asDateString,
  asTimeString,
  formatDueDate,
  isOverdue,
  todayString,
  toLocalDate,
  toTimeString,
} from '@/utils/dates';

describe('todayString', () => {
  it('uses the local calendar day, not UTC', () => {
    // The bug this guards against: toISOString() converts to UTC first, so
    // late evening east of UTC (or early morning west of it) reports the
    // wrong day. Compare against locally-derived parts.
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    expect(todayString()).toBe(expected);
  });
});

describe('addDaysString', () => {
  it('rolls over months', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 31, 12));
    expect(addDaysString(1)).toBe('2026-02-01');
    jest.useRealTimers();
  });

  it('rolls over years', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 11, 31, 12));
    expect(addDaysString(1)).toBe('2027-01-01');
    jest.useRealTimers();
  });

  it('goes backwards', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 1, 12));
    expect(addDaysString(-1)).toBe('2026-02-28');
    jest.useRealTimers();
  });
});

describe('isOverdue', () => {
  const today = asDateString('2026-08-20');

  it('is false when there is no due date', () => {
    expect(isOverdue(null, false, today)).toBe(false);
  });

  it('is false for a completed todo, however old', () => {
    expect(isOverdue(asDateString('2020-01-01'), true, today)).toBe(false);
  });

  it('is false on the due date itself', () => {
    expect(isOverdue(today, false, today)).toBe(false);
  });

  it('is true the day after', () => {
    expect(isOverdue(asDateString('2026-08-19'), false, today)).toBe(true);
  });

  it('compares chronologically across month and year boundaries', () => {
    // String comparison is only valid because the format is fixed-width and
    // big-endian. These are the cases that would break if it were not.
    expect(isOverdue(asDateString('2026-07-31'), false, asDateString('2026-08-01'))).toBe(true);
    expect(isOverdue(asDateString('2025-12-31'), false, asDateString('2026-01-01'))).toBe(true);
    expect(isOverdue(asDateString('2026-08-09'), false, asDateString('2026-08-10'))).toBe(true);
    expect(isOverdue(asDateString('2026-08-10'), false, asDateString('2026-08-09'))).toBe(false);
  });
});

describe('formatDueDate', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(2026, 7, 20, 12)));
  afterEach(() => jest.useRealTimers());

  it('names the days around today', () => {
    expect(formatDueDate(asDateString('2026-08-20'))).toBe('Today');
    expect(formatDueDate(asDateString('2026-08-21'))).toBe('Tomorrow');
    expect(formatDueDate(asDateString('2026-08-19'))).toBe('Yesterday');
  });

  it('does not shift the date when formatting', () => {
    // new Date('2026-08-25') would parse as UTC midnight and render as the
    // 24th in any negative offset.
    expect(formatDueDate(asDateString('2026-08-25'))).toContain('25');
  });
});

describe('asDateString', () => {
  it('accepts a well-formed calendar date', () => {
    expect(asDateString('2026-08-20')).toBe('2026-08-20');
  });

  it('rejects anything the format guarantee would not hold for', () => {
    // These are exactly the inputs that would break `a < b` ordering.
    expect(() => asDateString('2026-8-20')).toThrow();
    expect(() => asDateString('20/08/2026')).toThrow();
    expect(() => asDateString('2026-08-20T10:00:00Z')).toThrow();
    expect(() => asDateString('')).toThrow();
  });
});

describe('asTimeString', () => {
  it('accepts HH:MM', () => {
    expect(asTimeString('09:30')).toBe('09:30');
  });

  it("trims Postgres's seconds, which is how a `time` column comes back", () => {
    expect(asTimeString('09:30:00')).toBe('09:30');
  });

  it('rejects anything that is not a real time of day', () => {
    expect(() => asTimeString('24:00')).toThrow();
    expect(() => asTimeString('09:60')).toThrow();
    expect(() => asTimeString('9:30')).toThrow();
    expect(() => asTimeString('')).toThrow();
  });

  it('orders lexicographically, which is why the brand is worth having', () => {
    const times = ['21:00', '09:05', '13:30'].map(asTimeString).sort();
    expect(times).toEqual(['09:05', '13:30', '21:00']);
  });
});

describe('toTimeString', () => {
  it('pads both halves', () => {
    expect(toTimeString(9, 5)).toBe('09:05');
  });

  it('clamps out-of-range input rather than producing an invalid time', () => {
    expect(toTimeString(25, 70)).toBe('23:59');
    expect(toTimeString(-1, -1)).toBe('00:00');
  });
});

describe('toLocalDate', () => {
  it('builds the local moment, never UTC midnight', () => {
    const result = toLocalDate(asDateString('2026-08-20'), asTimeString('09:30'));

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('falls back to local midnight with no time', () => {
    const result = toLocalDate(asDateString('2026-08-20'), null);

    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(0);
  });
});
