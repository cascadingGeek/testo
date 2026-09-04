import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { reportError } from '@/core/reporting';
import { refreshSchedule } from '@/features/notifications/scheduler';

export const REFRESH_TASK = 'testo.notifications.refresh';

/**
 * Roughly twice a day. The OS treats this as a floor, not a schedule: Android
 * batches it through WorkManager and iOS runs background work in windows of
 * its own choosing, often overnight. Asking for less than this buys nothing
 * and costs battery.
 */
const MINIMUM_INTERVAL_MINUTES = 6 * 60;

/**
 * Keeps the schedule honest while the app is closed.
 *
 * Local notifications carry the content they were created with, so a digest
 * scheduled on Monday still claims Monday's counts on Thursday. Reopening the
 * app fixes that; this covers the case where nobody does. It is genuinely
 * best-effort — iOS may never run it on a device the user rarely opens, which
 * is why the schedule is planned a week ahead rather than a day.
 */
TaskManager.defineTask(REFRESH_TASK, async () => {
  try {
    await refreshSchedule();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    reportError({
      scope: 'notifications',
      code: 'background_refresh_failed',
      context: { name: error instanceof Error ? error.name : typeof error },
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (await TaskManager.isTaskRegisteredAsync(REFRESH_TASK)) return;

    await BackgroundTask.registerTaskAsync(REFRESH_TASK, {
      minimumInterval: MINIMUM_INTERVAL_MINUTES,
    });
  } catch (error) {
    // Unavailable in Expo Go and on a device with Background App Refresh off.
    // Neither is a fault: the foreground refresh still keeps things current.
    reportError({
      scope: 'notifications',
      code: 'background_register_failed',
      context: { name: error instanceof Error ? error.name : typeof error },
    });
  }
}

export async function unregisterBackgroundRefresh(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (await TaskManager.isTaskRegisteredAsync(REFRESH_TASK)) {
      await BackgroundTask.unregisterTaskAsync(REFRESH_TASK);
    }
  } catch {
    // Nothing to unregister, or the platform will not say. Either is fine.
  }
}
