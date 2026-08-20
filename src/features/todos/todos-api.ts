import { type PostgrestError, type QueryData } from '@supabase/supabase-js';

import { err, ok, type Result } from '@/lib/result';
import { supabase } from '@/lib/supabase';
import type { TodoUpdate } from '@/types/todo';

/**
 * PostgREST can embed a related row in the same request. One round trip
 * returns the todo and its category instead of fetching categories
 * separately and joining them in JavaScript.
 *
 * Every query below uses this same projection so that whatever a mutation
 * returns can be dropped straight into list state without losing the
 * category and blanking the row.
 */
const TODO_SELECT = '*, categories(id, name, color)';

const todoQuery = supabase.from('todos').select(TODO_SELECT);

/**
 * Derived from the query itself rather than hand-written. Change TODO_SELECT
 * and this type follows; hand-written, the two would drift.
 */
export type TodoWithCategory = QueryData<typeof todoQuery>[number];

/**
 * Postgres error codes are SQLSTATE values and are stable across versions.
 * Note what is NOT here: a "you tried to read someone else's todo" case.
 * RLS does not raise an error for that — it silently returns no rows, so a
 * cross-user read looks exactly like a missing row. That is by design.
 */
function toMessage(error: PostgrestError): string {
  switch (error.code) {
    case '42501': // insufficient_privilege — an RLS policy rejected a write
      return 'You do not have permission to do that.';
    case '23514': // check_violation — e.g. title longer than 200 chars
      return 'That value is not allowed.';
    case '23503': // foreign_key_violation
      return 'That item no longer exists.';
    case 'PGRST116': // no rows where exactly one was expected
      return 'That todo could not be found.';
    default:
      if (__DEV__) console.warn('[todos] unmapped error', error.code, error.message);
      return 'Something went wrong. Please try again.';
  }
}

export async function fetchTodos(): Promise<Result<TodoWithCategory[]>> {
  // No `.eq('user_id', …)` here on purpose: RLS already restricts this to the
  // caller's rows. Adding the filter would imply the security lives in the
  // client, which is exactly the wrong mental model.
  const { data, error } = await supabase
    .from('todos')
    .select(TODO_SELECT)
    .order('completed', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return err(toMessage(error));
  return ok(data);
}

export async function fetchTodo(id: string): Promise<Result<TodoWithCategory>> {
  // maybeSingle() rather than single(): "no such row" is an ordinary outcome
  // here, not an error. It is also what a todo belonging to someone else
  // looks like, because RLS filters it out rather than rejecting the read.
  const { data, error } = await supabase.from('todos').select(TODO_SELECT).eq('id', id).maybeSingle();

  if (error) return err(toMessage(error));
  if (!data) return err('That todo could not be found.');
  return ok(data);
}

export async function updateTodo(
  id: string,
  patch: Pick<
    TodoUpdate,
    'title' | 'description' | 'priority' | 'completed' | 'due_date' | 'category_id'
  >
): Promise<Result<TodoWithCategory>> {
  const { data, error } = await supabase
    .from('todos')
    .update(patch)
    .eq('id', id)
    .select(TODO_SELECT)
    .single();

  if (error) return err(toMessage(error));
  return ok(data);
}

export async function createTodo(input: { title: string; userId: string }): Promise<Result<TodoWithCategory>> {
  const { data, error } = await supabase
    .from('todos')
    // user_id is required by the schema and re-checked by the RLS `with check`
    // policy. Passing the wrong one does not leak data; it fails as 42501.
    .insert({ title: input.title, user_id: input.userId })
    .select(TODO_SELECT)
    .single();

  if (error) return err(toMessage(error));
  return ok(data);
}

export async function setTodoCompleted(id: string, completed: boolean): Promise<Result<TodoWithCategory>> {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .select(TODO_SELECT)
    .single();

  if (error) return err(toMessage(error));
  return ok(data);
}

export async function deleteTodo(id: string): Promise<Result> {
  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) return err(toMessage(error));
  return ok();
}
