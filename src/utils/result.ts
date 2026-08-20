export type Result<TData = undefined> =
  | { ok: true; data: TData }
  | { ok: false; message: string };

export function ok(): Result;
export function ok<TData>(data: TData): Result<TData>;
export function ok<TData>(data?: TData): Result<TData | undefined> {
  return { ok: true, data };
}

export function err(message: string): Result<never> {
  return { ok: false, message };
}
