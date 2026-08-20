import type { Enums, Tables, TablesUpdate } from '@/types/database';

export type Todo = Tables<'todos'>;
export type TodoUpdate = TablesUpdate<'todos'>;
export type TodoPriority = Enums<'todo_priority'>;
export type Category = Tables<'categories'>;
