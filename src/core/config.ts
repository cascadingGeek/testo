/**
 * Every EXPO_PUBLIC_ variable must be written out literally.
 *
 * Babel replaces the exact text `process.env.EXPO_PUBLIC_FOO` with a string
 * at build time; there is no process.env object on a device. A dynamic read
 * like process.env[name] is never substituted and always yields undefined,
 * so it cannot be used to look these up.
 */
const rawEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

const ENV_NAMES: Record<keyof typeof rawEnv, string> = {
  supabaseUrl: 'EXPO_PUBLIC_SUPABASE_URL',
  supabasePublishableKey: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
};

export type AppConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  isDev: boolean;
};

export function readConfig(env: Partial<Record<keyof typeof rawEnv, string>>): AppConfig {
  // Report every missing variable at once. Failing on the first one means
  // fixing them one restart at a time.
  const missing = (Object.keys(ENV_NAMES) as (keyof typeof rawEnv)[]).filter(
    (key) => !env[key]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required environment ${missing.length === 1 ? 'variable' : 'variables'}: ${missing
          .map((key) => ENV_NAMES[key])
          .join(', ')}.`,
        'Add them to .env.local in the project root, then restart with: npx expo start -c',
        '(.env.local is only read at bundle time, so a reload is not enough.)',
      ].join('\n')
    );
  }

  return {
    supabaseUrl: env.supabaseUrl!,
    supabasePublishableKey: env.supabasePublishableKey!,
    isDev: __DEV__,
  };
}

/** Throws at import time: a misconfigured app should not boot half-working. */
export const config = readConfig(rawEnv);
