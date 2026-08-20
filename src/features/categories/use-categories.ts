import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
} from '@/features/categories/categories-api';
import { categoryKeys, todoKeys } from '@/features/todos/todo-keys';
import { toMessage, unwrap } from '@/lib/query';
import { err, ok, type Result } from '@/lib/result';
import type { Category } from '@/types/todo';

/** Palette offered when creating a category. Matches the hex CHECK constraint. */
const CATEGORY_COLORS = [
  '#64748B',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
] as const;

export function useCategories() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => unwrap(fetchCategories()),
  });

  const categories = query.data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      if (!userId) throw new Error('You are signed out.');

      // Cycle the palette by how many categories exist, so a new one is
      // visually distinct without asking the user to pick a colour up front.
      const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
      return unwrap(createCategory({ name, color, userId }));
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(categoryKeys.list(), (current = []) =>
        [...current, category].sort((a, b) => a.name.localeCompare(b.name))
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => unwrap(deleteCategory(id)),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Category[]>(categoryKeys.list(), (current = []) =>
        current.filter((category) => category.id !== id)
      );

      // Deleting a category nulls category_id on its todos, in the database,
      // via ON DELETE SET NULL. Our cached todos still carry the old category,
      // and we have no response body describing which rows changed — so this
      // is the case where invalidating and refetching is the honest answer.
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });

  const removeCategory = useCallback(
    async (id: string): Promise<Result> => {
      try {
        await removeMutation.mutateAsync(id);
        return ok();
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [removeMutation]
  );

  const addCategory = useCallback(
    async (name: string): Promise<Result<Category>> => {
      try {
        const category = await createMutation.mutateAsync(name);
        return ok(category);
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [createMutation]
  );

  return {
    categories,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
    reload: query.refetch,
    addCategory,
    removeCategory,
  };
}
