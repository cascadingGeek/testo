import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type AuthState = {
  /** The current Supabase session, or null when signed out. */
  session: Session | null;
  /** True until the persisted session has been read from storage. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Read the session persisted by a previous run of the app.
    //    Until this resolves we do not know whether the user is signed in,
    //    which is exactly what `isLoading` exists to represent.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 2. Then stay in sync: sign in, sign out, and token refreshes all
    //    fire here, so no screen ever has to poll for auth changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      // The query cache is shared across the whole app and survives screen
      // changes — which means it would also survive a sign-out. Without this,
      // signing in as a second account on the same device would briefly show
      // the previous account's todos from cache before any request returned.
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
