import { z } from 'zod';

const email = z.email('Enter a valid email address.');

export const loginSchema = z.object({
  email,
  // Deliberately NOT the 8-character rule. On login we only check that
  // something was typed — enforcing today's policy here would lock out
  // anyone who registered under an older, shorter one.
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
