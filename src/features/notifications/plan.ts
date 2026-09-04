import {
  buildEveningDigest,
  buildMorningDigest,
  buildOverdueNudge,
  buildTodoReminder,
  type DigestTodo,
  type NotificationContent,
} from '@/features/notifications/content';
import type { NotificationPreferences } from '@/store/notification-store';
import { addDaysTo, toLocalDate, type DateString } from '@/utils/dates';

export type NotificationKind =
  | 'morning-digest'
  | 'evening-digest'
  | 'todo-reminder'
  | 'overdue-nudge';

export type PlannedNotification = {
  kind: NotificationKind;
  /** Present on per-todo items, so completing one can cancel just its own. */
  todoId?: string;
  at: Date;
  content: NotificationContent;
};

/**
 * How many days of digests are scheduled ahead.
 *
 * Digests are one-off triggers rather than a repeating daily one, because a
 * repeating trigger carries the content it was created with — it would still
 * be announcing "2 high-priority todos open" a week after they were finished.
 * One-off items are recomputed on every foreground and by the background task,
 * and a week of runway means an app left closed for days still notifies.
 */
export const DIGEST_HORIZON_DAYS = 7;

/**
 * iOS keeps at most 64 pending local notifications per app and silently drops
 * the rest, so the plan is trimmed rather than left to be truncated somewhere
 * we cannot see. Soonest-first: anything cut is far enough out that a later
 * refresh will schedule it.
 */
export const MAX_SCHEDULED = 60;

/**
 * Decides what should be scheduled, and when. Pure — every input is passed in,
 * including `now`, so the whole schedule is testable without a device or a
 * clock.
 */
export function buildNotificationPlan(input: {
  now: Date;
  today: DateString;
  preferences: NotificationPreferences;
  /** Open todos due before today. */
  overdue: DigestTodo[];
  /** Todos due from today to the horizon, completed ones included. */
  upcoming: DigestTodo[];
}): PlannedNotification[] {
  const { preferences: prefs } = input;
  if (!prefs.enabled) return [];

  const planned: PlannedNotification[] = [
    ...planDigests(input),
    ...planTodoReminders(input),
    ...planOverdueNudges(input),
  ];

  return planned
    .filter((item) => item.at.getTime() > input.now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_SCHEDULED);
}

function planDigests(input: {
  today: DateString;
  preferences: NotificationPreferences;
  overdue: DigestTodo[];
  upcoming: DigestTodo[];
}): PlannedNotification[] {
  const { preferences: prefs } = input;
  const items: PlannedNotification[] = [];

  for (let offset = 0; offset < DIGEST_HORIZON_DAYS; offset += 1) {
    const date = addDaysTo(input.today, offset);
    const dueThatDay = input.upcoming.filter((todo) => todo.due_date === date);

    if (prefs.morningDigest) {
      // What will be overdue by then: today's backlog plus anything due
      // before that date that is still open now.
      const overdueBy = [
        ...input.overdue,
        ...input.upcoming.filter(
          (todo) => !todo.completed && todo.due_date !== null && todo.due_date < date
        ),
      ];

      const content = buildMorningDigest({ dueToday: dueThatDay, overdue: overdueBy });
      if (content) {
        items.push({
          kind: 'morning-digest',
          at: toLocalDate(date, prefs.morningTime),
          content,
        });
      }
    }

    if (prefs.eveningDigest) {
      const content = buildEveningDigest({ dueToday: dueThatDay });
      if (content) {
        items.push({
          kind: 'evening-digest',
          at: toLocalDate(date, prefs.eveningTime),
          content,
        });
      }
    }
  }

  return items;
}

function planTodoReminders(input: {
  preferences: NotificationPreferences;
  upcoming: DigestTodo[];
}): PlannedNotification[] {
  if (!input.preferences.todoReminders) return [];

  return input.upcoming
    .filter((todo) => !todo.completed && todo.due_date !== null && todo.due_time !== null)
    .map((todo) => ({
      kind: 'todo-reminder' as const,
      todoId: todo.id,
      at: toLocalDate(todo.due_date as DateString, todo.due_time),
      content: buildTodoReminder(todo),
    }));
}

/** The morning after a high-priority todo's due date passes with it still open. */
function planOverdueNudges(input: {
  preferences: NotificationPreferences;
  overdue: DigestTodo[];
  upcoming: DigestTodo[];
}): PlannedNotification[] {
  const { preferences: prefs } = input;
  if (!prefs.overdueNudge) return [];

  return [...input.overdue, ...input.upcoming]
    .filter((todo) => !todo.completed && todo.priority === 'high' && todo.due_date !== null)
    .map((todo) => ({
      kind: 'overdue-nudge' as const,
      todoId: todo.id,
      at: toLocalDate(addDaysTo(todo.due_date as DateString, 1), prefs.overdueTime),
      content: buildOverdueNudge(todo),
    }));
}
