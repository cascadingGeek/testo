/**
 * The error identity that survives the Result boundary. Messages are written
 * for users and get reworded; codes are the contract, so retry decisions and
 * error reports both key on `code` and never on `message`.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }

  /** Whether a second attempt could plausibly succeed. */
  get retryable(): boolean {
    return isRetryableCode(this.code);
  }
}

/**
 * postgrest-js does not reject when fetch fails — it returns an error object
 * with `code: ''` and `status: 0` (PostgrestBuilder's catch deliberately
 * leaves code empty, since that field is reserved for upstream PostgREST and
 * Postgres errors). So an empty code means the request never reached the
 * server, which is the one case worth retrying.
 */
export const NETWORK_ERROR_CODE = 'network';

/** Set by our own timeout, not by the server. */
export const TIMEOUT_ERROR_CODE = 'timeout';

const RETRYABLE_CODES = new Set<string>([
  NETWORK_ERROR_CODE,
  TIMEOUT_ERROR_CODE,
  '53300', // too_many_connections
  '57014', // query_canceled — statement timeout
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

export function isRetryableCode(code: string): boolean {
  return RETRYABLE_CODES.has(code);
}
