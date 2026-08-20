-- 0001_create_todos.sql
-- Core todos table: owned by a Supabase auth user, protected by RLS.

-- A real Postgres enum (not a text + check constraint) so the generated
-- TypeScript types come out as 'low' | 'medium' | 'high' rather than string.
create type public.todo_priority as enum ('low', 'medium', 'high');

create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),

  completed   boolean not null default false,
  priority    public.todo_priority not null default 'medium',
  due_date    date,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Every RLS policy below filters on user_id, so it must be indexed or
-- Postgres scans the whole table on every single query.
create index todos_user_id_due_date_idx on public.todos (user_id, due_date);

-- updated_at is not the client's business. The database maintains it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger todos_set_updated_at
  before update on public.todos
  for each row
  execute function public.set_updated_at();


-- ── Row Level Security ───────────────────────────────────────────────────
-- Without this block, anyone holding the publishable key (i.e. anyone who
-- downloads the app) can read and write every row in this table.
alter table public.todos enable row level security;

create policy "Users can read their own todos"
  on public.todos for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can create their own todos"
  on public.todos for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update their own todos"
  on public.todos for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete their own todos"
  on public.todos for delete
  to authenticated
  using ( (select auth.uid()) = user_id );
