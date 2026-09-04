import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { SplashGate } from '@/components/splash-gate';
import { makeRouteErrorBoundary } from '@/components/route-error-boundary';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { subscribeToNetwork } from '@/lib/online-manager';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { subscribeToAuth } from '@/store/auth-store';
import '@/global.css';

// Must run before the first render or the splash hides itself too early.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

/** Expo Router renders this instead of a blank screen when a render throws. */
export const ErrorBoundary = makeRouteErrorBoundary('render:root');

export default function RootLayout() {
  useEffect(() => subscribeToAuth(), []);

  // Without this TanStack believes it is online forever: its default detection
  // listens for browser events that React Native does not have.
  useEffect(() => subscribeToNetwork(), []);

  // There is no window to focus on a phone; foregrounding is the equivalent.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const apply = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');

      // The refresh timer would otherwise keep waking the app in the
      // background. Sessions still recover: getSession refreshes on demand.
      if (status === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };

    apply(AppState.currentState);
    const subscription = AppState.addEventListener('change', apply);

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="dark">
          <QueryClientProvider client={queryClient}>
            <SplashGate>
              {/* The UI is pinned dark, so the status bar has to be told —
                  otherwise a light-mode device draws dark text on it. */}
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </SplashGate>
          </QueryClientProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
