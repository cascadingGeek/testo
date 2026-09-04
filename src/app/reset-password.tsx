import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { exchangeCodeForSession, updatePassword } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ControlledFormField } from '@/components/controlled-form-field';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/auth';

/**
 * Deliberately a top-level route rather than one inside (auth): exchanging the
 * recovery code establishes a session, and the (auth) gate redirects away the
 * moment a session exists — which would bounce the user to the dashboard
 * before they could choose a new password.
 */
export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [exchange, setExchange] = useState<'pending' | 'ready' | string>('pending');

  // Recovery codes are single-use; StrictMode's double effect would spend it.
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    if (!code) {
      setExchange('That reset link is not valid. Request a new one.');
      return;
    }

    exchangeCodeForSession(code).then((result) => {
      setExchange(result.ok ? 'ready' : result.message);
    });
  }, [code]);

  const { control, handleSubmit, formState } = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updatePassword(values.password);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    router.replace('/');
  });

  if (exchange === 'pending') return <FullScreenLoader />;

  if (exchange !== 'ready') {
    return (
      <AuthScreenLayout title="Link expired" subtitle={exchange}>
        <View className="items-center">
          <Link href="/forgot-password" className="font-medium text-primary">
            Request a new link
          </Link>
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Choose a new password" subtitle="You will be signed in afterwards.">
      <View className="gap-4">
        <ControlledFormField
          control={control}
          name="password"
          label="New password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <ControlledFormField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          placeholder="Type it again"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
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
            <KeyRound size={18} color={themeColors.primaryForeground} />
          )}
          <ButtonText>{formState.isSubmitting ? 'Saving…' : 'Save password'}</ButtonText>
        </Button>
      </View>
    </AuthScreenLayout>
  );
}
