import { Redirect, Stack } from 'expo-router';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { useAuth } from '@/features/auth/auth-context';

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;

  // Already signed in? The login screen is not useful. Send them to the app.
  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
