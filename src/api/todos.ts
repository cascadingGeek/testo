import { type PostgrestError, type QueryData } from '@supabase/supabase-js';

import { toPostgrestFailure } from '@/api/postgrest-errors';
import { supabase } from '@/lib/supabase';
import type { TodoUpdate } from '@/types/todo';
import { err, ok, type Result } from '@/utils/result';
import type { TodoSort } from '@/store/todo-view-store';
import { asTimeString, type DateString, type TimeString } from '@/utils/dates';
import type { TodoFilter } from '@/utils/todo-filters';

/**
 * Every query uses this projection so a mutation response can be written
 * straight into list state without dropping the category.
 */
const TODO_SELECT = '*, categories(id, name, color)';

/**
 * Exists only to carry the row type. `declare` means it is never constructed
 * at runtime, so importing this module issues nothing — buildTodoQuery is
 * referenced by the type above and never called.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- referenced by the type below
function buildTodoQuery() {
  return supabase.from('todos').select(TODO_SELECT);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- declare emits nothing
declare const todoQuery: ReturnType<typeof buildTodoQuery>;

type RawTodoWithCategory = QueryData<typeof todoQuery>[number];

/**
 * due_date and due_time are re-typed here and nowhere else. due_date comes from
 * a Postgres `date`, which PostgREST always serialises as YYYY-MM-DD, so that
 * format is asserted rather than checked. due_time comes from a `time`, which
 * serialises as HH:MM:SS, so it genuinely needs converting — see normaliseRow.
 */
export type TodoWithCategory = Omit<RawTodoWithCategory, 'due_date' | 'due_time'> & {
  due_date: DateString | null;
  due_time: TimeString | null;
};

/** The one place HH:MM:SS becomes HH:MM. Everything downstream gets TimeString. */
function normaliseRow(row: RawTodoWithCategory): TodoWithCategory {
  return {
    ...row,
    // Nullish, not just null: a projection that omits the column leaves it
    // undefined, and crashing the whole list over a missing time is worse than
    // treating it as unset.
    due_time: row.due_time ? asTimeString(row.due_time) : null,
  } as TodoWithCategory;
}

function normaliseRows(rows: RawTodoWithCategory[]): TodoWithCategory[] {
  return rows.map(normaliseRow);
}

const toFailure = (error: PostgrestError) =>
  toPostgrestFailure('todos', error, {
    PGRST116: 'That todo could not be found.',
    '22P02': 'That todo could not be found.',
  });

export type TodoPatch = Omit<
  Pick<
    TodoUpdate,
    | 'title'
    | 'description'
    | 'priority'
    | 'completed'
    | 'due_date'
    | 'due_time'
    | 'category_id'
  >,
  'due_date' | 'due_time'
> & { due_date?: DateString | null; due_time?: TimeString | null };

export const TODOS_PAGE_SIZE = 30;

export type TodoListParams = {
  filter: TodoFilter;
  search: string;
  sort: TodoSort;
  /** Passed in so the caller controls the day boundary. */
  today: DateString;
};

/**
 * `,` `(` `)` terminate a PostgREST filter expression and `%` `_` are ILIKE
 * wildcards, so neither can reach the server as typed. `*` is stripped rather
 * than escaped because PostgREST rewrites it to `%` inside an ilike value
 * before Postgres sees it, so a backslash would escape the wrong character.
 */
export function toIlikePattern(search: string): string {
  const cleaned = search.trim().replace(/[,()"\\*]/g, ' ');
  const escaped = cleaned.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function applyFilter<TQuery extends { eq: Function; gt: Function; lt: Function; or: Function }>(
  query: TQuery,
  params: TodoListParams
): TQuery {
  let next = query;

  switch (params.filter) {
    case 'pending':
      next = next.eq('completed', false);
      break;
    case 'completed':
      next = next.eq('completed', true);
      break;
    case 'today':
      next = next.eq('completed', false).eq('due_date', params.today);
      break;
    case 'upcoming':
      next = next.eq('completed', false).gt('due_date', params.today);
      break;
    case 'overdue':
      next = next.eq('completed', false).lt('due_date', params.today);
      break;
    case 'all':
      break;
  }

  if (params.search.trim().length > 0) {
    const pattern = toIlikePattern(params.search);
    next = next.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  return next;
}

/**
 * Every sort ends on id. Without a unique final column Postgres is free to
 * order ties differently between two requests, so the same row can land on
 * two pages — or on neither — even with nothing else writing to the table.
 */
function applySort<TQuery extends { order: Function }>(query: TQuery, sort: TodoSort): TQuery {
  const tiebreak = (query: TQuery) => query.order('id', { ascending: true });

  switch (sort) {
    case 'due_date':
      return tiebreak(query.order('due_date', { ascending: true, nullsFirst: false }));
    case 'priority':
      // The enum is declared low → high, so descending puts high first.
      return tiebreak(query.order('priority', { ascending: false }));
    case 'title':
      return tiebreak(query.order('title', { ascending: true }));
    case 'smart':
      return tiebreak(
        query
          .order('completed', { ascending: true })
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
      );
  }
}

/**
 * One page of todos. Filtering, sorting and paging all happen in Postgres:
 * the API caps responses at 1000 rows, so fetching everything silently
 * truncates once a user passes that, and the (user_id, due_date) index is
 * only usable if the database does the work.
 *
 * No user_id filter here — RLS scopes the rows.
 */
export async function fetchTodosPage(
  params: TodoListParams,
  page: number
): Promise<Result<TodoWithCategory[]>> {
  const from = page * TODOS_PAGE_SIZE;

  const query = applySort(
    applyFilter(supabase.from('todos').select(TODO_SELECT), params),
    params.sort
  ).range(from, from + TODOS_PAGE_SIZE - 1);

  const { data, error } = await query;

  if (error) return toFailure(error);
  return ok(normaliseRows(data as RawTodoWithCategory[]));
}

/**
 * Counts for the filter chips. `head: true` returns no rows at all — just the
 * Content-Range header — so this costs the same whether the user has 10 todos
 * or 10,000.
 */
export async function fetchTodoCount(params: TodoListParams): Promise<Result<number>> {
  const { count, error } = await applyFilter(
    supabase.from('todos').select('id', { count: 'exact', head: true }),
    params
  );

  if (error) return toFailure(error);
  return ok(count ?? 0);
}

/** Postgres raises 22P02 on a malformed uuid, which is a confusing way to say
 * "no such todo". A stale share link or a mistyped deep link is not an error. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchTodo(id: string): Promise<Result<TodoWithCategory>> {
  if (!UUID_PATTERN.test(id)) return err('That todo could not be found.', 'PGRST116');

  // Another user's todo is filtered out by RLS, so it looks like a missing row.
  const { data, error } = await supabase
    .from('todos')
    .select(TODO_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return toFailure(error);
  if (!data) return err('That todo could not be found.', 'PGRST116');
  return ok(normaliseRow(data as RawTodoWithCategory));
}

/**
 * The id comes from the client so a create is idempotent. Without one, a write
 * that succeeds server-side but whose response is lost — the ordinary mobile
 * case where the radio drops between request and reply — shows the user an
 * error, and their retry inserts a second identical todo that nothing detects.
 * With a client id the replay collides on the primary key instead, and we can
 * return the row that is already there.
 */
export async function createTodo(input: {
  id: string;
  title: string;
  userId: string;
}): Promise<Result<TodoWithCategory>> {
  const { data, error } = await supabase
    .from('todos')
    .insert({ id: input.id, title: input.title, user_id: input.userId })
    .select(TODO_SELECT)
    .single();

  // 23505 on our own id means the first attempt did land. That is a success
  // the client never heard about, not a failure.
  if (error?.code === '23505') return fetchTodo(input.id);
  if (error) return toFailure(error);
  return ok(normaliseRow(data as RawTodoWithCategory));
}

/** A write was refused because the row changed after the user started editing. */
export const CONFLICT_ERROR_CODE = 'conflict';

/**
 * `expectedUpdatedAt` makes the write conditional: the row is only updated if
 * it still carries the version the user was editing. The database maintains
 * updated_at in a BEFORE UPDATE trigger, so it advances on every write and no
 * client can forge a match. Without this an edit is an unconditional overwrite
 * and a second device's changes are lost with no error.
 */
export async function updateTodo(
  id: string,
  patch: TodoPatch,
  expectedUpdatedAt?: string
): Promise<Result<TodoWithCategory>> {
  let query = supabase.from('todos').update(patch).eq('id', id);
  if (expectedUpdatedAt !== undefined) query = query.eq('updated_at', expectedUpdatedAt);

  // maybeSingle, not single: zero rows is the conflict signal, not an error.
  const { data, error } = await query.select(TODO_SELECT).maybeSingle();

  if (error) return toFailure(error);
  if (data) return ok(normaliseRow(data as RawTodoWithCategory));

  // No row matched. Either the version moved on or the row is gone, and the
  // two need different messages, so ask — this only runs on the failure path.
  if (expectedUpdatedAt !== undefined) return describeMissingRow(id);
  return err('That todo could not be found.', 'PGRST116');
}

async function describeMissingRow(id: string): Promise<Result<never>> {
  const { count, error } = await supabase
    .from('todos')
    .select('id', { count: 'exact', head: true })
    .eq('id', id);

  if (error) return toFailure(error);
  if (count && count > 0) {
    return err(
      'This todo was changed on another device. Reopen it to see the latest version.',
      CONFLICT_ERROR_CODE
    );
  }

  return err('That todo no longer exists.', 'PGRST116');
}

export async function deleteTodo(id: string): Promise<Result> {
  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) return toFailure(error);
  return ok();
}

/** How far ahead per-todo reminders are scheduled before the app refreshes them. */
export const REMINDER_WINDOW_DAYS = 30;

/**
 * Everything the notification scheduler needs, in two bounded requests.
 *
 * Split deliberately. `upcoming` includes completed rows, because the evening
 * digest cannot tell "you finished all three" from "you had none" without
 * them — and those deserve different notifications. `overdue` cannot afford
 * that: it has no lower bound in time, so completed rows would make it grow
 * without limit, and an overdue todo that is done is not overdue.
 */
export async function fetchNotificationTodos(
  today: DateString,
  horizon: DateString
): Promise<Result<{ overdue: TodoWithCategory[]; upcoming: TodoWithCategory[] }>> {
  const [overdue, upcoming] = await Promise.all([
    supabase
      .from('todos')
      .select(TODO_SELECT)
      .eq('completed', false)
      .lt('due_date', today)
      .order('due_date', { ascending: false })
      .order('id', { ascending: true })
      .limit(100),

    supabase
      .from('todos')
      .select(TODO_SELECT)
      .gte('due_date', today)
      .lte('due_date', horizon)
      .order('due_date', { ascending: true })
      .order('due_time', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .limit(200),
  ]);

  if (overdue.error) return toFailure(overdue.error);
  if (upcoming.error) return toFailure(upcoming.error);

  return ok({
    overdue: normaliseRows(overdue.data as RawTodoWithCategory[]),
    upcoming: normaliseRows(upcoming.data as RawTodoWithCategory[]),
  });
}
