import { createClient } from '@supabase/supabase-js';

import { config } from '@/core/config';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { authStorage } from '@/lib/session-storage';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabasePublishableKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // The recovery and confirmation links come back to a deep link carrying
      // a code, not tokens in a URL fragment. PKCE keeps the verifier in the
      // app's own storage, so a link alone is not enough to take a session.
      flowType: 'pkce',
    },
    // Nothing in the stack imposes a deadline otherwise, so a hung socket
    // leaves the request — and the screen's spinner — open indefinitely.
    global: { fetch: fetchWithTimeout },
  }
);
