create extension if not exists pgcrypto;

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  store_url text not null,
  score integer not null check (score between 0 and 100),
  category_scores jsonb not null default '{}'::jsonb,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.findings (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits(id) on delete cascade,
  code text not null,
  type text not null check (type in ('strength', 'weakness')),
  severity text check (severity is null or severity in ('high', 'med', 'low')),
  product_title text,
  created_at timestamptz not null default now()
);

create index findings_audit_id_idx on public.findings(audit_id);
create index findings_code_type_idx on public.findings(code, type);
create index audits_created_at_idx on public.audits(created_at desc);

alter table public.audits enable row level security;
alter table public.findings enable row level security;

comment on table public.audits is 'One persisted LaunchScore report per audited storefront.';
comment on table public.findings is 'Denormalized coded findings used by the cross-store patterns dashboard.';
