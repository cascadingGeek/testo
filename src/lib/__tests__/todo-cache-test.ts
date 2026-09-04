import { QueryClient } from '@tanstack/react-query';

import type { TodoWithCategory } from '@/api/todos';
import { todoKeys } from '@/lib/query-keys';
import { applyTodoChange, restoreTodoCaches, snapshotTodoCaches } from '@/lib/todo-cache';
import { asDateString } from '@/utils/dates';
import type { TodoFilter } from '@/utils/todo-filters';

const TODAY = asDateString('2026-08-27');

const todo = (over: Partial<TodoWithCategory> = {}): TodoWithCategory =>
  ({
    id: 't1',
    title: 'Buy milk',
    completed: false,
    due_date: TODAY,
    priority: 'medium',
    ...over,
  }) as TodoWithCategory;

const listParams = (filter: TodoFilter) => ({
  filter,
  search: '',
  sort: 'smart' as const,
  today: TODAY,
});

const counts = (over: Partial<Record<TodoFilter, number>> = {}) => ({
  all: 10,
  pending: 6,
  today: 3,
  upcoming: 2,
  overdue: 1,
  completed: 4,
  ...over,
});

// Each cached query holds a gcTime timer, which keeps Jest's event loop alive
// after the assertions finish. Clearing the client cancels them.
const clients: QueryClient[] = [];

function makeClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return client;
}

afterEach(() => {
  while (clients.length > 0) clients.pop()?.clear();
});

describe('applyTodoChange on a completed toggle', () => {
  it('removes the row from a list whose filter no longer admits it', () => {
    const qc = makeClient();
    const before = todo();
    qc.setQueryData(todoKeys.list(listParams('today')), {
      pages: [[before]],
      pageParams: [0],
    });

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    expect(qc.getQueryData<{ pages: TodoWithCategory[][] }>(
      todoKeys.list(listParams('today'))
    )?.pages[0]).toEqual([]);
  });

  it('keeps the row, updated, in a list that still admits it', () => {
    const qc = makeClient();
    const before = todo();
    qc.setQueryData(todoKeys.list(listParams('all')), { pages: [[before]], pageParams: [0] });

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    const page = qc.getQueryData<{ pages: TodoWithCategory[][] }>(
      todoKeys.list(listParams('all'))
    )?.pages[0];
    expect(page).toHaveLength(1);
    expect(page?.[0].completed).toBe(true);
  });

  it('moves the counts arithmetically instead of refetching them', () => {
    const qc = makeClient();
    const before = todo();
    const key = [...todoKeys.counts(), { search: '', today: TODAY }];
    qc.setQueryData(key, counts());

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    expect(qc.getQueryData(key)).toEqual(counts({ today: 2, completed: 5, pending: 5 }));
  });

  it('moves them back when a todo is un-completed', () => {
    const qc = makeClient();
    const before = todo({ completed: true });
    const key = [...todoKeys.counts(), { search: '', today: TODAY }];
    qc.setQueryData(key, counts());

    applyTodoChange(qc, { before, after: { ...before, completed: false } });

    expect(qc.getQueryData(key)).toEqual(counts({ today: 4, completed: 3, pending: 7 }));
  });

  it('leaves searched counts alone, since membership cannot be known locally', () => {
    const qc = makeClient();
    const before = todo();
    const key = [...todoKeys.counts(), { search: 'milk', today: TODAY }];
    qc.setQueryData(key, counts());

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    expect(qc.getQueryData(key)).toEqual(counts());
  });

  it('does not refetch: the patched queries are only marked stale', () => {
    const qc = makeClient();
    const before = todo();
    qc.setQueryData(todoKeys.list(listParams('all')), { pages: [[before]], pageParams: [0] });

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    expect(qc.isFetching()).toBe(0);
    expect(qc.getQueryState(todoKeys.list(listParams('all')))?.isInvalidated).toBe(true);
  });
});

describe('applyTodoChange on a delete', () => {
  it('drops the row and decrements every bucket it was in', () => {
    const qc = makeClient();
    const before = todo();
    const countKey = [...todoKeys.counts(), { search: '', today: TODAY }];
    qc.setQueryData(todoKeys.list(listParams('all')), { pages: [[before]], pageParams: [0] });
    qc.setQueryData(countKey, counts());

    applyTodoChange(qc, { before, after: null });

    expect(
      qc.getQueryData<{ pages: TodoWithCategory[][] }>(todoKeys.list(listParams('all')))?.pages[0]
    ).toEqual([]);
    expect(qc.getQueryData(countKey)).toEqual(counts({ all: 9, today: 2, pending: 5 }));
  });

  it('never takes a count below zero', () => {
    const qc = makeClient();
    const before = todo();
    const key = [...todoKeys.counts(), { search: '', today: TODAY }];
    qc.setQueryData(key, counts({ all: 0, today: 0, pending: 0 }));

    applyTodoChange(qc, { before, after: null });

    expect(qc.getQueryData(key)).toEqual(counts({ all: 0, today: 0, pending: 0 }));
  });
});

describe('a count entry missing a newly added filter', () => {
  it('degrades to a number rather than NaN', () => {
    const qc = makeClient();
    const before = todo();
    const key = [...todoKeys.counts(), { search: '', today: TODAY }];
    // Written before `pending` existed as a chip.
    qc.setQueryData(key, { all: 10, today: 3, upcoming: 2, overdue: 1, completed: 4 });

    applyTodoChange(qc, { before, after: { ...before, completed: true } });

    expect(qc.getQueryData<Record<string, number>>(key)?.pending).toBe(0);
  });
});

describe('snapshot and restore', () => {
  it('puts every patched cache back the way it was, so a failed write rolls back', () => {
    const qc = makeClient();
    const before = todo();
    const listKey = todoKeys.list(listParams('today'));
    const countKey = [...todoKeys.counts(), { search: '', today: TODAY }];
    qc.setQueryData(listKey, { pages: [[before]], pageParams: [0] });
    qc.setQueryData(countKey, counts());

    const snapshot = snapshotTodoCaches(qc);
    applyTodoChange(qc, { before, after: { ...before, completed: true } });
    restoreTodoCaches(qc, snapshot);

    expect(qc.getQueryData<{ pages: TodoWithCategory[][] }>(listKey)?.pages[0]).toEqual([before]);
    expect(qc.getQueryData(countKey)).toEqual(counts());
  });
});
