import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Link } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { signInWithEmail } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ControlledFormField } from '@/components/controlled-form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { loginSchema, type LoginInput } from '@/schemas/auth';

export default function LoginScreen() {
  const [formError, setFormError] = useState<string | null>(null);

  // The schema is the single source of validation; RHF owns the field state,
  // the error messages and isSubmitting.
  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInWithEmail(values);

    if (!result.ok) setFormError(result.message);
    // On success the auth store updates and the (auth) gate redirects.
  });

  return (
    <AuthScreenLayout title="Welcome back" subtitle="Sign in to pick up where you left off.">
      <View className="gap-4">
        <ControlledFormField
          control={control}
          name="email"
          label="Email"
          trimOnBlur
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        <ControlledFormField
          control={control}
          name="password"
          label="Password"
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />

        {formError ? (
          <View className="rounded-md bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{formError}</Text>
          </View>
        ) : null}

        <Button onPress={onSubmit} isDisabled={formState.isSubmitting}>
          {formState.isSubmitting ? (
            <ButtonSpinner />
          ) : (
            <LogIn size={18} color={themeColors.primaryForeground} />
          )}
          <ButtonText>{formState.isSubmitting ? 'Signing in…' : 'Sign in'}</ButtonText>
        </Button>

        <View className="items-center">
          <Link href="/forgot-password" className="text-sm text-primary">
            Forgot your password?
          </Link>
        </View>

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
