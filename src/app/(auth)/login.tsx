import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { FormField } from '@/components/form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { signInWithEmail } from '@/features/auth/auth-api';
import { loginSchema } from '@/features/auth/auth-schemas';
import { toFieldErrors } from '@/lib/form-errors';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setFormError(null);

    // Client-side check first: instant feedback, no wasted network round trip.
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await signInWithEmail(parsed.data);
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // Deliberately no navigation call here. supabase-js fires onAuthStateChange,
    // AuthProvider updates the session, and the (auth) layout redirects. One
    // source of truth for "where should this user be" instead of two.
  }

  return (
    <AuthScreenLayout title="Welcome back" subtitle="Sign in to pick up where you left off.">
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
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
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
          <ButtonText>{isSubmitting ? 'Signing in…' : 'Sign in'}</ButtonText>
        </Button>

        <View className="flex-row justify-center gap-1">
          <Text className="text-muted-foreground">No account yet?</Text>
          <Link href="/register" className="font-medium text-primary">
            Create one
          </Link>
        </View>
      </View>
    </AuthScreenLayout>
  );
}
