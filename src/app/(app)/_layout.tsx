import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { OfflineBanner } from '@/components/offline-banner';
import { makeRouteErrorBoundary } from '@/components/route-error-boundary';
import { configureNotificationHandler } from '@/features/notifications/scheduler';
import { useNotificationSync } from '@/features/notifications/use-notification-sync';
import { useAuthStore } from '@/store/auth-store';

// Registers the background refresh task. Must run at module scope: the OS may
// invoke the task before any component has mounted.
import '@/features/notifications/background';

// Decides how a notification is presented while the app is open, and has to be
// set before one can arrive.
configureNotificationHandler();

// Scoped to the tabs, so a screen crash does not take navigation down with it.
export const ErrorBoundary = makeRouteErrorBoundary('render:app');

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);

  useNotificationSync();

  // A null session means "unknown" until loading finishes; redirecting here
  // would flash the login screen on every cold start.
  if (isLoading) return <FullScreenLoader />;
  if (!session) return <Redirect href="/login" />;

  return (
    <View className="flex-1">
      {/* Above the tabs, so it is visible from every screen. */}
      <OfflineBanner />

      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="todos" options={{ title: 'Todos' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}
