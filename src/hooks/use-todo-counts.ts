import { useQuery } from '@tanstack/react-query';

import { fetchTodoCount, type TodoListParams } from '@/api/todos';
import { toMessage, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';
import { TODO_FILTERS, type TodoFilter } from '@/utils/todo-filters';

type CountParams = Pick<TodoListParams, 'search' | 'today'>;

/**
 * One head request per chip, in parallel.
 *
 * `head: true` suppresses the response body, not the work: `count: 'exact'`
 * still runs a real COUNT(*), so the transfer is constant but the scan is
 * linear in the user's todos. These are the cheapest-looking requests in the
 * app and the ones that scale worst — which is why mutations now patch these
 * counts arithmetically instead of refetching them (see todo-cache.ts).
 */
export function useTodoCounts(params: CountParams) {
  const query = useQuery({
    queryKey: [...todoKeys.counts(), params],
    queryFn: async () => {
      const results = await Promise.all(
        TODO_FILTERS.map((filter) =>
          unwrap(fetchTodoCount({ ...params, filter, sort: 'smart' })).then(
            (count) => [filter, count] as const
          )
        )
      );

      return Object.fromEntries(results) as Record<TodoFilter, number>;
    },
  });

  const empty = Object.fromEntries(TODO_FILTERS.map((f) => [f, 0])) as Record<TodoFilter, number>;

  return {
    counts: query.data ?? empty,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
  };
}
