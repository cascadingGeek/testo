-- 0004_todo_due_time.sql
-- An optional time of day to go with due_date, so a per-todo reminder can fire
-- at a moment the user chose rather than at one fixed hour for everybody.
--
-- `time without time zone`, deliberately, to match how due_date is already
-- treated: a wall-clock time on a local calendar day. Storing timestamptz here
-- would mean "9am in the timezone you were in when you set it", so a user who
-- travels would get reminders at the wrong local hour. A todo due at 9am is
-- due at 9am wherever you are.
--
-- Nullable: a due date with no time is still a due date, and every existing
-- row has exactly that.

alter table public.todos
  add column if not exists due_time time;

-- A time with no date has nothing to fire on, and would silently never notify.
alter table public.todos
  drop constraint if exists todos_due_time_needs_date;

alter table public.todos
  add constraint todos_due_time_needs_date
  check (due_time is null or due_date is not null);

comment on column public.todos.due_time is
  'Local wall-clock time of day for the reminder. Requires due_date.';
