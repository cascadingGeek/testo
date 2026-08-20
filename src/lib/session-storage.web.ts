// Browsers already have localStorage; Node (during web prerender) has none,
// and undefined makes supabase-js fall back to in-memory storage.
export const authStorage = typeof localStorage === 'undefined' ? undefined : localStorage;
