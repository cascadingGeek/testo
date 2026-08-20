// Imported for its side effect: it installs a global `localStorage` backed by
// expo-sqlite. React Native has no localStorage of its own, and supabase-js
// needs a key/value store to persist the auth session across app restarts.
import 'expo-sqlite/localStorage/install';

export const authStorage = localStorage;
