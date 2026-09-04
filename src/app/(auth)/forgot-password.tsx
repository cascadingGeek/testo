import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Link } from 'expo-router';
import { MailCheck, Send } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { requestPasswordReset } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ControlledFormField } from '@/components/controlled-form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth';

export default function ForgotPasswordScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const { control, handleSubmit, formState } = useForm<ForgotPasswordInput>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await requestPasswordReset(values);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setIsSent(true);
  });

  // Identical whether or not the address exists — anything else would make
  // this form a way to find out who has an account.
  if (isSent) {
    return (
      <AuthScreenLayout
        title="Check your email"
        subtitle="If that address has an account, a reset link is on its way. The link opens straight back into the app."
      >
        <View className="items-center gap-6">
          <MailCheck size={48} color={themeColors.primary} />
          <Link href="/login" className="font-medium text-primary">
            Back to sign in
          </Link>
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
    >
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
            <Send size={18} color={themeColors.primaryForeground} />
          )}
          <ButtonText>{formState.isSubmitting ? 'Sending…' : 'Send reset link'}</ButtonText>
        </Button>

        <View className="flex-row justify-center gap-1">
          <Text className="text-muted-foreground">Remembered it?</Text>
          <Link href="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </View>
      </View>
    </AuthScreenLayout>
  );
}
