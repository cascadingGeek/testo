import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { todoKeys } from '@/features/todos/todo-keys';
import type { TodoEditInput } from '@/features/todos/todo-schemas';
import {
  deleteTodo,
  fetchTodo,
  updateTodo,
  type TodoWithCategory,
} from '@/features/todos/todos-api';
import { toMessage, unwrap } from '@/lib/query';
import { err, ok, type Result } from '@/lib/result';

export function useTodo(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => unwrap(fetchTodo(id)),

    /**
     * The list already fetched this row. Seeding from it means the detail
     * screen renders instantly with no spinner, and the request only happens
     * if that cached copy is stale.
     *
     * initialDataUpdatedAt is what makes that work: without it the seeded
     * data would be treated as fresh right now, and a genuinely old row
     * would never be revalidated.
     */
    initialData: () =>
      queryClient
        .getQueryData<TodoWithCategory[]>(todoKeys.list())
        ?.find((todo) => todo.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(todoKeys.list())?.dataUpdatedAt,
  });

  const syncCaches = useCallback(
    (todo: TodoWithCategory) => {
      queryClient.setQueryData(todoKeys.detail(todo.id), todo);
      queryClient.setQueryData<TodoWithCategory[]>(todoKeys.list(), (current = []) =>
        current.map((item) => (item.id === todo.id ? todo : item))
      );
    },
    [queryClient]
  );

  const saveMutation = useMutation({
    mutationFn: (input: TodoEditInput) =>
      unwrap(
        updateTodo(id, {
          title: input.title,
          // Empty string is not the same as "no description".
          description: input.description.length > 0 ? input.description : null,
          priority: input.priority,
          due_date: input.due_date,
          category_id: input.category_id,
        })
      ),
    onSuccess: syncCaches,
  });

  const toggleMutation = useMutation({
    mutationFn: (completed: boolean) => unwrap(updateTodo(id, { completed })),
    onSuccess: syncCaches,
  });

  const removeMutation = useMutation({
    mutationFn: () => unwrap(deleteTodo(id)),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: todoKeys.detail(id) });
      queryClient.setQueryData<TodoWithCategory[]>(todoKeys.list(), (current = []) =>
        current.filter((item) => item.id !== id)
      );
    },
  });

  const save = useCallback(
    async (input: TodoEditInput): Promise<Result> => {
      try {
        await saveMutation.mutateAsync(input);
        return ok();
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [saveMutation]
  );

  const toggleCompleted = useCallback(async (): Promise<Result> => {
    if (!query.data) return err('Nothing to update.');

    try {
      await toggleMutation.mutateAsync(!query.data.completed);
      return ok();
    } catch (error) {
      return err(toMessage(error));
    }
  }, [query.data, toggleMutation]);

  const remove = useCallback(async (): Promise<Result> => {
    try {
      await removeMutation.mutateAsync();
      return ok();
    } catch (error) {
      return err(toMessage(error));
    }
  }, [removeMutation]);

  return {
    todo: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
    reload: query.refetch,
    save,
    toggleCompleted,
    remove,
  };
}
