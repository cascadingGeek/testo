import {
  buildEveningDigest,
  buildMorningDigest,
  buildOverdueNudge,
  buildTodoReminder,
  byUrgency,
  type DigestTodo,
} from '@/features/notifications/content';
import { asDateString, asTimeString } from '@/utils/dates';

const TODAY = asDateString('2026-08-27');

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

describe('byUrgency', () => {
  it('puts high priority first', () => {
    const sorted = [todo({ priority: 'low' }), todo({ priority: 'high' })].sort(byUrgency);
    expect(sorted[0].priority).toBe('high');
  });

  it('breaks priority ties on the earlier time of day', () => {
    const late = todo({ due_time: asTimeString('17:00') });
    const early = todo({ due_time: asTimeString('09:00') });
    expect([late, early].sort(byUrgency)[0]).toBe(early);
  });

  it('sorts a todo with no time after one with a time', () => {
    const timed = todo({ due_time: asTimeString('23:00') });
    const untimed = todo({ due_time: null });
    expect([untimed, timed].sort(byUrgency)[0]).toBe(timed);
  });
});

describe('buildMorningDigest', () => {
  it('says nothing when the day is empty, rather than training people to swipe', () => {
    expect(buildMorningDigest({ dueToday: [], overdue: [] })).toBeNull();
  });

  it('counts today and overdue separately', () => {
    const result = buildMorningDigest({
      dueToday: [todo(), todo()],
      overdue: [todo({ due_date: asDateString('2026-08-25') })],
    });

    expect(result?.body).toContain('2 todos due today');
    expect(result?.body).toContain('1 overdue');
  });

  it('leads with the highest-priority item', () => {
    const result = buildMorningDigest({
      dueToday: [todo({ title: 'Low thing', priority: 'low' }), todo({ title: 'Ship invoice', priority: 'high' })],
      overdue: [],
    });

    expect(result?.body).toContain('Ship invoice');
    expect(result?.body).not.toContain('Low thing');
  });

  it('ignores completed rows if any are passed in', () => {
    expect(
      buildMorningDigest({ dueToday: [todo({ completed: true })], overdue: [] })
    ).toBeNull();
  });

  it('handles overdue with nothing due today', () => {
    const result = buildMorningDigest({
      dueToday: [],
      overdue: [todo({ title: 'Late thing', due_date: asDateString('2026-08-20') })],
    });

    expect(result?.title).toBe('An overdue todo');
    expect(result?.body).toContain('Late thing');
  });
});

describe('buildEveningDigest', () => {
  it('says nothing when nothing was due today', () => {
    expect(buildEveningDigest({ dueToday: [] })).toBeNull();
  });

  it('congratulates when everything due today is done', () => {
    const result = buildEveningDigest({
      dueToday: [todo({ completed: true }), todo({ completed: true })],
    });

    expect(result?.title).toBe('Day cleared 🎉');
    expect(result?.body).toContain('All 2 todos');
  });

  it('uses the singular when exactly one was due and done', () => {
    const result = buildEveningDigest({ dueToday: [todo({ completed: true })] });
    expect(result?.body).toContain('The one todo');
  });

  it('calls out high priority above everything else', () => {
    const result = buildEveningDigest({
      dueToday: [
        todo({ title: 'Ship invoice', priority: 'high' }),
        todo({ title: 'Water plants', priority: 'low' }),
      ],
    });

    expect(result?.title).toBe('A high-priority todo is still open');
    expect(result?.body).toContain('Ship invoice');
    expect(result?.body).toContain('1 other');
  });

  it('counts multiple high-priority stragglers', () => {
    const result = buildEveningDigest({
      dueToday: [
        todo({ title: 'A', priority: 'high' }),
        todo({ title: 'B', priority: 'high' }),
      ],
    });

    expect(result?.title).toBe('2 high-priority todos still open');
  });

  it('reports progress when the leftovers are not high priority', () => {
    const result = buildEveningDigest({
      dueToday: [todo({ completed: true }), todo({ title: 'Water plants', priority: 'low' })],
    });

    expect(result?.title).toBe('1 todo still open');
    expect(result?.body).toContain('You finished 1 of 2');
  });

  it('names the todo when none were finished', () => {
    const result = buildEveningDigest({ dueToday: [todo({ title: 'Water plants', priority: 'low' })] });
    expect(result?.body).toContain('Water plants');
  });
});

describe('per-todo copy', () => {
  it('marks a high-priority reminder as such', () => {
    expect(buildTodoReminder(todo({ priority: 'high' })).title).toBe('High priority, due now');
    expect(buildTodoReminder(todo({ priority: 'low' })).title).toBe('Due now');
  });

  it('truncates a long title rather than letting the OS cut it mid-word', () => {
    const long = 'x'.repeat(80);
    expect(buildTodoReminder(todo({ title: long })).body.length).toBeLessThan(45);
  });

  it('says why the nudge fired', () => {
    expect(buildOverdueNudge(todo({ title: 'Ship invoice' })).body).toContain('due yesterday');
  });
});
