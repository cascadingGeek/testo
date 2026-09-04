import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { todayString, type DateString } from '@/utils/dates';

/**
 * The current local day, kept current.
 *
 * Calling todayString() during render looks equivalent and is not: renders are
 * caused by state changes and midnight is not one, so an app left open
 * overnight keeps yesterday's date — the "Today" filter shows yesterday's
 * todos, nothing newly overdue is counted, and TodoItem is memo'd so even a
 * parent re-render will not refresh the badge.
 *
 * Two triggers, because neither alone is enough: a timer covers the app being
 * left open, and AppState covers a device that was asleep when it fired.
 */
export function useToday(): DateString {
  const [today, setToday] = useState(todayString);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const sync = () => {
      setToday((current) => {
        const next = todayString();
        return next === current ? current : next;
      });
    };

    const scheduleNextMidnight = () => {
      timer = setTimeout(() => {
        sync();
        scheduleNextMidnight();
      }, msUntilLocalMidnight());
    };

    scheduleNextMidnight();

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') sync();
    };
    const subscription = AppState.addEventListener('change', onAppState);

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}

function msUntilLocalMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // A second of slack, so a timer that fires a hair early does not read the
  // old day and then wait a full 24 hours for the next one.
  return midnight.getTime() - now.getTime() + 1_000;
}
