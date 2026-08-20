import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { useAuth } from '@/features/auth/auth-context';

/**
 * Holds the native splash screen on screen until we know whether the user is
 * signed in, then fades it away.
 *
 * Without this the launch sequence is splash → spinner → dashboard: two
 * transitions, one of which exists only because reading storage takes a
 * moment. The splash is already covering the screen, so we use it.
 */
export function SplashGate({ children }: PropsWithChildren) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // By now the gates have already decided which screen to render, so the
    // first thing revealed is the right one.
    SplashScreen.hideAsync();
  }, [isLoading]);

  return <>{children}</>;
}
