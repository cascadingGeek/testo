import type { ErrorBoundaryProps } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { reportThrown } from '@/core/reporting';
import { themeColors } from '@/core/theme-colors';

/**
 * Expo Router renders a route's `ErrorBoundary` export in place of the screen
 * that threw. Without one a render error unmounts the tree to a blank screen
 * with no way back, so both layouts export this.
 */
export function makeRouteErrorBoundary(scope: string) {
  return function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    useEffect(() => {
      reportThrown(scope, error);
    }, [error]);

    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          Something went wrong
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          This screen stopped working. Trying again is usually enough.
        </Text>

        {/* The thrown message is developer text; it stays out of the UI except in dev. */}
        {__DEV__ ? (
          <Text className="text-center text-xs text-destructive">{error.message}</Text>
        ) : null}

        <Button onPress={retry}>
          <RotateCcw size={18} color={themeColors.primaryForeground} />
          <ButtonText>Try again</ButtonText>
        </Button>
      </View>
    );
  };
}
