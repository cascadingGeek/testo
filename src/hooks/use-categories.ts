import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createCategory, deleteCategory, fetchCategories } from '@/api/categories';
import { toMessage, toResult, unwrap } from '@/lib/query-client';
import { categoryKeys, todoKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import type { Category } from '@/types/todo';
import type { Result } from '@/utils/result';

const CATEGORY_COLORS = ['#64748B', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

/**
 * Indexing by categories.length collides as soon as one is deleted — delete
 * the third of four and the next one reuses a colour still in use. The dot is
 * the only thing distinguishing chips, so prefer a colour nobody has.
 */
function nextColor(categories: Category[]): string {
  const taken = new Set(categories.map((category) => category.color));
  return (
    CATEGORY_COLORS.find((color) => !taken.has(color)) ??
    CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]
  );
}

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

      const color = nextColor(categories);
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

  // mutateAsync, not the mutation object: the object is rebuilt every render.
  /* eslint-disable react-hooks/exhaustive-deps */
  const addCategory = useCallback(
    (name: string): Promise<Result<Category>> => toResult(createMutation.mutateAsync(name)),
    [createMutation.mutateAsync]
  );

  const removeCategory = useCallback(
    (id: string) => toResult(removeMutation.mutateAsync(id)),
    [removeMutation.mutateAsync]
  );

  /* eslint-enable react-hooks/exhaustive-deps */

  return {
    categories,
    isLoading: query.isPending,
    error: query.error ? toMessage(query.error) : null,
    reload: query.refetch,
    addCategory,
    removeCategory,
  };
}
