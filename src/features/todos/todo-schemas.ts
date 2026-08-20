import { z } from 'zod';

import { Constants } from '@/types/database';

/**
 * Derived from the generated database constants rather than retyped here.
 * Add a value to the Postgres enum, run `npm run gen:types`, and this list
 * follows automatically.
 */
export const TODO_PRIORITIES = Constants.public.Enums.todo_priority;

/**
 * These bounds intentionally mirror the CHECK constraints in
 * supabase/migrations/0001_create_todos.sql.
 *
 * That duplication is on purpose: the constraint is the enforcement, this is
 * the courtesy. Without it the only way to learn your title is too long is a
 * failed request; without the constraint, anyone bypassing this app writes
 * whatever they like.
 */
export const todoEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your todo a title.')
    .max(200, 'Keep the title under 200 characters.'),
  description: z.string().trim().max(2000, 'Description is too long.'),
  priority: z.enum(TODO_PRIORITIES),
  // null is a real value here — "no due date" — so it is nullable rather
  // than optional. The regex matches the YYYY-MM-DD a `date` column expects.
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date buttons to set a due date.')
    .nullable(),
  category_id: z.uuid('Pick a category from the list.').nullable(),
});

export type TodoEditInput = z.infer<typeof todoEditSchema>;
