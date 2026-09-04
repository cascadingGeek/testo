import { onlineManager } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { themeColors } from '@/core/theme-colors';

/**
 * The in-app answer to "tell me when I'm offline".
 *
 * A push notification cannot reach a device that has no connection, and a
 * local one would be telling the user something they can see in their status
 * bar. What they actually cannot see is whether their last edit reached the
 * server — so this appears where they are already looking, and disappears on
 * its own when the connection returns.
 */
export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(150)}
      className="flex-row items-center gap-2 bg-muted px-4 py-2"
      accessibilityRole="alert"
    >
      <CloudOff size={14} color={themeColors.mutedForeground} />
      <Text className="flex-1 text-xs text-muted-foreground">
        Offline. Changes will be sent when you reconnect.
      </Text>
    </Animated.View>
  );
}

/** Reads the same online state the query client pauses on, so the two agree. */
function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setIsOnline), []);

  return isOnline;
}
