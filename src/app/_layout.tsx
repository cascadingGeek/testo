import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { SplashGate } from '@/components/splash-gate';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { queryClient } from '@/lib/query-client';
import { subscribeToAuth } from '@/store/auth-store';
import '@/global.css';

// Must run before the first render or the splash hides itself too early.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

export default function RootLayout() {
  useEffect(() => subscribeToAuth(), []);

  // There is no window to focus on a phone; foregrounding is the equivalent.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="dark">
          <QueryClientProvider client={queryClient}>
            <SplashGate>
              <Stack screenOptions={{ headerShown: false }} />
            </SplashGate>
          </QueryClientProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
