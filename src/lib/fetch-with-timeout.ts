/**
 * A socket that hangs — a captive portal, a tunnel, a cell handover — never
 * errors and never resolves, so without a deadline a screen's spinner stays up
 * forever. Fifteen seconds is well past a slow-but-working request and well
 * inside a user's patience.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Installed as the Supabase client's `fetch`, so every PostgREST and auth
 * request inherits the deadline rather than each call site remembering to.
 * An aborted request surfaces as a normal failure, which the retry predicate
 * and the existing error UI already know how to handle.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const caller = init?.signal;

  if (caller?.aborted) return Promise.reject(abortReason(caller));

  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forward = () => controller.abort();
  caller?.addEventListener('abort', forward);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    caller?.removeEventListener('abort', forward);
  });
}

function abortReason(signal: AbortSignal): Error {
  const error = new Error('Request aborted');
  error.name = 'AbortError';
  return signal.reason instanceof Error ? signal.reason : error;
}
