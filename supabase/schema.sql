-- LaunchScore Supabase schema (paste into the SQL editor).
-- Two tables. `findings` is deliberately denormalized — one row per finding
-- carrying its canonical taxonomy code — so /patterns is a single GROUP BY.

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  store_url text,
  score int,
  category_scores jsonb,
  report jsonb,
  created_at timestamptz default now()
);

create table if not exists findings (
  id bigint generated always as identity primary key,
  audit_id uuid references audits(id),
  code text,
  type text check (type in ('strength', 'weakness')),
  severity text,
  product_title text,
  created_at timestamptz default now()
);

create index if not exists findings_code_idx on findings (code);
create index if not exists findings_audit_idx on findings (audit_id);

-- The /patterns aggregation (reference; lib/data.ts does this in code for the
-- hackathon-scale corpus):
-- select code, type, count(*) as n, count(distinct audit_id) as stores_affected
-- from findings group by code, type order by n desc;
