import type { Enums, Tables, TablesUpdate } from '@/types/database';

/** A todo as it comes back from the database. Every column is present. */
export type Todo = Tables<'todos'>;

/** The shape accepted when updating a todo. Every column is optional. */
export type TodoUpdate = TablesUpdate<'todos'>;

/** 'low' | 'medium' | 'high' — kept in sync with the Postgres enum. */
export type TodoPriority = Enums<'todo_priority'>;

/** A category as it comes back from the database. */
export type Category = Tables<'categories'>;
