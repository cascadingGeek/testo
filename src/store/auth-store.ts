import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  /**
   * True until the persisted session has been read. A null session means
   * "signed out" only once this is false — before that it means "unknown".
   */
  isLoading: boolean;
};

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  isLoading: true,
}));

/** Call once, from the root layout. Returns an unsubscribe function. */
export function subscribeToAuth(): () => void {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, isLoading: false });
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.setState({ session, isLoading: false });

    // The cache outlives screens, so it would outlive the session too.
    if (event === 'SIGNED_OUT') queryClient.clear();
  });

  return () => subscription.unsubscribe();
}
