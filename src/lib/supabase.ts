import { createClient } from '@supabase/supabase-js';

// Resolves to session-storage.web.ts on web, session-storage.ts on native.
import { authStorage } from '@/lib/session-storage';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Fail loudly at startup rather than with a confusing network error later.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase env vars. Check .env.local exists, then restart the dev server.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web-only: looks for OAuth tokens in the page URL. Mobile has no URL bar.
    detectSessionInUrl: false,
  },
});
