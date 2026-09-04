import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchTodosPage, TODOS_PAGE_SIZE, type TodoListParams } from '@/api/todos';
import { toMessage, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';

/** Read-only. Writes live in useTodoMutations so both screens share one copy. */
export function useTodos(params: TodoListParams) {
  const query = useInfiniteQuery({
    queryKey: todoKeys.list(params),
    queryFn: ({ pageParam }) => unwrap(fetchTodosPage(params, pageParam)),
    initialPageParam: 0,
    // A short page means the server has nothing more to give.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < TODOS_PAGE_SIZE ? undefined : allPages.length,
  });

  return {
    todos: query.data?.pages.flat() ?? [],
    isLoading: query.isPending,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error ? toMessage(query.error) : null,
    refresh: query.refetch,
  };
}
