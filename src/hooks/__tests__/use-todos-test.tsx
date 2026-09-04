import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { TODOS_PAGE_SIZE, type TodoWithCategory } from '@/api/todos';
import { useTodos } from '@/hooks/use-todos';
import { asDateString } from '@/utils/dates';
import { ok } from '@/utils/result';

jest.mock('@/api/todos', () => ({
  ...jest.requireActual('@/api/todos'),
  fetchTodosPage: jest.fn(),
}));

const { fetchTodosPage } = jest.requireMock('@/api/todos') as {
  fetchTodosPage: jest.Mock;
};

const makeTodos = (count: number, prefix = 'todo'): TodoWithCategory[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, title: `T${i}` })) as TodoWithCategory[];

function wrapper({ children }: { children: ReactNode }) {
  // retry: false so a failing test fails immediately instead of backing off.
  // gcTime: 0 so no cache-eviction timer outlives the test.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const params = {
  filter: 'all',
  search: '',
  sort: 'smart',
  today: asDateString('2026-08-20'),
} as const;

describe('useTodos', () => {
  beforeEach(() => fetchTodosPage.mockReset());

  it('returns the first page', async () => {
    fetchTodosPage.mockResolvedValue(ok(makeTodos(3)));

    const { result } = await renderHook(() => useTodos(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.todos).toHaveLength(3);
    expect(fetchTodosPage).toHaveBeenCalledWith(params, 0);
  });

  it('reports no next page when the server returns a short page', async () => {
    // Short page means the server has nothing more, so stop asking.
    fetchTodosPage.mockResolvedValue(ok(makeTodos(TODOS_PAGE_SIZE - 1)));

    const { result } = await renderHook(() => useTodos(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('reports a next page when the page is full, and flattens both', async () => {
    fetchTodosPage
      .mockResolvedValueOnce(ok(makeTodos(TODOS_PAGE_SIZE, 'a')))
      .mockResolvedValueOnce(ok(makeTodos(2, 'b')));

    const { result } = await renderHook(() => useTodos(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.todos).toHaveLength(TODOS_PAGE_SIZE + 2));
    expect(fetchTodosPage).toHaveBeenLastCalledWith(params, 1);
  });

  it('surfaces a failure as a message rather than throwing', async () => {
    fetchTodosPage.mockResolvedValue({ ok: false, message: 'You do not have permission to do that.' });

    const { result } = await renderHook(() => useTodos(params), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('You do not have permission to do that.'));
    expect(result.current.todos).toEqual([]);
  });
});
