import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import type { TodoListParams, TodoWithCategory } from '@/api/todos';
import { todoKeys } from '@/lib/query-keys';
import type { DateString } from '@/utils/dates';
import { bucketsFor, type TodoFilter } from '@/utils/todo-filters';

type ListData = InfiniteData<TodoWithCategory[], number>;
type CountData = Record<TodoFilter, number>;
type CountParams = Pick<TodoListParams, 'search' | 'today'>;

export type TodoCacheSnapshot = {
  lists: [QueryKey, ListData | undefined][];
  counts: [QueryKey, CountData | undefined][];
};

/** The params a list or count query was keyed by live in the last key segment. */
function paramsOf<TParams>(key: QueryKey): TParams | undefined {
  return key.at(-1) as TParams | undefined;
}

export function snapshotTodoCaches(queryClient: QueryClient): TodoCacheSnapshot {
  return {
    lists: queryClient.getQueriesData<ListData>({ queryKey: todoKeys.lists() }),
    counts: queryClient.getQueriesData<CountData>({ queryKey: todoKeys.counts() }),
  };
}

export function restoreTodoCaches(
  queryClient: QueryClient,
  snapshot: TodoCacheSnapshot | undefined
): void {
  if (!snapshot) return;

  for (const [key, data] of [...snapshot.lists, ...snapshot.counts]) {
    queryClient.setQueryData(key, data);
  }
}

/**
 * Reflects a change to one todo in every cached list and count.
 *
 * `after` is the row as it will look, or null when it is being deleted. Only
 * rows already present are touched: a row that newly qualifies for a list it
 * was not in cannot be placed at the right sorted position from here, so those
 * lists are marked stale instead and refetch when they are next looked at.
 */
export function applyTodoChange(
  queryClient: QueryClient,
  args: { before: TodoWithCategory; after: TodoWithCategory | null }
): void {
  patchLists(queryClient, args);
  patchCounts(queryClient, args);

  // Stale, not refetched. The queries on screen are already correct, and the
  // ones that are not on screen refetch when they are next observed.
  queryClient.invalidateQueries({ queryKey: todoKeys.lists(), refetchType: 'none' });
  queryClient.invalidateQueries({ queryKey: todoKeys.counts(), refetchType: 'none' });
}

function patchLists(
  queryClient: QueryClient,
  { before, after }: { before: TodoWithCategory; after: TodoWithCategory | null }
): void {
  for (const [key] of queryClient.getQueriesData<ListData>({ queryKey: todoKeys.lists() })) {
    const params = paramsOf<TodoListParams>(key);
    if (!params) continue;

    // A row that leaves the filter leaves the list: completing a todo has to
    // remove it from "Today", not sit there with a tick.
    const keeps =
      after !== null && bucketsFor(after, params.today).includes(params.filter);

    queryClient.setQueryData<ListData>(key, (data) => {
      if (!data) return data;

      let changed = false;
      const pages = data.pages.map((page) => {
        if (!page.some((todo) => todo.id === before.id)) return page;
        changed = true;
        return keeps
          ? page.map((todo) => (todo.id === before.id ? after : todo))
          : page.filter((todo) => todo.id !== before.id);
      });

      return changed ? { ...data, pages } : data;
    });
  }
}

function patchCounts(
  queryClient: QueryClient,
  { before, after }: { before: TodoWithCategory; after: TodoWithCategory | null }
): void {
  for (const [key] of queryClient.getQueriesData<CountData>({ queryKey: todoKeys.counts() })) {
    const params = paramsOf<CountParams>(key);

    // With a search active we cannot tell from here whether this row is in the
    // counted set, so that entry is left to refetch rather than guessed at.
    if (!params || params.search.length > 0) continue;

    queryClient.setQueryData<CountData>(key, (data) => {
      if (!data) return data;
      return applyBucketDelta(data, before, after, params.today);
    });
  }
}

/** A toggle's effect on each chip is arithmetic, not a query. */
function applyBucketDelta(
  counts: CountData,
  before: TodoWithCategory,
  after: TodoWithCategory | null,
  today: DateString
): CountData {
  const left = bucketsFor(before, today);
  const joined = after === null ? [] : bucketsFor(after, today);

  // ?? 0 so a cache entry written before a filter existed cannot produce NaN.
  const next = { ...counts };
  for (const filter of left) {
    if (!joined.includes(filter)) next[filter] = Math.max(0, (next[filter] ?? 0) - 1);
  }
  for (const filter of joined) {
    if (!left.includes(filter)) next[filter] = (next[filter] ?? 0) + 1;
  }

  return next;
}
