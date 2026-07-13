# LaunchScore

**RAG-grounded launch auditor with a cross-store patterns dashboard.**

Paste a store URL to get a LaunchScore (0–100) and an evidence-backed report of its
launch readiness. The A–D grade evaluates the audited store itself—not its platform or
site builder. Every finding is grounded in a deterministic rule check or a comparison
against real successful listings retrieved via RAG. The **Patterns** dashboard aggregates
only real persisted audits.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # add GEMINI_API_KEY and Supabase values
npm run build:kb               # builds Gemini vectors in public/kb.json (offline, ~1 min)
npm run dev                    # http://localhost:3000
```

Without Supabase, a freshly-run audit remains viewable only for the current process.
Add Gemini and Supabase keys to enable persistent retrieval, synthesis, and cross-store
aggregation. The app never substitutes sample audits.

## Pages

| Route          | What it is |
|----------------|------------|
| `/`            | URL input → spinner → redirect to the report |
| `/report/[id]` | Score dial, category bars, executive summary, per-product accordion with evidence expanders |
| `/patterns`    | Recurring problems, recurring strengths, average category scores, and insights |

## Architecture

```
OFFLINE  scripts/build_kb.mjs → public/kb.json
         ~120 products from established ecommerce stores via product feeds
         + 20 hand-written CRO guideline cards, each embedded once.

RUNTIME  POST /api/audit  (Person A's pipeline):
         CRAWL → RULES → RETRIEVE (cosine vs kb.json) → METRICS → SYNTH (Gemini 3.1 Flash-Lite)
         → SCORE → PERSIST (Supabase audits + findings)

READ     /report/[id] and /patterns read real persisted audits from Supabase.
```

The whole "vector store" is `public/kb.json` + brute-force cosine in `lib/kb.ts` —
right-sized to a ~140-item corpus. Still RAG: retrieval is retrieval.

## The fixed issue taxonomy

`lib/taxonomy.ts` defines ~24 canonical codes across 5 categories. **Every** finding —
whether from a rule or the LLM — carries exactly one code. That single decision is what
makes `/patterns` a `GROUP BY`. Freeform text can't be counted; codes can.

## Scoring formula

The **LaunchScore** is a weighted sum of five category scores (each 0–100):

```
LaunchScore = 0.25·trust + 0.25·content + 0.20·pricing + 0.15·seo + 0.15·catalog
```

Each **category score** is computed in code (never by the LLM): a severity-weighted
rule pass-rate blended with metric ratios (e.g. description word count vs the comparable
median, image count vs the comparable median, price percentile vs comps). Category
weights live in `lib/taxonomy.ts` (`CATEGORY_WEIGHTS`).

## Evidence & the hallucination guard

Every finding cites evidence ids from three namespaces — `RULE-*`, `COMP-*`, `GUIDE-*` —
resolved against the report's `evidence` map for the UI expanders. The pipeline's
validator drops any finding whose cited ids don't exist in the input, so nothing
un-grounded reaches the report.

## Honest caveat

Comparables are best-seller / review-count validated listings — a strong proxy for
success, not revenue data.
