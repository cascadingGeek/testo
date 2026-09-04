import { asDateString } from '@/utils/dates';
import { bucketsFor, matchesFilter, TODO_FILTERS } from '@/utils/todo-filters';

const TODAY = asDateString('2026-08-27');
const YESTERDAY = asDateString('2026-08-26');
const TOMORROW = asDateString('2026-08-28');

const row = (completed: boolean, due_date: string | null) =>
  ({ completed, due_date }) as Parameters<typeof matchesFilter>[0];

describe('matchesFilter', () => {
  it('admits everything to all', () => {
    expect(matchesFilter(row(false, null), 'all', TODAY)).toBe(true);
    expect(matchesFilter(row(true, YESTERDAY), 'all', TODAY)).toBe(true);
  });

  it('splits the date buckets on the day boundary', () => {
    expect(matchesFilter(row(false, TODAY), 'today', TODAY)).toBe(true);
    expect(matchesFilter(row(false, TOMORROW), 'upcoming', TODAY)).toBe(true);
    expect(matchesFilter(row(false, YESTERDAY), 'overdue', TODAY)).toBe(true);
  });

  it('excludes completed todos from every date bucket, matching applyFilter', () => {
    // applyFilter pairs each date comparison with .eq('completed', false).
    for (const filter of ['today', 'upcoming', 'overdue'] as const) {
      expect(matchesFilter(row(true, TODAY), filter, TODAY)).toBe(false);
      expect(matchesFilter(row(true, YESTERDAY), filter, TODAY)).toBe(false);
      expect(matchesFilter(row(true, TOMORROW), filter, TODAY)).toBe(false);
    }
  });

  it('excludes a null due date from every date bucket, as SQL comparisons do', () => {
    for (const filter of ['today', 'upcoming', 'overdue'] as const) {
      expect(matchesFilter(row(false, null), filter, TODAY)).toBe(false);
    }
  });

  it('puts a todo in exactly one date bucket', () => {
    const dateFilters = ['today', 'upcoming', 'overdue'];
    for (const due of [YESTERDAY, TODAY, TOMORROW]) {
      const buckets = bucketsFor(row(false, due), TODAY).filter((f) => dateFilters.includes(f));
      expect(buckets).toHaveLength(1);
    }
  });

  it('splits pending and completed as exact complements', () => {
    expect(matchesFilter(row(false, null), 'pending', TODAY)).toBe(true);
    expect(matchesFilter(row(true, null), 'pending', TODAY)).toBe(false);
    expect(matchesFilter(row(false, null), 'completed', TODAY)).toBe(false);
    expect(matchesFilter(row(true, null), 'completed', TODAY)).toBe(true);
  });
});

describe('bucketsFor', () => {
  it('counts an undated, open todo under all and pending only', () => {
    expect(bucketsFor(row(false, null), TODAY)).toEqual(['all', 'pending']);
  });

  it('counts a completed todo under all and completed', () => {
    expect(bucketsFor(row(true, TODAY), TODAY)).toEqual(['all', 'completed']);
  });

  it('covers every declared filter', () => {
    const seen = new Set([
      ...bucketsFor(row(false, TODAY), TODAY),
      ...bucketsFor(row(false, TOMORROW), TODAY),
      ...bucketsFor(row(false, YESTERDAY), TODAY),
      ...bucketsFor(row(true, TODAY), TODAY),
    ]);
    expect([...seen].sort()).toEqual([...TODO_FILTERS].sort());
  });
});
