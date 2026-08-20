import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthProvider } from '@/features/auth/auth-context';
import { SplashGate } from '@/features/auth/splash-gate';
import { queryClient } from '@/lib/query';
import '@/global.css';

// Module scope, not inside the component: this must run before the first
// render, or the splash auto-hides while we are still reading the session.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

export default function RootLayout() {
  // TanStack Query's refetchOnWindowFocus is a browser concept — there is no
  // window to focus on a phone. The mobile equivalent is the app returning
  // from the background, which is what focusManager is told about here.
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
            <AuthProvider>
              <SplashGate>
                {/* headerShown: false because each group draws its own chrome. */}
                <Stack screenOptions={{ headerShown: false }} />
              </SplashGate>
            </AuthProvider>
          </QueryClientProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
