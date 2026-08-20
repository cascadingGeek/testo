import { QueryClient } from '@tanstack/react-query';

import type { Result } from '@/lib/result';

/**
 * Bridges our Result convention to TanStack Query's, which signals failure by
 * throwing. The API layer keeps returning Results — that is where Postgres
 * error codes become sentences a user can read — and this unwraps them at the
 * one place the two conventions meet.
 */
export async function unwrap<TData>(promise: Promise<Result<TData>>): Promise<TData> {
  const result = await promise;
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30s. Within that window, switching tabs
      // reads the cache instead of refetching — which is the whole reason
      // this library is here.
      staleTime: 30_000,
      // Retrying a failed request twice on a flaky mobile connection is worth
      // it; retrying forever just delays telling the user something is wrong.
      retry: 2,
    },
  },
});
