import { z } from 'zod';

const email = z.email('Enter a valid email address.');

export const loginSchema = z.object({
  email,
  // Not the 8-char rule: that would lock out anyone who registered earlier.
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z
  .object({
    email,
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
