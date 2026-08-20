import type { TodoSort } from '@/store/todo-view-store';
import { isOverdue } from '@/utils/dates';
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

/** `today` is passed in so every todo in a pass shares one day boundary. */
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

/** Counts ignore the query so the chips don't shift while typing. */
export function countByFilter(todos: Todo[], today: string): Record<TodoFilter, number> {
  const counts = {} as Record<TodoFilter, number>;

  for (const filter of TODO_FILTERS) {
    counts[filter] = todos.filter((todo) => matchesFilter(todo, filter, today)).length;
  }

  return counts;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** No due date sorts last. */
function dueRank(dueDate: string | null): string {
  return dueDate ?? '9999-12-31';
}

export function sortTodos<TTodo extends Todo>(todos: TTodo[], sort: TodoSort): TTodo[] {
  // Copy first: this array is the query cache.
  const copy = [...todos];

  switch (sort) {
    case 'due_date':
      return copy.sort((a, b) => dueRank(a.due_date).localeCompare(dueRank(b.due_date)));
    case 'priority':
      return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'smart':
      return copy.sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          dueRank(a.due_date).localeCompare(dueRank(b.due_date)) ||
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          a.created_at.localeCompare(b.created_at)
      );
  }
}
