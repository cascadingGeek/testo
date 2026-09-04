import type { DigestTodo } from '@/features/notifications/content';
import {
  buildNotificationPlan,
  DIGEST_HORIZON_DAYS,
  MAX_SCHEDULED,
} from '@/features/notifications/plan';
import { DEFAULT_PREFERENCES } from '@/store/notification-store';
import { asDateString, asTimeString } from '@/utils/dates';

const TODAY = asDateString('2026-08-27');
// Well before the 08:00 morning digest, so today's digests are still ahead.
const NOW = new Date(2026, 7, 27, 6, 0, 0);

const prefs = (over = {}) => ({ ...DEFAULT_PREFERENCES, enabled: true, ...over });

let seq = 0;
const todo = (over: Partial<DigestTodo> = {}): DigestTodo => ({
  id: `t${(seq += 1)}`,
  title: 'Buy milk',
  priority: 'medium',
  due_date: TODAY,
  due_time: null,
  completed: false,
  ...over,
});

const plan = (over: Parameters<typeof buildNotificationPlan>[0] extends infer T ? Partial<T> : never = {}) =>
  buildNotificationPlan({
    now: NOW,
    today: TODAY,
    preferences: prefs(),
    overdue: [],
    upcoming: [],
    ...over,
  });

const kinds = (items: ReturnType<typeof plan>) => items.map((item) => item.kind);

describe('the master switch', () => {
  it('schedules nothing at all when notifications are off', () => {
    expect(plan({ preferences: prefs({ enabled: false }), upcoming: [todo()] })).toEqual([]);
  });
});

describe('digests', () => {
  it('plans a morning and an evening digest for a day with todos', () => {
    const items = plan({ upcoming: [todo()] });

    expect(kinds(items)).toContain('morning-digest');
    expect(kinds(items)).toContain('evening-digest');
  });

  it('plans nothing for days with no todos', () => {
    const items = plan({ upcoming: [] });
    expect(items).toEqual([]);
  });

  it('fires the morning digest at the configured hour, in local time', () => {
    const items = plan({
      upcoming: [todo()],
      preferences: prefs({ morningTime: asTimeString('07:15'), eveningDigest: false }),
    });

    expect(items[0].at.getHours()).toBe(7);
    expect(items[0].at.getMinutes()).toBe(15);
    expect(items[0].at.getDate()).toBe(27);
  });

  it('plans a week ahead, so an unopened app keeps notifying', () => {
    const upcoming = Array.from({ length: DIGEST_HORIZON_DAYS }, (_unused, offset) =>
      todo({ due_date: asDateString(`2026-08-${27 + offset}`) })
    );

    const morning = plan({ upcoming, preferences: prefs({ eveningDigest: false }) });
    expect(morning).toHaveLength(DIGEST_HORIZON_DAYS);
  });

  it('drops a digest whose time has already passed today', () => {
    const items = plan({
      now: new Date(2026, 7, 27, 21, 0, 0),
      upcoming: [todo()],
      preferences: prefs({ morningDigest: true, eveningDigest: true }),
    });

    // 08:00 and 20:00 today are both behind 21:00, so nothing lands on the
    // 27th. Later days still do: the todo left open today is tomorrow's
    // backlog, which is exactly what the morning digest exists to say.
    expect(items.some((item) => item.at.getDate() === 27)).toBe(false);
    expect(items.some((item) => item.at.getDate() === 28)).toBe(true);
  });

  it('counts a future day’s backlog as overdue for that day’s morning digest', () => {
    const items = plan({
      upcoming: [todo({ due_date: TODAY, title: 'Today thing' })],
      preferences: prefs({ eveningDigest: false, morningTime: asTimeString('08:00') }),
    });

    // Tomorrow's digest should treat today's still-open todo as past due.
    const tomorrow = items.find((item) => item.at.getDate() === 28);
    expect(tomorrow?.content.body).toContain('past due');
    expect(tomorrow?.content.body).toContain('Today thing');
  });

  it('respects each digest toggle independently', () => {
    expect(kinds(plan({ upcoming: [todo()], preferences: prefs({ morningDigest: false }) })))
      .not.toContain('morning-digest');
    expect(kinds(plan({ upcoming: [todo()], preferences: prefs({ eveningDigest: false }) })))
      .not.toContain('evening-digest');
  });
});

describe('per-todo reminders', () => {
  it('schedules one at the todo’s own due time', () => {
    const items = plan({
      upcoming: [todo({ due_time: asTimeString('14:30') })],
      preferences: prefs({ morningDigest: false, eveningDigest: false }),
    });

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('todo-reminder');
    expect(items[0].at.getHours()).toBe(14);
    expect(items[0].at.getMinutes()).toBe(30);
  });

  it('skips todos with no time set', () => {
    const items = plan({
      upcoming: [todo({ due_time: null })],
      preferences: prefs({ morningDigest: false, eveningDigest: false }),
    });

    expect(items).toEqual([]);
  });

  it('skips completed todos, so finishing early stops the reminder', () => {
    const items = plan({
      upcoming: [todo({ due_time: asTimeString('14:30'), completed: true })],
      preferences: prefs({ morningDigest: false, eveningDigest: false }),
    });

    expect(items).toEqual([]);
  });

  it('carries the todo id, so one todo’s notification can be cancelled alone', () => {
    const items = plan({
      upcoming: [todo({ id: 'todo-9', due_time: asTimeString('14:30') })],
      preferences: prefs({ morningDigest: false, eveningDigest: false }),
    });

    expect(items[0].todoId).toBe('todo-9');
  });
});

describe('overdue nudges', () => {
  const only = prefs({ morningDigest: false, eveningDigest: false, todoReminders: false });

  it('fires the morning after a high-priority todo’s due date', () => {
    const items = plan({ upcoming: [todo({ priority: 'high' })], preferences: only });

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('overdue-nudge');
    expect(items[0].at.getDate()).toBe(28);
    expect(items[0].at.getHours()).toBe(9);
  });

  it('ignores anything that is not high priority', () => {
    expect(plan({ upcoming: [todo({ priority: 'medium' })], preferences: only })).toEqual([]);
  });

  it('does not re-nudge for a todo whose nudge time already passed', () => {
    const items = plan({
      overdue: [todo({ priority: 'high', due_date: asDateString('2026-08-01') })],
      preferences: only,
    });

    expect(items).toEqual([]);
  });
});

describe('the pending-notification budget', () => {
  it('never plans more than iOS will hold, keeping the soonest', () => {
    const upcoming = Array.from({ length: 200 }, (_unused, index) =>
      todo({
        due_date: asDateString('2026-08-28'),
        due_time: asTimeString(`${String(Math.floor(index / 60) + 9).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`),
      })
    );

    const items = plan({ upcoming, preferences: prefs({ morningDigest: false, eveningDigest: false }) });

    expect(items).toHaveLength(MAX_SCHEDULED);
    expect(MAX_SCHEDULED).toBeLessThan(64);
  });

  it('returns items in ascending time order', () => {
    const items = plan({
      upcoming: [
        todo({ due_time: asTimeString('18:00') }),
        todo({ due_time: asTimeString('09:00') }),
      ],
      preferences: prefs({ morningDigest: false, eveningDigest: false }),
    });

    const times = items.map((item) => item.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
