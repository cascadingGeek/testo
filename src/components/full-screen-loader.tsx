import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';

/** How long a spinner may sit there before it owes the user an explanation. */
const SLOW_AFTER_MS = 10_000;

type FullScreenLoaderProps = {
  /** Given a retry, the loader offers one once the wait stops looking normal. */
  onRetry?: () => void;
};

export function FullScreenLoader({ onRetry }: FullScreenLoaderProps) {
  const isSlow = useElapsed(SLOW_AFTER_MS);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <ActivityIndicator />

      {isSlow ? (
        <>
          <Text className="text-center text-sm text-muted-foreground">
            Still trying. This is taking longer than it should.
          </Text>
          {onRetry ? (
            <Button variant="outline" onPress={onRetry}>
              <ButtonText>Try again</ButtonText>
            </Button>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);

  return elapsed;
}
