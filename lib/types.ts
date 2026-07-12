// lib/types.ts
//
// SHARED CONTRACT between the pipeline (Person A) and the UI (Person B).
// Person A's /api/audit produces a `Report` and persists it as audits.report (jsonb).
// Person B's /report/[id] and /patterns render exactly these shapes.
//
// If a field name changes, change it HERE and both sides follow. Do not fork.

export const CATEGORIES = ["trust", "content", "pricing", "seo", "catalog"] as const;
export type Category = (typeof CATEGORIES)[number];

export type CategoryScores = Record<Category, number>; // each 0..100

export type Severity = "high" | "med" | "low";
export type FindingType = "strength" | "weakness";

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------
// Every finding cites evidence ids. The report carries a lookup so the UI can
// render an "Evidence" expander without another query. Three id namespaces:
//   RULE-*   a deterministic rule check result
//   COMP-*   a retrieved comparable listing from the KB
//   GUIDE-*  a retrieved best-practice guideline card from the KB
export type EvidenceKind = "rule" | "comp" | "guide";

export interface RuleEvidence {
  id: string; // e.g. "RULE-THIN_DESCRIPTION"
  kind: "rule";
  label: string; // human label of the rule
  detail: string; // what the check found, e.g. "Description is 38 words (threshold 80)."
  passed: boolean;
}

export interface CompEvidence {
  id: string; // e.g. "COMP-42"
  kind: "comp";
  title: string;
  niche: string;
  price: number | null;
  images: number;
  desc_words: number;
  sim: number; // cosine similarity to the audited product, 0..1
  source_url?: string;
}

export interface GuideEvidence {
  id: string; // e.g. "GUIDE-7"
  kind: "guide";
  topic: string; // trust | pricing | description | images | seo
  text: string;
  sim: number;
}

export type Evidence = RuleEvidence | CompEvidence | GuideEvidence;
export type EvidenceMap = Record<string, Evidence>;

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
export interface Strength {
  code: string; // canonical taxonomy code, e.g. "RICH_DESCRIPTION"
  label: string; // taxonomy label for display (denormalized so UI needs no import)
  category: Category;
  finding: string; // one-sentence explanation
  evidence: string[]; // evidence ids present in EvidenceMap
}

export interface Weakness {
  code: string; // canonical taxonomy code, e.g. "THIN_DESCRIPTION"
  label: string;
  category: Category;
  severity: Severity;
  finding: string;
  how_top_stores_do_it: string; // what the retrieved comparables do better
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Per-product metrics (computed in code, not by the LLM)
// ---------------------------------------------------------------------------
export interface ProductMetrics {
  desc_words: number;
  comp_desc_median: number;
  images: number;
  comp_image_median: number;
  price: number | null;
  comp_price_median: number | null;
  price_percentile: number | null; // 0..100 vs comps, null if unpriced
}

export interface ProductReport {
  title: string;
  url?: string;
  image?: string; // primary product image src, for the accordion header
  metrics: ProductMetrics;
  strengths: Strength[];
  weaknesses: Weakness[];
  comparables: CompEvidence[]; // the top comps retrieved for this product
}

// ---------------------------------------------------------------------------
// The full report (persisted as audits.report jsonb)
// ---------------------------------------------------------------------------
export interface Report {
  store_url: string;
  score: number; // 0..100 LaunchScore
  category_scores: CategoryScores;
  executive_summary: string; // store-level, from the LLM store call
  store_strengths: Strength[];
  store_weaknesses: Weakness[];
  products: ProductReport[];
  products_audited: number; // how many products the LLM actually scored (<= cap)
  products_total: number; // how many products the crawler found
  product_cap: number; // the cap (8), so the UI can note "first N of M audited"
  evidence: EvidenceMap;
  generated_at: string; // ISO
}

// The audits row (Supabase). `report` is the jsonb above.
export interface Audit {
  id: string;
  store_url: string;
  score: number;
  category_scores: CategoryScores;
  report: Report;
  created_at: string;
}

// A findings row (Supabase, denormalized — one row per finding, carries its code).
export interface FindingRow {
  id?: number;
  audit_id: string;
  code: string;
  type: FindingType;
  severity: Severity | null;
  product_title: string | null;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Audit API
// ---------------------------------------------------------------------------
export interface AuditRequest {
  url: string;
}

export interface AuditResponse {
  id: string;
  report: Report;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
