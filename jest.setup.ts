// The app reads these at import time and refuses to start without them.
// Tests must never touch a real project, so these are deliberately fake.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

// expo-sqlite installs a native-backed localStorage; jsdom-free tests do not
// have one, and nothing under test exercises session persistence.
jest.mock('@/lib/session-storage', () => ({ authStorage: undefined }));

// Reanimated 4 initialises a native worklets module that does not exist under
// Jest. Animations are not what these tests are checking, so Animated.* render
// as plain views and the animation builders become inert chainable stubs.
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');

  const builder = () => {
    const chain: Record<string, () => unknown> = {};
    const self = () => chain;
    for (const method of ['duration', 'delay', 'springify', 'damping', 'stiffness', 'build']) {
      chain[method] = self;
    }
    return chain;
  };

  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    FadeIn: builder(),
    FadeOut: builder(),
    LinearTransition: builder(),
  };
});
