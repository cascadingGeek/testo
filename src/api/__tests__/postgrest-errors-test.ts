import type { PostgrestError } from '@supabase/supabase-js';

import { NETWORK_ERROR_CODE } from '@/core/app-error';
import { toPostgrestFailure } from '@/api/postgrest-errors';

const messageOf = (...args: Parameters<typeof toPostgrestFailure>) => {
  const result = toPostgrestFailure(...args);
  return result.ok ? null : result.message;
};

const pgError = (code: string): PostgrestError =>
  ({ code, message: 'raw developer text', details: '', hint: '', name: 'PostgrestError' }) as PostgrestError;

describe('toPostgrestFailure', () => {
  it('maps codes any table can raise', () => {
    expect(messageOf('todos', pgError('42501'))).toBe('You do not have permission to do that.');
    expect(messageOf('todos', pgError('23514'))).toBe('That value is not allowed.');
  });

  it('lets a module override the wording', () => {
    expect(
      messageOf('categories', pgError('23505'), {
        '23505': 'You already have a category with that name.',
      })
    ).toBe('You already have a category with that name.');
  });

  it('falls back safely for an unmapped code, and tells the developer', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(messageOf('todos', pgError('XX999'))).toBe(
      'Something went wrong. Please try again.'
    );
    expect(warn).toHaveBeenCalledWith('[todos] XX999', { unmapped: true });

    warn.mockRestore();
  });

  it('never leaks the raw error message to a user', () => {
    // error.message is written for developers and can name columns or
    // constraints. It must not reach the UI.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(messageOf('todos', pgError('XX999'))).not.toContain('raw developer text');
    warn.mockRestore();
  });

  it('treats an absent code as offline rather than as an unknown server error', () => {
    // postgrest-js returns an error with no code when fetch itself failed, so
    // this is the one shape that means "the request never arrived".
    expect(messageOf('todos', { message: 'x' } as PostgrestError)).toBe(
      'You appear to be offline. Check your connection and try again.'
    );
  });
});

describe('the code carried on the failure', () => {
  it('preserves the SQLSTATE so retry and reporting can use it', () => {
    expect(toPostgrestFailure('todos', pgError('42501'))).toMatchObject({ code: '42501' });
  });

  it('reads an empty code as a transport failure, which is how postgrest-js reports a dead fetch', () => {
    const failure = toPostgrestFailure('todos', pgError(''));
    expect(failure).toMatchObject({ code: NETWORK_ERROR_CODE });
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.message).toMatch(/offline/i);
  });

  it('keeps the code for an unmapped error, so the fallback message is still diagnosable', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(toPostgrestFailure('todos', pgError('XX999'))).toMatchObject({ code: 'XX999' });
    warn.mockRestore();
  });
});
