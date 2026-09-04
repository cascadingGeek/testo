import {
  CONFLICT_ERROR_CODE,
  createTodo,
  fetchTodo,
  fetchTodosPage,
  toIlikePattern,
  updateTodo,
} from '@/api/todos';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

type Call = [string, ...unknown[]];

/**
 * A stand-in for the PostgREST builder: every modifier records itself and
 * returns the same object, so a test can assert on the whole chain.
 */
function mockBuilder(result: { data: unknown; error: unknown; count?: number | null }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};

  for (const method of ['update', 'insert', 'select', 'eq', 'order', 'range', 'limit']) {
    builder[method] = jest.fn((...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    });
  }

  builder.maybeSingle = jest.fn(async () => result);
  builder.single = jest.fn(async () => result);
  // A head-count query is awaited directly rather than through maybeSingle.
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);

  return { builder, calls };
}

const eqCalls = (calls: Call[]) => calls.filter(([method]) => method === 'eq');

beforeEach(() => jest.clearAllMocks());

describe('updateTodo optimistic concurrency', () => {
  it('sends the expected version as a precondition', async () => {
    const { builder, calls } = mockBuilder({ data: { id: 't1' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await updateTodo('t1', { title: 'new' }, '2026-08-27T10:00:00.000001+00:00');

    expect(eqCalls(calls)).toEqual([
      ['eq', 'id', 't1'],
      ['eq', 'updated_at', '2026-08-27T10:00:00.000001+00:00'],
    ]);
  });

  it('omits the precondition when no version is supplied', async () => {
    const { builder, calls } = mockBuilder({ data: { id: 't1' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await updateTodo('t1', { completed: true });

    expect(eqCalls(calls)).toEqual([['eq', 'id', 't1']]);
  });

  it('reports a conflict when no row matched but the row still exists', async () => {
    const update = mockBuilder({ data: null, error: null });
    const exists = mockBuilder({ data: null, error: null, count: 1 });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(update.builder)
      .mockReturnValueOnce(exists.builder);

    const result = await updateTodo('t1', { title: 'mine' }, 'stale-version');

    expect(result).toMatchObject({ ok: false, code: CONFLICT_ERROR_CODE });
    if (!result.ok) expect(result.message).toMatch(/changed on another device/i);
  });

  it('reports a deletion rather than a conflict when the row is gone', async () => {
    const update = mockBuilder({ data: null, error: null });
    const exists = mockBuilder({ data: null, error: null, count: 0 });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(update.builder)
      .mockReturnValueOnce(exists.builder);

    const result = await updateTodo('t1', { title: 'mine' }, 'stale-version');

    expect(result).toMatchObject({ ok: false, code: 'PGRST116' });
    if (!result.ok) expect(result.message).toMatch(/no longer exists/i);
  });
});

describe('createTodo idempotency', () => {
  it('sends the client-supplied id, so a replay collides instead of duplicating', async () => {
    const { builder, calls } = mockBuilder({ data: { id: 'given-id' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await createTodo({ id: 'given-id', title: 'Buy milk', userId: 'u1' });

    expect(calls.find(([method]) => method === 'insert')?.[1]).toMatchObject({
      id: 'given-id',
      title: 'Buy milk',
      user_id: 'u1',
    });
  });

  it('treats a primary-key collision as the success the client never heard about', async () => {
    const insert = mockBuilder({ data: null, error: { code: '23505', message: 'dup' } });
    const refetch = mockBuilder({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(insert.builder)
      .mockReturnValueOnce(refetch.builder);

    const result = await createTodo({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Buy milk',
      userId: 'u1',
    });

    expect(result.ok).toBe(true);
  });

  it('still reports a real failure', async () => {
    const { builder } = mockBuilder({ data: null, error: { code: '42501', message: 'denied' } });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    const result = await createTodo({ id: 'given-id', title: 'Buy milk', userId: 'u1' });

    expect(result).toMatchObject({ ok: false, code: '42501' });
  });
});

describe('fetchTodo id validation', () => {
  it('answers "not found" for a malformed id instead of asking Postgres', async () => {
    (supabase.from as jest.Mock).mockClear();

    const result = await fetchTodo('not-a-uuid');

    expect(result).toMatchObject({ ok: false, code: 'PGRST116' });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('sort stability', () => {
  const params = {
    filter: 'all',
    search: '',
    today: '2026-08-27',
  } as unknown as Parameters<typeof fetchTodosPage>[0];

  const orderCalls = (calls: Call[]) =>
    calls.filter(([method]) => method === 'order').map(([, column]) => column);

  it.each(['smart', 'due_date', 'priority', 'title'] as const)(
    'ends the %s sort on id, so ties cannot reorder between pages',
    async (sort) => {
      const { builder, calls } = mockBuilder({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await fetchTodosPage({ ...params, sort }, 0);

      expect(orderCalls(calls).at(-1)).toBe('id');
    }
  );

  it('asks for exactly one page worth of rows', async () => {
    const { builder, calls } = mockBuilder({ data: [], error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await fetchTodosPage({ ...params, sort: 'smart' }, 2);

    expect(calls.filter(([method]) => method === 'range')).toEqual([['range', 60, 89]]);
  });
});

describe('toIlikePattern', () => {
  it('wraps the term so it matches anywhere in the column', () => {
    expect(toIlikePattern('milk')).toBe('%milk%');
  });

  it('removes the characters that terminate or nest a PostgREST filter', () => {
    // A comma would start a second condition; parens would open a group.
    expect(toIlikePattern('a,b(c)d"e\\f')).not.toMatch(/[,()"\\]/);
  });

  it('escapes ILIKE wildcards so they are matched literally', () => {
    expect(toIlikePattern('100%')).toBe('%100\\%%');
    expect(toIlikePattern('a_b')).toBe('%a\\_b%');
  });

  it('escapes after stripping, so the added backslashes survive', () => {
    expect(toIlikePattern('\\%')).toBe('% \\%%');
  });

  it('neutralises *, which PostgREST would otherwise rewrite into a wildcard', () => {
    // Searching "2*3" must not match "2 plus 3".
    expect(toIlikePattern('2*3')).toBe('%2 3%');
  });

  it('trims surrounding whitespace', () => {
    expect(toIlikePattern('  milk  ')).toBe('%milk%');
  });
});
