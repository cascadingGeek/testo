import { loginSchema, registerSchema } from '@/schemas/auth';

describe('loginSchema', () => {
  it('only checks that a password was typed', () => {
    // Enforcing today's policy at login would lock out anyone who registered
    // under an older, weaker one.
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = { email: 'a@b.co', password: 'longenough', confirmPassword: 'longenough' };

  it('accepts a matching pair', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces a minimum length', () => {
    expect(
      registerSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' }).success
    ).toBe(false);
  });

  it('reports a mismatch against the confirm field, not the password field', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });
});
