import { AppError, NETWORK_ERROR_CODE } from '@/core/app-error';
import { queryClient, toCode, toMessage, toResult, unwrap } from '@/lib/query-client';
import { err, ok, UNKNOWN_ERROR_CODE } from '@/utils/result';

describe('unwrap', () => {
  it('returns the data of a successful Result', async () => {
    await expect(unwrap(Promise.resolve(ok(42)))).resolves.toBe(42);
  });

  it('throws the message of a failed Result so TanStack Query sees it', async () => {
    await expect(unwrap(Promise.resolve(err('nope')))).rejects.toThrow('nope');
  });

  it('carries the code across the boundary', async () => {
    await expect(unwrap(Promise.resolve(err('denied', '42501')))).rejects.toMatchObject({
      code: '42501',
    });
  });
});

describe('toResult', () => {
  it('wraps a resolved promise', async () => {
    await expect(toResult(Promise.resolve(42))).resolves.toEqual({ ok: true, data: 42 });
  });

  it('turns a rejection into a failed Result rather than propagating', async () => {
    await expect(toResult(Promise.reject(new Error('nope')))).resolves.toEqual({
      ok: false,
      message: 'nope',
      code: UNKNOWN_ERROR_CODE,
    });
  });

  it('round-trips the code, so a screen sees the same failure the API reported', async () => {
    const result = await toResult(unwrap(Promise.resolve(err('denied', '42501'))));
    expect(result).toEqual({ ok: false, message: 'denied', code: '42501' });
  });

  it('handles a non-Error rejection', async () => {
    await expect(toResult(Promise.reject('a string'))).resolves.toEqual({
      ok: false,
      message: 'Something went wrong. Please try again.',
      code: UNKNOWN_ERROR_CODE,
    });
  });
});

describe('toMessage / toCode', () => {
  it('never returns an empty string', () => {
    expect(toMessage(undefined)).toBeTruthy();
    expect(toMessage(null)).toBeTruthy();
    expect(toMessage({})).toBeTruthy();
  });

  it('reports unknown for anything that is not an AppError', () => {
    expect(toCode(new Error('plain'))).toBe(UNKNOWN_ERROR_CODE);
  });
});

describe('AppError.retryable', () => {
  it('retries transport failures', () => {
    expect(new AppError('offline', NETWORK_ERROR_CODE).retryable).toBe(true);
    expect(new AppError('busy', '53300').retryable).toBe(true);
  });

  it('does not retry a decision the server already made', () => {
    expect(new AppError('denied', '42501').retryable).toBe(false);
    expect(new AppError('missing', 'PGRST116').retryable).toBe(false);
    expect(new AppError('bad value', '23514').retryable).toBe(false);
  });
});

describe('the query client retry predicate', () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as (
    failureCount: number,
    error: unknown
  ) => boolean;

  it('stops immediately on a permanent failure', () => {
    expect(retry(0, new AppError('denied', '42501'))).toBe(false);
  });

  it('retries a transport failure up to twice', () => {
    const offline = new AppError('offline', NETWORK_ERROR_CODE);
    expect(retry(0, offline)).toBe(true);
    expect(retry(1, offline)).toBe(true);
    expect(retry(2, offline)).toBe(false);
  });

  it('retries an unrecognised error, since we cannot prove it is permanent', () => {
    expect(retry(0, new Error('who knows'))).toBe(true);
  });
});
