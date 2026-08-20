import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { registerWithEmail } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { FormField } from '@/components/form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { registerSchema } from '@/schemas/auth';
import { toFieldErrors } from '@/utils/form-errors';

type Field = 'email' | 'password' | 'confirmPassword';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit() {
    setFormError(null);

    const parsed = registerSchema.safeParse({ email: email.trim(), password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await registerWithEmail(parsed.data);
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // No session issued, so nothing will redirect us away from this screen.
    if (result.data.needsEmailConfirmation) setAwaitingConfirmation(true);
  }

  if (awaitingConfirmation) {
    return (
      <AuthScreenLayout
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email.trim()}. Open it to activate your account.`}
      >
        <Link href="/login" className="font-medium text-primary">
          Back to sign in
        </Link>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Create account" subtitle="Start organising your day in a minute.">
      <View className="gap-4">
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <FormField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          placeholder="Type it again"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        {formError ? (
          <View className="rounded-md bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{formError}</Text>
          </View>
        ) : null}

        <Button onPress={handleSubmit} isDisabled={isSubmitting}>
          {isSubmitting ? <ButtonSpinner /> : null}
          <ButtonText>{isSubmitting ? 'Creating account…' : 'Create account'}</ButtonText>
        </Button>

        <View className="flex-row justify-center gap-1">
          <Text className="text-muted-foreground">Already registered?</Text>
          <Link href="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </View>
      </View>
    </AuthScreenLayout>
  );
}
