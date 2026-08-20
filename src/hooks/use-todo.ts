import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { deleteTodo, fetchTodo, updateTodo, type TodoWithCategory } from '@/api/todos';
import { toMessage, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';
import type { TodoEditInput } from '@/schemas/todo';
import { err, ok, type Result } from '@/utils/result';

export function useTodo(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => unwrap(fetchTodo(id)),

    // Seed from the list so the screen opens instantly. Without the timestamp
    // the seeded row would count as fresh and never revalidate.
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
