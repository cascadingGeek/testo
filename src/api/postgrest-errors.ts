import type { PostgrestError } from '@supabase/supabase-js';

import { NETWORK_ERROR_CODE } from '@/core/app-error';
import { reportError } from '@/core/reporting';
import { err, type Result } from '@/utils/result';

/** SQLSTATE codes any table can raise. Values are stable across PG versions. */
const SHARED_MESSAGES: Record<string, string> = {
  '42501': 'You do not have permission to do that.', // insufficient_privilege — RLS said no
  '23503': 'That item no longer exists.', // foreign_key_violation
  '23514': 'That value is not allowed.', // check_violation
  '23505': 'That already exists.', // unique_violation
  '22P02': 'That item could not be found.', // invalid_text_representation — a malformed id
  PGRST116: 'That item could not be found.', // no rows where one was expected
  [NETWORK_ERROR_CODE]: 'You appear to be offline. Check your connection and try again.',
};

const FALLBACK = 'Something went wrong. Please try again.';

/**
 * postgrest-js reports a failed fetch as an error object with an empty code
 * rather than rejecting, so an absent code means the request never reached the
 * server. Everything else is a decision Postgres or PostgREST made.
 */
function classify(error: PostgrestError): string {
  return error.code && error.code.length > 0 ? error.code : NETWORK_ERROR_CODE;
}

/**
 * Codes are the contract; error.message is written for developers and changes
 * between releases, so it never reaches a user. `overrides` is for wording a
 * specific table needs — the unique constraint on categories, say.
 */
export function toPostgrestFailure(
  scope: string,
  error: PostgrestError,
  overrides: Record<string, string> = {}
): Result<never> {
  const code = classify(error);
  const message = overrides[code] ?? SHARED_MESSAGES[code];
  if (message) return err(message, code);

  // An unmapped code is the signal that a migration or a policy changed under
  // the client, so it has to survive the production build.
  reportError({ scope, code, context: { unmapped: true } });
  return err(FALLBACK, code);
}
