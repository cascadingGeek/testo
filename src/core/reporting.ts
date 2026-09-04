import { AppError } from '@/core/app-error';

/**
 * Where diagnostics go. Codes and scopes are safe to send; messages and row
 * contents are not, so nothing here forwards either — `toPostgrestFailure`
 * already keeps the two separated and this preserves that split.
 */
export type ErrorReport = {
  /** Which part of the app failed: 'todos', 'auth', 'render:root'. */
  scope: string;
  /** The stable identity of the failure. Never a display string. */
  code: string;
  /** Free-form, non-identifying detail — a route name, a query key. */
  context?: Record<string, string | number | boolean>;
};

export type ErrorSink = (report: ErrorReport) => void;

let sink: ErrorSink | null = null;

/**
 * Called once at startup with a real transport (Sentry, Bugsnag, an HTTP
 * endpoint). Left unset, reports are logged in development and dropped in
 * production — which is the current state, and the reason H-7 exists.
 */
export function setErrorSink(next: ErrorSink | null): void {
  sink = next;
}

export function reportError(report: ErrorReport): void {
  if (__DEV__) {
    console.warn(`[${report.scope}] ${report.code}`, report.context ?? {});
  }

  try {
    sink?.(report);
  } catch {
    // A broken reporter must never become the error the user sees.
  }
}

/** Convenience for the render path, where all we hold is a thrown value. */
export function reportThrown(scope: string, error: unknown): void {
  reportError({
    scope,
    code: error instanceof AppError ? error.code : 'render_error',
    context: { name: error instanceof Error ? error.name : typeof error },
  });
}
