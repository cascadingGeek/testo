import { AuthError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { LoginInput, RegisterInput } from '@/schemas/auth';
import { err, ok, type Result } from '@/utils/result';

/** Codes are stable; error.message is written for developers and changes. */
function toMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      // Vague on purpose: a specific message turns login into an account oracle.
      return 'Email or password is incorrect.';
    case 'email_not_confirmed':
      return 'Confirm your email address before signing in.';
    case 'email_exists':
    case 'user_already_exists':
      return 'An account with that email already exists.';
    case 'weak_password':
      return 'That password is too weak. Try a longer one.';
    case 'email_address_invalid':
      return 'That email address is not valid.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'user_banned':
      return 'This account has been suspended.';
    case 'signup_disabled':
      return 'New sign-ups are currently disabled.';
    case 'validation_failed':
      return 'Check the details you entered and try again.';
    default:
      if (__DEV__) console.warn('[auth] unmapped error', error.code, error.message);
      return 'Something went wrong. Please try again.';
  }
}

export async function registerWithEmail(
  input: RegisterInput
): Promise<Result<{ needsEmailConfirmation: boolean }>> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) return err(toMessage(error));

  // Sign-up succeeds without a session when the project requires confirmation.
  return ok({ needsEmailConfirmation: data.session === null });
}

export async function signInWithEmail(input: LoginInput): Promise<Result> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) return err(toMessage(error));
  return ok();
}

export async function signOut(): Promise<Result> {
  const { error } = await supabase.auth.signOut();

  if (error) return err(toMessage(error));
  return ok();
}
