import type { PostgrestError } from '@supabase/supabase-js';

import { toPostgrestFailure } from '@/api/postgrest-errors';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/todo';
import { ok, type Result } from '@/utils/result';

const toFailure = (error: PostgrestError) =>
  toPostgrestFailure('categories', error, {
    '23505': 'You already have a category with that name.',
  });

export async function fetchCategories(): Promise<Result<Category[]>> {
  const { data, error } = await supabase.from('categories').select('*').order('name');

  if (error) return toFailure(error);
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

  if (error) return toFailure(error);
  return ok(data);
}

/** Todos survive: the composite FK is ON DELETE SET NULL (category_id). */
export async function deleteCategory(id: string): Promise<Result> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) return toFailure(error);
  return ok();
}
