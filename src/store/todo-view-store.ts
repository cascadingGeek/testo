import { create } from 'zustand';

import type { TodoFilter } from '@/utils/todo-filters';

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

/** How the list is viewed. The dashboard writes it, the todos screen reads it. */
export const useTodoViewStore = create<TodoViewState>((set) => ({
  filter: 'all',
  query: '',
  sort: 'smart',
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
}));
