import { QueryClient } from '@tanstack/react-query';

import { AppError } from '@/core/app-error';
import { err, ok, UNKNOWN_ERROR_CODE, type Result } from '@/utils/result';

const FALLBACK = 'Something went wrong. Please try again.';

/**
 * Our API layer returns Results; TanStack Query signals failure by throwing.
 * The code travels with the message so retry and reporting can both key on it.
 */
export async function unwrap<TData>(promise: Promise<Result<TData>>): Promise<TData> {
  const result = await promise;
  if (!result.ok) throw new AppError(result.message, result.code);
  return result.data;
}

export function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK;
}

export function toCode(error: unknown): string {
  return error instanceof AppError ? error.code : UNKNOWN_ERROR_CODE;
}

/**
 * The other direction: mutateAsync rejects, screens expect a Result. Pairs
 * with unwrap so the throw/Result boundary is described in one file.
 */
export async function toResult<TData>(promise: Promise<TData>): Promise<Result<TData>> {
  try {
    return ok(await promise);
  } catch (error) {
    return err(toMessage(error), toCode(error));
  }
}

const MAX_RETRIES = 2;

/**
 * An RLS denial, a missing row or a constraint violation returns the same
 * answer however many times it is asked, so retrying only delays the error the
 * user is waiting for. Only transport failures get a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return error instanceof AppError ? error.retryable : true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry },
  },
});
