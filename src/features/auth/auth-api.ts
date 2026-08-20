import { AuthError } from '@supabase/supabase-js';

import type { LoginInput, RegisterInput } from '@/features/auth/auth-schemas';
import { err, ok, type Result } from '@/lib/result';
import { supabase } from '@/lib/supabase';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Supabase error *codes* are stable; error.message is written for developers
 * and can change between releases. Translating in one place means no screen
 * ever renders a raw API string at a user.
 */
function toMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      // Intentionally vague. "No account with that email" would let anyone
      // test addresses to discover who has an account here.
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
      // A code we have not handled. The user gets something safe; the
      // developer gets the real thing in the console.
      if (__DEV__) console.warn('[auth] unmapped error', error.code, error.message);
      return FALLBACK_MESSAGE;
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

  // When the project requires email confirmation, sign-up succeeds but no
  // session is issued — the user is created, not signed in. That is the only
  // reliable way to tell the two configurations apart.
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
