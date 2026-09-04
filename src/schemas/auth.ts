import * as z from 'zod/mini';

const email = z.email('Enter a valid email address.');

export const loginSchema = z.object({
  email,
  // Not the 8-char rule: that would lock out anyone who registered earlier.
  password: z.string().check(z.minLength(1, 'Enter your password.')),
});

export const registerSchema = z
  .object({
    email,
    password: z.string().check(z.minLength(8, 'Password must be at least 8 characters.')),
    confirmPassword: z.string(),
  })
  .check(
    z.refine((values) => values.password === values.confirmPassword, {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    })
  );

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: z.string().check(z.minLength(8, 'Password must be at least 8 characters.')),
    confirmPassword: z.string(),
  })
  .check(
    z.refine((values) => values.password === values.confirmPassword, {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    })
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
