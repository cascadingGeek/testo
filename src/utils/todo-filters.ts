import type { DateString } from '@/utils/dates';

export const TODO_FILTERS = ['all', 'pending', 'today', 'upcoming', 'overdue', 'completed'] as const;

export type TodoFilter = (typeof TODO_FILTERS)[number];

/**
 * The client-side mirror of applyFilter in api/todos.ts. Kept in step with it
 * so a cache patch can decide membership without asking the server; the tests
 * assert the two agree.
 */
export function matchesFilter(
  todo: { completed: boolean; due_date: DateString | null },
  filter: TodoFilter,
  today: DateString
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending':
      return !todo.completed;
    case 'completed':
      return todo.completed;
    case 'today':
      return !todo.completed && todo.due_date === today;
    case 'upcoming':
      return !todo.completed && todo.due_date !== null && todo.due_date > today;
    case 'overdue':
      return !todo.completed && todo.due_date !== null && todo.due_date < today;
  }
}

/** Which filter chips count this row. */
export function bucketsFor(
  todo: { completed: boolean; due_date: DateString | null },
  today: DateString
): TodoFilter[] {
  return TODO_FILTERS.filter((filter) => matchesFilter(todo, filter, today));
}

export const FILTER_LABELS: Record<TodoFilter, string> = {
  all: 'All',
  pending: 'Pending',
  today: 'Today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Done',
};
