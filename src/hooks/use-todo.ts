import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchTodo, type TodoWithCategory } from '@/api/todos';
import type { QueryClient } from '@tanstack/react-query';
import { toMessage, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';

/** Read-only; writes live in `useTodoMutations` so this hook never re-renders on a pending save. */
export function useTodo(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => unwrap(fetchTodo(id)),

    // Seed from whichever list page already holds this row so the screen
    // opens without a spinner. Without the timestamp the seeded copy would
    // count as fresh and never revalidate.
    initialData: () => findCachedTodo(queryClient, id)?.todo,
    initialDataUpdatedAt: () => findCachedTodo(queryClient, id)?.updatedAt,
  });

  return {
    todo: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
    reload: query.refetch,
  };
}

/** Lists are now paginated and keyed by params, so scan every cached page. */
function findCachedTodo(queryClient: QueryClient, id: string) {
  const entries = queryClient.getQueriesData<{ pages: TodoWithCategory[][] }>({
    queryKey: todoKeys.lists(),
  });

  for (const [key, data] of entries) {
    const todo = data?.pages.flat().find((item) => item.id === id);
    if (todo) {
      return { todo, updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt };
    }
  }

  return undefined;
}
