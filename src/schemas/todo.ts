import { z } from 'zod';

import { Constants } from '@/types/database';

export const TODO_PRIORITIES = Constants.public.Enums.todo_priority;

/** Bounds mirror the CHECK constraints in 0001_create_todos.sql. */
export const todoEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your todo a title.')
    .max(200, 'Keep the title under 200 characters.'),
  description: z.string().trim().max(2000, 'Description is too long.'),
  priority: z.enum(TODO_PRIORITIES),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date buttons to set a due date.')
    .nullable(),
  category_id: z.uuid('Pick a category from the list.').nullable(),
});

export type TodoEditInput = z.infer<typeof todoEditSchema>;
