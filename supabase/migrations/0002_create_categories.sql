-- 0002_create_categories.sql
-- User-owned categories, plus an optional category on each todo.

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  name       text not null check (char_length(name) between 1 and 50),
  -- Stored as a hex string so the client can render it directly. The regex
  -- is the enforcement; the colour picker in the app is only the courtesy.
  color      text not null default '#64748B' check (color ~ '^#[0-9A-Fa-f]{6}$'),

  created_at timestamptz not null default now(),

  -- id is already unique on its own. This pair exists solely so todos can
  -- reference (id, user_id) together — see the composite FK below.
  unique (id, user_id),

  -- One user cannot have two categories with the same name. This also gives
  -- us the (user_id, ...) index the RLS policies need, so no separate
  -- CREATE INDEX is required.
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "Users can read their own categories"
  on public.categories for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can create their own categories"
  on public.categories for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update their own categories"
  on public.categories for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete their own categories"
  on public.categories for delete
  to authenticated
  using ( (select auth.uid()) = user_id );


-- ── Link todos to categories ─────────────────────────────────────────────
alter table public.todos add column category_id uuid;

-- The composite foreign key is the point of this migration.
--
-- A plain `references categories (id)` would be satisfied by ANY category,
-- including another user's, because foreign key checks bypass row level
-- security by design (PostgreSQL docs, 5.9). Referencing the (id, user_id)
-- pair means a todo can only point at a category with the same owner, and
-- RLS already pins todos.user_id to auth.uid().
--
-- ON DELETE SET NULL (category_id) nulls ONLY that column; without the
-- column list Postgres would also null user_id, which is NOT NULL.
-- Deleting a category therefore uncategorises its todos rather than
-- deleting them.
alter table public.todos
  add constraint todos_category_fkey
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id);

-- Foreign keys do not index the referencing side, and we will filter by
-- category, so add it explicitly.
create index todos_category_id_idx on public.todos (category_id);
