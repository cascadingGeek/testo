import { Redirect, Tabs } from 'expo-router';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  // Do NOT redirect while loading, or every cold start flashes the login
  // screen for a moment before the persisted session is found.
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
