import { Redirect, Tabs } from 'expo-router';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { useAuthStore } from '@/store/auth-store';

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);

  // A null session means "unknown" until loading finishes; redirecting here
  // would flash the login screen on every cold start.
  if (isLoading) return <FullScreenLoader />;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="todos" options={{ title: 'Todos' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
