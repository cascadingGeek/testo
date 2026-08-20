import { create } from 'zustand';

import type { TodoFilter } from '@/features/todos/todo-filters';

export const TODO_SORTS = ['smart', 'due_date', 'priority', 'title'] as const;

export type TodoSort = (typeof TODO_SORTS)[number];

export const SORT_LABELS: Record<TodoSort, string> = {
  smart: 'Smart',
  due_date: 'Due date',
  priority: 'Priority',
  title: 'A–Z',
};

type TodoViewState = {
  filter: TodoFilter;
  query: string;
  sort: TodoSort;
  setFilter: (filter: TodoFilter) => void;
  setQuery: (query: string) => void;
  setSort: (sort: TodoSort) => void;
};

/**
 * How the todo list is currently being *viewed* — not the todos themselves.
 *
 * This is deliberately NOT in TanStack Query: none of it comes from a server.
 * And it is deliberately not useState in the todos screen either, because the
 * dashboard writes it — tapping "Overdue" there sets the filter and navigates.
 * Cross-screen UI state with two writers is exactly what a small store is for.
 */
export const useTodoViewStore = create<TodoViewState>((set) => ({
  filter: 'all',
  query: '',
  sort: 'smart',
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
}));
