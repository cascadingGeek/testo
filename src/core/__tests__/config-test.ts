import { readConfig } from '@/core/config';

describe('readConfig', () => {
  const valid = { supabaseUrl: 'https://x.supabase.co', supabasePublishableKey: 'sb_pk' };

  it('returns config when everything is present', () => {
    expect(readConfig(valid)).toEqual({
      supabaseUrl: valid.supabaseUrl,
      supabasePublishableKey: valid.supabasePublishableKey,
      isDev: __DEV__,
    });
  });

  it('lists every missing variable, not just the first', () => {
    expect(() => readConfig({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => readConfig({})).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('treats an empty or whitespace value as missing', () => {
    // A blank line in .env.local produces '', not undefined.
    expect(() => readConfig({ ...valid, supabaseUrl: '' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => readConfig({ ...valid, supabaseUrl: '   ' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('tells the developer how to fix it', () => {
    expect(() => readConfig({})).toThrow(/\.env\.local/);
    expect(() => readConfig({})).toThrow(/npx expo start -c/);
  });
});
