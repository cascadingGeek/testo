import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInDown.duration(280)} className="items-center gap-4 px-6 py-12">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-card">{icon}</View>

      <View className="gap-1.5">
        <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
        <Text className="text-center text-sm text-muted-foreground">{message}</Text>
      </View>

      {action}
    </Animated.View>
  );
}
