import { Redirect, Stack } from 'expo-router';

import { FullScreenLoader } from '@/components/full-screen-loader';
import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) return <FullScreenLoader />;
  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
