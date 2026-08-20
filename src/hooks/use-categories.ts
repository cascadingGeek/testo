import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createCategory, deleteCategory, fetchCategories } from '@/api/categories';
import { toMessage, unwrap } from '@/lib/query-client';
import { categoryKeys, todoKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import type { Category } from '@/types/todo';
import { err, ok, type Result } from '@/utils/result';

const CATEGORY_COLORS = ['#64748B', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

export function useCategories() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user.id);

  const query = useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => unwrap(fetchCategories()),
  });

  const categories = query.data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      if (!userId) throw new Error('You are signed out.');

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

      // Postgres nulled category_id on the affected todos and the response
      // does not say which, so refetch rather than guess.
      queryClient.invalidateQueries({ queryKey: todoKeys.all });
    },
  });

  const addCategory = useCallback(
    async (name: string): Promise<Result<Category>> => {
      try {
        return ok(await createMutation.mutateAsync(name));
      } catch (error) {
        return err(toMessage(error));
      }
    },
    [createMutation]
  );

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

  return {
    categories,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
    reload: query.refetch,
    addCategory,
    removeCategory,
  };
}
