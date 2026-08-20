import type { TodoSort } from '@/features/todos/todo-view-store';
import { isOverdue } from '@/lib/dates';
import type { Todo } from '@/types/todo';

export const TODO_FILTERS = ['all', 'today', 'upcoming', 'overdue', 'completed'] as const;

export type TodoFilter = (typeof TODO_FILTERS)[number];

export const FILTER_LABELS: Record<TodoFilter, string> = {
  all: 'All',
  today: 'Today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Done',
};

/**
 * Pure predicates, with `today` passed in rather than read from the clock.
 *
 * Two reasons: they can be unit tested without freezing time, and every todo
 * in one pass is compared against the same day boundary. Reading the clock
 * inside a loop that runs at 23:59:59.9 can classify two todos differently
 * in the same render.
 */
function matchesFilter(todo: Todo, filter: TodoFilter, today: string): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'completed':
      return todo.completed;
    case 'today':
      return !todo.completed && todo.due_date === today;
    case 'upcoming':
      return !todo.completed && todo.due_date !== null && todo.due_date > today;
    case 'overdue':
      return isOverdue(todo.due_date, todo.completed, today);
  }
}

function matchesQuery(todo: Todo, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  return (
    todo.title.toLowerCase().includes(needle) ||
    (todo.description?.toLowerCase().includes(needle) ?? false)
  );
}

export function selectTodos<TTodo extends Todo>(
  todos: TTodo[],
  filter: TodoFilter,
  query: string,
  today: string
): TTodo[] {
  return todos.filter((todo) => matchesFilter(todo, filter, today) && matchesQuery(todo, query));
}

/**
 * Counts ignore the search query on purpose: the chips describe the whole
 * list, so they must not shift around while the user is typing.
 */
export function countByFilter(todos: Todo[], today: string): Record<TodoFilter, number> {
  const counts = {} as Record<TodoFilter, number>;

  for (const filter of TODO_FILTERS) {
    counts[filter] = todos.filter((todo) => matchesFilter(todo, filter, today)).length;
  }

  return counts;
}

/** High first. Postgres enums have an order, but JSON gives us plain strings. */
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Todos with no due date sort last rather than first. */
function dueRank(dueDate: string | null): string {
  return dueDate ?? '9999-12-31';
}

export function sortTodos<TTodo extends Todo>(todos: TTodo[], sort: TodoSort): TTodo[] {
  // toSorted would be neater, but Hermes does not ship it yet. Copy first:
  // sorting the array in place would mutate the TanStack Query cache.
  const copy = [...todos];

  switch (sort) {
    case 'due_date':
      return copy.sort((a, b) => dueRank(a.due_date).localeCompare(dueRank(b.due_date)));
    case 'priority':
      return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'smart':
      // Unfinished work first, then by urgency, then oldest-created first.
      return copy.sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          dueRank(a.due_date).localeCompare(dueRank(b.due_date)) ||
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          a.created_at.localeCompare(b.created_at)
      );
  }
}
