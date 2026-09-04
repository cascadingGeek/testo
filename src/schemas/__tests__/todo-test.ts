import { todoEditSchema } from '@/schemas/todo';

const valid = {
  title: 'Buy milk',
  description: '',
  priority: 'medium' as const,
  due_date: null,
  due_time: null,
  category_id: null,
};

describe('todoEditSchema', () => {
  it('accepts a minimal valid todo', () => {
    expect(todoEditSchema.safeParse(valid).success).toBe(true);
  });

  it('trims the title, and the trimmed value is what gets saved', () => {
    const result = todoEditSchema.safeParse({ ...valid, title: '  Buy milk  ' });
    expect(result.success && result.data.title).toBe('Buy milk');
  });

  it('rejects a title that is only whitespace', () => {
    // Trim runs first, so this is empty by the time the length check sees it.
    const result = todoEditSchema.safeParse({ ...valid, title: '   ' });
    expect(result.success).toBe(false);
  });

  it('enforces the same 200-character limit as the database CHECK', () => {
    expect(todoEditSchema.safeParse({ ...valid, title: 'a'.repeat(200) }).success).toBe(true);
    expect(todoEditSchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects a priority outside the Postgres enum', () => {
    expect(todoEditSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false);
  });

  it('accepts a null due date but rejects a malformed one', () => {
    expect(todoEditSchema.safeParse({ ...valid, due_date: null }).success).toBe(true);
    expect(todoEditSchema.safeParse({ ...valid, due_date: '2026-08-20' }).success).toBe(true);
    expect(todoEditSchema.safeParse({ ...valid, due_date: '20/08/2026' }).success).toBe(false);
    expect(todoEditSchema.safeParse({ ...valid, due_date: '2026-8-20' }).success).toBe(false);
  });

  it('rejects a category id that is not a uuid', () => {
    expect(todoEditSchema.safeParse({ ...valid, category_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('does not coerce a number into a title', () => {
    // The parsed output goes straight to the database; silent coercion here
    // would write a stringified number as a real title.
    expect(todoEditSchema.safeParse({ ...valid, title: 42 }).success).toBe(false);
  });

  it('accepts a valid 24-hour reminder time and rejects anything else', () => {
    const dated = { ...valid, due_date: '2026-08-20' };

    expect(todoEditSchema.safeParse({ ...dated, due_time: '09:30' }).success).toBe(true);
    expect(todoEditSchema.safeParse({ ...dated, due_time: '00:00' }).success).toBe(true);
    expect(todoEditSchema.safeParse({ ...dated, due_time: '23:59' }).success).toBe(true);

    expect(todoEditSchema.safeParse({ ...dated, due_time: '24:00' }).success).toBe(false);
    expect(todoEditSchema.safeParse({ ...dated, due_time: '9:30' }).success).toBe(false);
    expect(todoEditSchema.safeParse({ ...dated, due_time: '09:60' }).success).toBe(false);
  });

  it('refuses a reminder time with no due date, mirroring the CHECK in 0004', () => {
    // A time with no date has nothing to fire on and would silently never notify.
    const result = todoEditSchema.safeParse({ ...valid, due_date: null, due_time: '09:30' });
    expect(result.success).toBe(false);
  });
});