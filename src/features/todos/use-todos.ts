import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { todoKeys } from '@/features/todos/todo-keys';
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  setTodoCompleted,
  type TodoWithCategory,
} from '@/features/todos/todos-api';
import { toMessage, unwrap } from '@/lib/query';
import { err, ok, type Result } from '@/lib/result';

/**
 * Server state for the todo list, backed by one shared cache.
 *
 * The surface of this hook is unchanged from the hand-rolled version — the
 * screens using it did not need a single edit. That is what putting data
 * access behind a hook bought us: the entire data layer was replaced
 * underneath them.
 */
export function useTodos() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: todoKeys.list(),
    queryFn: () => unwrap(fetchTodos()),
  });

  const todos = query.data ?? [];

  /**
   * Writes the row the server returned straight into the cache instead of
   * refetching the whole list. This is the request you spotted as avoidable:
   * the mutation response already contains the fresh row.
   */
  const writeToCache = useCallback(
    (todo: TodoWithCategory, mode: 'upsert' | 'remove') => {
      queryClient.setQueryData<TodoWithCategory[]>(todoKeys.list(), (current = []) => {
        if (mode === 'remove') return current.filter((item) => item.id !== todo.id);

        const exists = current.some((item) => item.id === todo.id);
        return exists
          ? current.map((item) => (item.id === todo.id ? todo : item))
          : [todo, ...current];
      });

      // Keep the detail cache honest too, so opening this todo shows the
      // change immediately rather than the version it was last fetched with.
      if (mode === 'remove') queryClient.removeQueries({ queryKey: todoKeys.detail(todo.id) });
      else queryClient.setQueryData(todoKeys.detail(todo.id), todo);
    },
    [queryClient]
  );

  const createMutation = useMutation({
    mutationFn: (title: string) => {
      if (!userId) throw new Error('You are signed out.');
      return unwrap(createTodo({ title, userId }));
    },
    onSuccess: (todo) => writeToCache(todo, 'upsert'),
  });

  const toggleMutation = useMutation({
    mutationFn: (todo: TodoWithCategory) => unwrap(setTodoCompleted(todo.id, !todo.completed)),
    onSuccess: (todo) => writeToCache(todo, 'upsert'),
  });

  const removeMutation = useMutation({
    mutationFn: async (todo: TodoWithCategory) => {
      await unwrap(deleteTodo(todo.id));
      return todo;
    },
    onSuccess: (todo) => writeToCache(todo, 'remove'),
  });

  const addTodo = useCallback(
    async (title: string): Promise<Result> => {
      try {
        await createMutation.mutateAsync(title);
        return ok();
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [createMutation]
  );

  const toggleTodo = useCallback(
    async (todo: TodoWithCategory): Promise<Result> => {
      try {
        await toggleMutation.mutateAsync(todo);
        return ok();
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [toggleMutation]
  );

  const removeTodo = useCallback(
    async (id: string): Promise<Result> => {
      const todo = todos.find((item) => item.id === id);
      if (!todo) return err('That todo could not be found.');

      try {
        await removeMutation.mutateAsync(todo);
        return ok();
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [removeMutation, todos]
  );

  return {
    todos,
    isLoading: query.isPending,
    isRefreshing: query.isRefetching,
    error: query.error ? toMessage(query.error) : null,
    refresh: query.refetch,
    addTodo,
    toggleTodo,
    removeTodo,
  };
}
