// Browsers ship localStorage natively, so the expo-sqlite shim would only add
// a SQLite WASM binary to the web bundle to reimplement what already exists.
//
// This file is also evaluated in Node while Expo prerenders the web build,
// where there is no localStorage at all. undefined makes supabase-js fall back
// to in-memory storage, which is what a build server should do anyway.
export const authStorage = typeof localStorage === 'undefined' ? undefined : localStorage;
