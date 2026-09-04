import type { TodoListParams } from '@/api/todos';

/** Keys match by prefix, so invalidating `all` covers lists, counts and details. */
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (params: TodoListParams) => [...todoKeys.lists(), params] as const,
  counts: () => [...todoKeys.all, 'counts'] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};
