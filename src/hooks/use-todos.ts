import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
  type TodoWithCategory,
} from '@/api/todos';
import { toMessage, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { err, ok, type Result } from '@/utils/result';

export function useTodos() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user.id);

  const query = useQuery({
    queryKey: todoKeys.list(),
    queryFn: () => unwrap(fetchTodos()),
  });

  const todos = query.data ?? [];

  /** Mutations return the fresh row, so there is nothing to refetch. */
  const writeToCache = useCallback(
    (todo: TodoWithCategory, mode: 'upsert' | 'remove') => {
      queryClient.setQueryData<TodoWithCategory[]>(todoKeys.list(), (current = []) => {
        if (mode === 'remove') return current.filter((item) => item.id !== todo.id);

        return current.some((item) => item.id === todo.id)
          ? current.map((item) => (item.id === todo.id ? todo : item))
          : [todo, ...current];
      });

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
    mutationFn: (todo: TodoWithCategory) =>
      unwrap(updateTodo(todo.id, { completed: !todo.completed })),
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
