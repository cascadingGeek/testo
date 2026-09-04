import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { exchangeCodeForSession } from '@/api/auth';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * Where the email-confirmation link lands. Previously it went to the project's
 * Site URL — localhost:3000 by default — so a phone opened a browser on a dead
 * address and the flow ended on an error page with no instruction.
 */
export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    if (!code) {
      // Supabase consumes the token before redirecting, so the account is
      // confirmed either way; signing in by hand still works.
      setError('That link has already been used. Sign in as usual.');
      return;
    }

    exchangeCodeForSession(code).then((result) => {
      if (result.ok) router.replace('/');
      else setError(result.message);
    });
  }, [code]);

  if (!error) return <FullScreenLoader />;

  return (
    <AuthScreenLayout title="Almost there" subtitle={error}>
      <View className="items-center">
        <Link href="/login" className="font-medium text-primary">
          Go to sign in
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
