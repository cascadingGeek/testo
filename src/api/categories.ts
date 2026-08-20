import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/todo';
import { err, ok, type Result } from '@/utils/result';

function toMessage(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      return 'You already have a category with that name.';
    case '42501':
      return 'You do not have permission to do that.';
    case '23514':
      return 'That value is not allowed.';
    default:
      if (__DEV__) console.warn('[categories] unmapped error', error.code, error.message);
      return 'Something went wrong. Please try again.';
  }
}

export async function fetchCategories(): Promise<Result<Category[]>> {
  const { data, error } = await supabase.from('categories').select('*').order('name');

  if (error) return err(toMessage(error));
  return ok(data);
}

export async function createCategory(input: {
  name: string;
  color: string;
  userId: string;
}): Promise<Result<Category>> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name, color: input.color, user_id: input.userId })
    .select()
    .single();

  if (error) return err(toMessage(error));
  return ok(data);
}

/** Todos survive: the composite FK is ON DELETE SET NULL (category_id). */
export async function deleteCategory(id: string): Promise<Result> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) return err(toMessage(error));
  return ok();
}
