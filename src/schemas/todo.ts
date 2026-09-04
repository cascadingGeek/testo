import * as z from 'zod/mini';

import { Constants } from '@/types/database';
import type { DateString, TimeString } from '@/utils/dates';

export const TODO_PRIORITIES = Constants.public.Enums.todo_priority;

/** Bounds mirror the CHECK constraints in 0001_create_todos.sql. */
export const todoEditSchema = z.object({
  title: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'Give your todo a title.'),
      z.maxLength(200, 'Keep the title under 200 characters.')
    ),
  description: z.string().check(z.trim(), z.maxLength(2000, 'Description is too long.')),
  priority: z.enum(TODO_PRIORITIES),
  due_date: z.nullable(
    z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date buttons to set a due date.'))
  ),
  // Mirrors the CHECK in 0004: a time with no date has nothing to fire on.
  due_time: z.nullable(
    z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a reminder time from the list.'))
  ),
  category_id: z.nullable(z.uuid('Pick a category from the list.')),
}).check(
  z.refine((values) => values.due_time === null || values.due_date !== null, {
    message: 'Set a due date before choosing a reminder time.',
    path: ['due_time'],
  })
);

export type TodoEditInput = Omit<z.infer<typeof todoEditSchema>, 'due_date' | 'due_time'> & {
  due_date: DateString | null;
  due_time: TimeString | null;
};
