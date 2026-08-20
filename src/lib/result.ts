/**
 * The single return shape for anything that talks to the network.
 *
 * Functions at this boundary do not throw: a wrong password and an offline
 * phone are ordinary outcomes, not exceptional ones, and a forgotten
 * try/catch should never be able to turn one into a crash screen.
 */
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
