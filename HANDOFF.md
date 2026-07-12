# Person B → Person A handoff

What I (Person B: data + UI) built, the shared contracts, and exactly where the
pipeline plugs in. Nothing here should require you to touch UI files.

## What's done (Person B)

- **Knowledge base** — `scripts/build_kb.mjs`, `data/guidelines.mjs` (20 cards),
  `lib/embedding.mjs`, `lib/kb.ts`. `public/kb.json` is built (120 listings + 20
  guides). Run `npm run build:kb` to rebuild with `GEMINI_API_KEY` for real embeddings;
  otherwise a deterministic local fallback is used.
- **UI** — home (`app/page.tsx`), report (`app/report/[id]/page.tsx`), patterns
  (`app/patterns/page.tsx`), and all `components/*`.
- **Read-side data** — `lib/data.ts` (`getAudit`, `getPatterns`) reads Supabase and
  falls back to `lib/fixtures.ts` when it isn't configured.
- Scaffold + config (package.json, tsconfig, tailwind, etc.).

`npm run build` passes; all routes render against fixtures with zero env.

## Shared contracts — do not fork these

- **`lib/types.ts`** — the `Report` shape your `/api/audit` must produce and persist
  as `audits.report` (jsonb). The report page renders exactly these fields, including
  the `evidence` map keyed by `RULE-*` / `COMP-*` / `GUIDE-*` ids that findings cite.
- **`lib/taxonomy.ts`** — the fixed issue taxonomy (`ISSUES`, `ALLOWED_CODES`,
  `CATEGORY_WEIGHTS`). Pass `ALLOWED_CODES` into your Claude prompt; validate every
  finding's `code` against it. If you kept your own copy of this file, delete one — we
  must share a single source of truth.
- **`lib/embedding.mjs`** — use `embed()` here to embed each product at runtime so
  runtime vectors match the KB. `lib/kb.ts` `retrieve(vec, corpus, k, niche)` is ready
  to call.
- **`lib/supabase.ts`** — shared client (`getSupabase()`), returns null if unconfigured.

## Where you plug in

1. **`app/api/audit/route.ts`** is now Person A's live pipeline. It validates and
   normalizes the submitted URL, crawls the storefront, runs rules and retrieval,
   synthesizes evidence-grounded findings when Gemini is configured, persists to
   Supabase, then returns `{ id, report }` using the shared `Report` contract. The
   home page uses `id` to redirect to `/report/{id}`; without Supabase it uses the
   existing fixture fallback at `demo`.
2. **Persist** into the `audits` + `findings` tables
   (`supabase/migrations/20260712000000_create_audits_and_findings.sql`). One
   `findings` row per finding with its `code`/`type`/`severity`/`product_title` — that's
   what powers `/patterns`. Once real audits land, `getPatterns()` aggregates them
   automatically and the "sample data" banner disappears.
3. **Patterns insights** — `getPatterns()` returns `insights: null` from the DB path.
   If you add a route that generates + caches the LLM insight over the aggregate, set it
   there; the panel renders whenever `insights` is non-null.

## Suggested merge order

Your scaffold vs. mine: I created a standard Next.js 14 App Router scaffold. If you also
scaffolded, take mine as the base (it already wires Tailwind + the shared libs) and drop
in your pipeline files under `lib/` (crawler, rules, metrics, scoring, synth) and
`app/api/audit/route.ts`. No UI/report/patterns file should conflict.
