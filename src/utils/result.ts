/** The code that classifies a failure. `message` is for the user; `code` is for us. */
export const UNKNOWN_ERROR_CODE = 'unknown';

export type Result<TData = undefined> =
  | { ok: true; data: TData }
  | { ok: false; message: string; code: string };

export function ok(): Result;
export function ok<TData>(data: TData): Result<TData>;
export function ok<TData>(data?: TData): Result<TData | undefined> {
  return { ok: true, data };
}

export function err(message: string, code: string = UNKNOWN_ERROR_CODE): Result<never> {
  return { ok: false, message, code };
}
