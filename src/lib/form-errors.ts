import type { ZodError } from 'zod';

/**
 * Turns a ZodError into { fieldName: firstMessage }.
 *
 * Only the first issue per field is kept: showing a user three complaints
 * about one input at once is noise, not help.
 */
export function toFieldErrors<TField extends string>(
  error: ZodError
): Partial<Record<TField, string>> {
  const fieldErrors: Partial<Record<TField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in fieldErrors)) {
      fieldErrors[field as TField] = issue.message;
    }
  }

  return fieldErrors;
}
