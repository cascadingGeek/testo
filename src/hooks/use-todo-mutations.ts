import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createTodo, deleteTodo, updateTodo, type TodoWithCategory } from '@/api/todos';
import {
  cancelNotificationsForTodo,
  requestScheduleRefresh,
} from '@/features/notifications/scheduler';
import { toResult, unwrap } from '@/lib/query-client';
import { todoKeys } from '@/lib/query-keys';
import {
  applyTodoChange,
  restoreTodoCaches,
  snapshotTodoCaches,
  type TodoCacheSnapshot,
} from '@/lib/todo-cache';
import type { TodoEditInput } from '@/schemas/todo';
import { useAuthStore } from '@/store/auth-store';

type SaveArgs = { id: string; input: TodoEditInput; baseUpdatedAt: string };

/**
 * Writes, separated from reads so the dashboard and the list share one copy
 * and neither re-renders on the other's pending state.
 */
export function useTodoMutations() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user.id);

  /**
   * The blunt instrument, kept for the writes whose effect on a list cannot be
   * worked out locally: a new row has no obvious sorted position, and an edit
   * can move a todo between buckets in ways that depend on the row it replaced.
   * Toggle and delete no longer come through here — see applyTodoChange.
   */
  const invalidateLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    queryClient.invalidateQueries({ queryKey: todoKeys.counts() });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => {
      if (!userId) throw new Error('You are signed out.');
      return unwrap(createTodo({ id, title, userId }));
    },
    onSuccess: () => {
      invalidateLists();
      requestScheduleRefresh();
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, input, baseUpdatedAt }: SaveArgs) =>
      unwrap(
        updateTodo(
          id,
          {
            title: input.title,
            description: input.description.length > 0 ? input.description : null,
            priority: input.priority,
            due_date: input.due_date,
            due_time: input.due_time,
            category_id: input.category_id,
          },
          baseUpdatedAt
        )
      ),
    onSuccess: (todo) => {
      queryClient.setQueryData(todoKeys.detail(todo.id), todo);
      invalidateLists();
      // A save can move the due date, the time or the priority, any of which
      // changes what should fire and when.
      requestScheduleRefresh();
    },
  });

  /**
   * Optimistic, because the round trip is what caused the bug: with no
   * feedback the user taps again, the second tap reads the same unflipped
   * value, and both writes send `completed: true`. Flipping the row on the
   * first tap removes the confusion and the stale second read together.
   */
  const toggleMutation = useMutation({
    mutationFn: (todo: TodoWithCategory) =>
      unwrap(updateTodo(todo.id, { completed: !todo.completed })),

    onMutate: async (todo): Promise<TodoCacheSnapshot> => {
      // Stop an in-flight refetch from landing on top of the patch.
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const snapshot = snapshotTodoCaches(queryClient);

      const next = { ...todo, completed: !todo.completed };
      queryClient.setQueryData(todoKeys.detail(todo.id), next);
      applyTodoChange(queryClient, { before: todo, after: next });

      /*
       * Completing a todo silences its own reminder straight away — being
       * reminded about something you just ticked off is the fastest way to
       * teach someone to turn notifications off. Reopening one needs the full
       * recompute, since its reminder has to be put back.
       */
      if (next.completed) cancelNotificationsForTodo(todo.id);
      else requestScheduleRefresh();

      return snapshot;
    },

    onError: (_error, todo, snapshot) => {
      restoreTodoCaches(queryClient, snapshot);
      queryClient.setQueryData(todoKeys.detail(todo.id), todo);
      // The optimistic cancel has to be undone too.
      requestScheduleRefresh();
    },

    // The server row is authoritative — it carries the new updated_at.
    onSuccess: (todo) => queryClient.setQueryData(todoKeys.detail(todo.id), todo),
  });

  const removeMutation = useMutation({
    mutationFn: (todo: TodoWithCategory) => unwrap(deleteTodo(todo.id)),

    onMutate: async (todo): Promise<TodoCacheSnapshot> => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const snapshot = snapshotTodoCaches(queryClient);

      applyTodoChange(queryClient, { before: todo, after: null });
      queryClient.removeQueries({ queryKey: todoKeys.detail(todo.id) });
      cancelNotificationsForTodo(todo.id);

      return snapshot;
    },

    onError: (_error, _todo, snapshot) => {
      restoreTodoCaches(queryClient, snapshot);
      requestScheduleRefresh();
    },
  });

  /*
   * These depend on `mutateAsync`, not on the mutation object: useMutation
   * builds a fresh result object every render, so depending on it would change
   * the callback identity every render and defeat the memo on TodoItem.
   * mutateAsync is the observer's `mutate`, bound once in its constructor.
   */
  /* eslint-disable react-hooks/exhaustive-deps */
  /** `id` is supplied by the caller and reused across retries — see createTodo. */
  const addTodo = useCallback(
    (id: string, title: string) => toResult(createMutation.mutateAsync({ id, title })),
    [createMutation.mutateAsync]
  );

  /**
   * `baseUpdatedAt` is the version the form was seeded from. Sending it makes
   * the write conditional, so a row edited elsewhere is reported rather than
   * silently overwritten.
   */
  const saveTodo = useCallback(
    (id: string, input: TodoEditInput, baseUpdatedAt: string) =>
      toResult(saveMutation.mutateAsync({ id, input, baseUpdatedAt })),
    [saveMutation.mutateAsync]
  );

  const toggleTodo = useCallback(
    (todo: TodoWithCategory) => toResult(toggleMutation.mutateAsync(todo)),
    [toggleMutation.mutateAsync]
  );

  const removeTodo = useCallback(
    (todo: TodoWithCategory) => toResult(removeMutation.mutateAsync(todo)),
    [removeMutation.mutateAsync]
  );

  /* eslint-enable react-hooks/exhaustive-deps */

  return { addTodo, saveTodo, toggleTodo, removeTodo };
}
