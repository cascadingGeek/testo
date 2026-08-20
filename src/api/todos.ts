import { type PostgrestError, type QueryData } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { TodoUpdate } from '@/types/todo';
import { err, ok, type Result } from '@/utils/result';

/**
 * Every query uses this projection so a mutation response can be written
 * straight into list state without dropping the category.
 */
const TODO_SELECT = '*, categories(id, name, color)';

const todoQuery = supabase.from('todos').select(TODO_SELECT);

export type TodoWithCategory = QueryData<typeof todoQuery>[number];

function toMessage(error: PostgrestError): string {
  switch (error.code) {
    case '42501':
      return 'You do not have permission to do that.';
    case '23514':
      return 'That value is not allowed.';
    case '23503':
      return 'That item no longer exists.';
    case 'PGRST116':
      return 'That todo could not be found.';
    default:
      if (__DEV__) console.warn('[todos] unmapped error', error.code, error.message);
      return 'Something went wrong. Please try again.';
  }
}

export async function fetchTodos(): Promise<Result<TodoWithCategory[]>> {
  // No user_id filter: RLS scopes this, and filtering here would imply the
  // client is what enforces it.
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
  // Another user's todo is filtered out by RLS, so it looks like a missing row.
  const { data, error } = await supabase
    .from('todos')
    .select(TODO_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return err(toMessage(error));
  if (!data) return err('That todo could not be found.');
  return ok(data);
}

export async function createTodo(input: {
  title: string;
  userId: string;
}): Promise<Result<TodoWithCategory>> {
  const { data, error } = await supabase
    .from('todos')
    .insert({ title: input.title, user_id: input.userId })
    .select(TODO_SELECT)
    .single();

  if (error) return err(toMessage(error));
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

export async function deleteTodo(id: string): Promise<Result> {
  const { error } = await supabase.from('todos').delete().eq('id', id);

  if (error) return err(toMessage(error));
  return ok();
}
