import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

type AuthScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

/**
 * Shared chrome for the login and register screens: centred card, keyboard
 * handling, and a scroll container so short phones can still reach the
 * submit button once the keyboard is up.
 */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  return (
    <KeyboardAvoidingView
      // iOS slides the whole view; Android's window already resizes, and
      // applying 'padding' there double-counts the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">{title}</Text>
            <Text className="text-base text-muted-foreground">{subtitle}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
