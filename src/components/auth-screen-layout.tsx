import { Image } from 'expo-image';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type AuthScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  return (
    <KeyboardAvoidingView
      // Android's window already resizes; adding padding double-counts it.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)} className="gap-6">
          <View className="gap-3">
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 56, height: 56, borderRadius: 14 }}
              // expo-image decodes off the JS thread and fades in instead of
              // popping — the difference is visible on a cold start.
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">{title}</Text>
              <Text className="text-base text-muted-foreground">{subtitle}</Text>
            </View>
          </View>
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
