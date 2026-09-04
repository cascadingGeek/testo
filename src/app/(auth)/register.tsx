import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Link } from 'expo-router';
import { MailCheck, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { registerWithEmail } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ControlledFormField } from '@/components/controlled-form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { registerSchema, type RegisterInput } from '@/schemas/auth';

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await registerWithEmail(values);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // No session issued, so nothing will redirect us away from this screen.
    if (result.data.needsEmailConfirmation) setConfirmationEmail(values.email);
  });

  if (confirmationEmail) {
    return (
      <AuthScreenLayout
        title="Check your email"
        subtitle={`We sent a confirmation link to ${confirmationEmail}. Open it to activate your account.`}
      >
        <View className="items-center gap-6 py-4">
          <MailCheck size={64} color={themeColors.primary} strokeWidth={1.25} />
          <Link href="/login" className="font-medium text-primary">
            Back to sign in
          </Link>
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout title="Create account" subtitle="Start organising your day in a minute.">
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
            <UserPlus size={18} color={themeColors.primaryForeground} />
          )}
          <ButtonText>{formState.isSubmitting ? 'Creating account…' : 'Create account'}</ButtonText>
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
