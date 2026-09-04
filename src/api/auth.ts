import { AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { NETWORK_ERROR_CODE } from '@/core/app-error';
import { reportError } from '@/core/reporting';
import { supabase } from '@/lib/supabase';
import type { ForgotPasswordInput, LoginInput, RegisterInput } from '@/schemas/auth';
import { err, ok, UNKNOWN_ERROR_CODE, type Result } from '@/utils/result';

/**
 * auth-js raises AuthRetryableFetchError with no code when the request never
 * reached the server, so an absent code is the offline signal.
 */
function classify(error: AuthError): string {
  return error.code ?? (error.status === undefined ? NETWORK_ERROR_CODE : UNKNOWN_ERROR_CODE);
}

/** Codes are stable; error.message is written for developers and changes. */
function toFailure(error: AuthError): Result<never> {
  return err(toMessage(error), classify(error));
}

function toMessage(error: AuthError): string {
  if (classify(error) === NETWORK_ERROR_CODE) {
    return 'You appear to be offline. Check your connection and try again.';
  }

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
      reportError({ scope: 'auth', code: classify(error), context: { unmapped: true } });
      return 'Something went wrong. Please try again.';
  }
}

export async function registerWithEmail(
  input: RegisterInput
): Promise<Result<{ needsEmailConfirmation: boolean }>> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // Without this the confirmation link goes to the project's Site URL —
    // http://localhost:3000 by default, which on a phone is a dead page.
    options: { emailRedirectTo: redirectTo('/auth-callback') },
  });

  if (error) return toFailure(error);

  // Sign-up succeeds without a session when the project requires confirmation.
  return ok({ needsEmailConfirmation: data.session === null });
}

export async function signInWithEmail(input: LoginInput): Promise<Result> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) return toFailure(error);
  return ok();
}

export async function signOut(): Promise<Result> {
  const { error } = await supabase.auth.signOut();

  if (error) return toFailure(error);
  return ok();
}

/**
 * Where an emailed link comes back to. Linking.createURL yields the testo://
 * scheme in a build and the exp:// host in Expo Go, so the same code works in
 * both — but every value it can produce must be in the Supabase project's
 * redirect allow-list or the link will be refused.
 */
function redirectTo(path: string): string {
  return Linking.createURL(path);
}

/**
 * Deliberately reports success whether or not the address exists. Saying "no
 * such account" would turn this form into an account-existence oracle, which
 * the login path is already careful not to be.
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<Result> {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: redirectTo('/reset-password'),
  });

  // Rate limiting is worth surfacing; anything else is not worth confirming.
  if (error && classify(error) === 'over_email_send_rate_limit') return toFailure(error);
  if (error && classify(error) === NETWORK_ERROR_CODE) return toFailure(error);
  return ok();
}

/** Turns the `code` on a recovery or confirmation link into a session. */
export async function exchangeCodeForSession(code: string): Promise<Result> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return toFailure(error);
  return ok();
}

/** Requires the session the recovery link just established. */
export async function updatePassword(password: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return toFailure(error);
  return ok();
}
