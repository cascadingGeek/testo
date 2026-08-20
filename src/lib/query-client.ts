import { QueryClient } from '@tanstack/react-query';

import type { Result } from '@/utils/result';

/** Our API layer returns Results; TanStack Query signals failure by throwing. */
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
    queries: { staleTime: 30_000, retry: 2 },
  },
});
