import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { signInWithEmail } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { FormField } from '@/components/form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { loginSchema } from '@/schemas/auth';
import { toFieldErrors } from '@/utils/form-errors';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setFormError(null);

    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await signInWithEmail(parsed.data);
    setIsSubmitting(false);

    if (!result.ok) setFormError(result.message);
    // On success the auth store updates and the (auth) gate redirects.
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
