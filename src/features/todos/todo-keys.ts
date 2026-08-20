/**
 * Query keys in one place rather than string literals scattered across hooks.
 *
 * The hierarchy matters: invalidating `todoKeys.all` invalidates every list
 * AND every detail below it, because TanStack matches keys by prefix.
 */
export const todoKeys = {
  all: ['todos'] as const,
  list: () => [...todoKeys.all, 'list'] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};
