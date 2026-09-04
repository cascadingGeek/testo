import type { TodoPriority } from '@/types/todo';
import type { DateString, TimeString } from '@/utils/dates';

/** The fields a notification's copy is built from. */
export type DigestTodo = {
  id: string;
  title: string;
  priority: TodoPriority;
  due_date: DateString | null;
  due_time: TimeString | null;
  completed: boolean;
};

export type NotificationContent = { title: string; body: string };

const PRIORITY_RANK: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };

/** Highest priority first, then earliest time of day, then stable by id. */
export function byUrgency(a: DigestTodo, b: DigestTodo): number {
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;

  const time = (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99');
  if (time !== 0) return time;

  return a.id.localeCompare(b.id);
}

/** Notification bodies are truncated by the OS, so titles are quoted short. */
function quote(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 40 ? `“${trimmed.slice(0, 39)}…”` : `“${trimmed}”`;
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/**
 * The morning plan: what is due today, plus anything already overdue.
 *
 * Returns null when there is nothing to say. A digest that fires every morning
 * to report an empty day trains people to swipe it away without reading, which
 * costs us the mornings that do matter.
 */
export function buildMorningDigest(input: {
  dueToday: DigestTodo[];
  overdue: DigestTodo[];
}): NotificationContent | null {
  const open = input.dueToday.filter((todo) => !todo.completed);
  const overdue = input.overdue.filter((todo) => !todo.completed);

  if (open.length === 0 && overdue.length === 0) return null;

  const first = [...open, ...overdue].sort(byUrgency)[0];
  const lead = first.priority === 'high' ? 'Start with' : 'First up:';

  if (open.length > 0 && overdue.length > 0) {
    return {
      title: 'Today’s plan',
      body: `${plural(open.length, 'todo')} due today, ${overdue.length} overdue. ${lead} ${quote(first.title)}.`,
    };
  }

  if (open.length > 0) {
    return {
      title: 'Today’s plan',
      body: `${plural(open.length, 'todo')} due today. ${lead} ${quote(first.title)}.`,
    };
  }

  return {
    title: overdue.length === 1 ? 'An overdue todo' : 'Overdue todos',
    body: `${plural(overdue.length, 'todo')} past due. ${lead} ${quote(first.title)}.`,
  };
}

/**
 * The end-of-day check: did today's todos actually get done, and if not, are
 * any of them high priority?
 *
 * `dueToday` must include completed rows — without them we cannot tell "you
 * finished all three" from "you had none", and those deserve different
 * notifications. Nothing due today at all returns null.
 */
export function buildEveningDigest(input: { dueToday: DigestTodo[] }): NotificationContent | null {
  if (input.dueToday.length === 0) return null;

  const open = input.dueToday.filter((todo) => !todo.completed);
  const done = input.dueToday.length - open.length;

  if (open.length === 0) {
    return {
      title: 'Day cleared 🎉',
      body:
        done === 1
          ? 'The one todo due today is done. Nice.'
          : `All ${done} todos due today are done. Nice.`,
    };
  }

  const high = open.filter((todo) => todo.priority === 'high').sort(byUrgency);

  if (high.length > 0) {
    const others = open.length - high.length;
    const tail = others > 0 ? ` (and ${plural(others, 'other')})` : '';

    return {
      title:
        high.length === 1
          ? 'A high-priority todo is still open'
          : `${high.length} high-priority todos still open`,
      body: `${quote(high[0].title)} was due today${tail}.`,
    };
  }

  return {
    title: `${plural(open.length, 'todo')} still open`,
    body:
      done > 0
        ? `You finished ${done} of ${input.dueToday.length} due today.`
        : `${quote(open.sort(byUrgency)[0].title)} was due today.`,
  };
}

/** The reminder for one todo, at the time the user set on it. */
export function buildTodoReminder(todo: DigestTodo): NotificationContent {
  return {
    title: todo.priority === 'high' ? 'High priority, due now' : 'Due now',
    body: quote(todo.title).slice(1, -1),
  };
}

/** The morning after a high-priority todo's due date passed with it still open. */
export function buildOverdueNudge(todo: DigestTodo): NotificationContent {
  return {
    title: 'Overdue: high priority',
    body: `${quote(todo.title)} was due yesterday and is still open.`,
  };
}
