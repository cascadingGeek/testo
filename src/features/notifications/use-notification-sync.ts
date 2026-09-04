import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  registerBackgroundRefresh,
  unregisterBackgroundRefresh,
} from '@/features/notifications/background';
import {
  refreshPermissionState,
  requestScheduleRefresh,
} from '@/features/notifications/scheduler';
import { useToday } from '@/hooks/use-today';
import { useNotificationStore } from '@/store/notification-store';

/**
 * Keeps the scheduled notifications in step with the data and the settings.
 *
 * Mounted once, inside the signed-in layout: there is nothing to remind a
 * signed-out user about, and the queries this drives are RLS-scoped anyway.
 */
export function useNotificationSync(): void {
  const today = useToday();

  // Field-by-field, so a change to any one of them re-runs the effect below
  // without the store handing back a new object on every render.
  const enabled = useNotificationStore((state) => state.enabled);
  const morningDigest = useNotificationStore((state) => state.morningDigest);
  const morningTime = useNotificationStore((state) => state.morningTime);
  const eveningDigest = useNotificationStore((state) => state.eveningDigest);
  const eveningTime = useNotificationStore((state) => state.eveningTime);
  const overdueNudge = useNotificationStore((state) => state.overdueNudge);
  const overdueTime = useNotificationStore((state) => state.overdueTime);
  const todoReminders = useNotificationStore((state) => state.todoReminders);

  // The OS can revoke permission while the app is closed, so it is re-read on
  // every foreground rather than trusted from storage.
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;

      refreshPermissionState();
      requestScheduleRefresh();
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (enabled) registerBackgroundRefresh();
    else unregisterBackgroundRefresh();
  }, [enabled]);

  /*
   * Recomputes when the settings change and when the day rolls over — the
   * second matters because every digest is planned relative to today, so at
   * midnight the whole schedule is off by a day.
   */
  useEffect(() => {
    requestScheduleRefresh();
  }, [
    today,
    enabled,
    morningDigest,
    morningTime,
    eveningDigest,
    eveningTime,
    overdueNudge,
    overdueTime,
    todoReminders,
  ]);
}
