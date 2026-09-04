-- 0003_todo_query_indexes.sql
-- Indexes matching the queries the app actually issues.
--
-- 0001 indexed (user_id, due_date), which serves the RLS predicate and the
-- date-range filters. It does not reach the rest: `completed` leads the
-- default sort and filters four of the five chips, and the title and priority
-- sorts had no support at all. Without these, every page request fetches the
-- user's whole set and sorts it in memory — and repeats that per page, since
-- OFFSET gives Postgres nothing to resume from.
--
-- All of these are additive and reversible: drop them and the app still works,
-- just slower. On a table with real traffic, add CONCURRENTLY to each CREATE
-- (it cannot run inside a transaction block, so run those one at a time).


-- ── Sorting ──────────────────────────────────────────────────────────────
-- Column order mirrors the default "smart" sort exactly:
--   order by completed asc, due_date asc nulls last, priority desc,
--            created_at asc, id asc
-- with user_id fixed by equality. It also serves filter=completed, which is a
-- prefix of the same index.
create index if not exists todos_smart_idx
  on public.todos (user_id, completed, due_date, priority desc, created_at, id);

-- sort=title. Ends on id for the same reason every sort does: without a unique
-- final column, ties can be ordered differently between two page requests.
create index if not exists todos_user_title_idx
  on public.todos (user_id, title, id);

-- sort=priority.
create index if not exists todos_user_priority_idx
  on public.todos (user_id, priority desc, id);


-- ── Search ───────────────────────────────────────────────────────────────
-- Search is `title ilike '%term%' or description ilike '%term%'`. A leading
-- wildcard makes a B-tree index unusable, so this was a sequential scan over
-- every row RLS admits — run once for the page and five more times for the
-- chip counts. Trigram GIN indexes make the leading wildcard indexable
-- without changing a single query.
create extension if not exists pg_trgm;

create index if not exists todos_title_trgm_idx
  on public.todos using gin (title gin_trgm_ops);

create index if not exists todos_description_trgm_idx
  on public.todos using gin (description gin_trgm_ops);


-- ── Verify, do not assume ────────────────────────────────────────────────
-- Postgres chooses plans on statistics, so on a small table it will ignore
-- every index above and be right to. Seed ~10,000 rows for one user, then:
--
--   analyze public.todos;
--   explain (analyze, buffers)
--   select *, ... from public.todos
--   where completed = false and due_date = current_date
--   order by completed, due_date, priority desc, created_at, id
--   limit 30;
--
-- Look for Index Scan rather than Seq Scan, and for the absence of a Sort node.
