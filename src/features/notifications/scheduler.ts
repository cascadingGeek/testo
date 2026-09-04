import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { fetchNotificationTodos, REMINDER_WINDOW_DAYS } from '@/api/todos';
import { reportError } from '@/core/reporting';
import type { DigestTodo } from '@/features/notifications/content';
import {
  buildNotificationPlan,
  type NotificationKind,
  type PlannedNotification,
} from '@/features/notifications/plan';
import { notificationPreferences, useNotificationStore } from '@/store/notification-store';
import { addDaysTo, todayString } from '@/utils/dates';

const CHANNEL_ID = 'reminders';

/** Marks a scheduled notification as ours, and says which todo it belongs to. */
type NotificationPayload = { kind: NotificationKind; todoId?: string };

/** Notifications are a native concern; the web build simply has none. */
const isSupported = Platform.OS !== 'web';

/**
 * Foreground presentation. Without a handler a notification that arrives while
 * the app is open is delivered silently, which for a due-now reminder is the
 * moment it is most worth seeing.
 */
export function configureNotificationHandler(): void {
  if (!isSupported) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android needs a channel before anything can be posted to it. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Todo reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    enableVibrate: true,
  });
}

/**
 * Asks only when we have not been told no. `requestPermissionsAsync` on a
 * previously denied app resolves immediately without a prompt, so the user
 * has to be sent to Settings — the caller decides how to say that.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isSupported) return false;

  await ensureChannel();

  const current = await Notifications.getPermissionsAsync();
  const granted =
    current.granted || (await Notifications.requestPermissionsAsync()).granted;

  useNotificationStore.getState().setHasPermission(granted);
  return granted;
}

export async function refreshPermissionState(): Promise<boolean> {
  if (!isSupported) return false;

  const { granted } = await Notifications.getPermissionsAsync();
  useNotificationStore.getState().setHasPermission(granted);
  return granted;
}

/** Everything this app scheduled, with its payload decoded. */
async function scheduledByUs(): Promise<{ id: string; payload: NotificationPayload }[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled
    .map((request) => ({
      id: request.identifier,
      payload: request.content.data as NotificationPayload | undefined,
    }))
    .filter((item): item is { id: string; payload: NotificationPayload } =>
      Boolean(item.payload?.kind)
    );
}

async function scheduleOne(item: PlannedNotification): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.content.title,
      body: item.content.body,
      data: { kind: item.kind, todoId: item.todoId } satisfies NotificationPayload,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.at,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Replaces the whole schedule.
 *
 * Cancel-then-reschedule rather than diffing: the plan is small, bounded by
 * MAX_SCHEDULED, and every item's content depends on data that may have moved,
 * so a diff would have to compare bodies anyway. Only our own notifications
 * are cancelled, identified by the payload we attach.
 */
export async function applyPlan(plan: PlannedNotification[]): Promise<void> {
  const existing = await scheduledByUs();
  await Promise.all(existing.map((item) => Notifications.cancelScheduledNotificationAsync(item.id)));

  for (const item of plan) {
    await scheduleOne(item);
  }
}

/** Cancels the reminder and nudge for one todo, without touching anything else. */
export async function cancelNotificationsForTodo(todoId: string): Promise<void> {
  if (!isSupported) return;

  const existing = await scheduledByUs();

  await Promise.all(
    existing
      .filter((item) => item.payload.todoId === todoId)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.id))
  );
}

function toDigestTodos(rows: { id: string; title: string; priority: DigestTodo['priority']; due_date: DigestTodo['due_date']; due_time: DigestTodo['due_time']; completed: boolean }[]): DigestTodo[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    due_date: row.due_date,
    due_time: row.due_time,
    completed: row.completed,
  }));
}

/**
 * The full recompute: fetch, plan, apply.
 *
 * Two requests, so this is deliberately not run on every write — completing a
 * todo cancels its own notifications locally instead. This runs when the app
 * comes to the foreground, when the day rolls over, when preferences change,
 * and from the background task.
 */
export async function refreshSchedule(): Promise<void> {
  if (!isSupported) return;

  const preferences = notificationPreferences();

  if (!preferences.enabled) {
    await applyPlan([]);
    return;
  }

  if (!(await refreshPermissionState())) return;

  const today = todayString();
  const result = await fetchNotificationTodos(today, addDaysTo(today, REMINDER_WINDOW_DAYS));

  if (!result.ok) {
    // Offline is the common case here and not worth reporting as a fault; the
    // existing schedule simply stays in place until the next refresh.
    if (result.code !== 'network') {
      reportError({ scope: 'notifications', code: result.code });
    }
    return;
  }

  await ensureChannel();
  await applyPlan(
    buildNotificationPlan({
      now: new Date(),
      today,
      preferences,
      overdue: toDigestTodos(result.data.overdue),
      upcoming: toDigestTodos(result.data.upcoming),
    })
  );
}

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Coalesces bursts — toggling five todos in a row, or a foreground that
 * arrives at the same moment as a day rollover — into one recompute.
 */
export function requestScheduleRefresh(delayMs = 1_500): void {
  if (!isSupported) return;

  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    refreshSchedule().catch((error: unknown) => {
      reportError({
        scope: 'notifications',
        code: 'refresh_failed',
        context: { name: error instanceof Error ? error.name : typeof error },
      });
    });
  }, delayMs);
}
