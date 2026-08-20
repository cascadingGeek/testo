import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { useAuthStore } from '@/store/auth-store';

/** Holds the native splash until the session is known: splash → app, one step. */
export function SplashGate({ children }: PropsWithChildren) {
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  return <>{children}</>;
}
