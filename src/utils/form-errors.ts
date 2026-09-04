import type { core } from 'zod/mini';

/** First message per field — three complaints about one input is noise. */
export function toFieldErrors<TField extends string>(
  error: core.$ZodError
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
