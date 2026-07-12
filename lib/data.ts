// lib/data.ts
//
// Read-side data access for the UI (Person B). Everything here reads from
// Supabase when configured, and falls back to fixtures otherwise so the app is
// always demoable. Writes (persisting audits/findings) are Person A's pipeline.

import type { Audit, Category, CategoryScores, Severity } from "./types";
import { CATEGORIES } from "./types";
import { getSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// Single audit (for /report/[id])
// ---------------------------------------------------------------------------
export async function getAudit(id: string): Promise<Audit | null> {
  const sb = getSupabase();
  if (!sb) {
    // No DB: serve a real audit from the in-memory store if we have one,
    // otherwise fall back to the demo fixture so the app still renders.
    const { getMemAudit } = await import("./auditStore");
    const mem = getMemAudit(id);
    if (mem) return mem;
    const { FAKE_AUDIT } = await import("./fixtures");
    return FAKE_AUDIT;
  }
  const { data, error } = await sb.from("audits").select("*").eq("id", id).single();
  if (error || !data) return null;
  return {
    id: data.id,
    store_url: data.store_url,
    score: data.score,
    category_scores: data.category_scores,
    report: data.report,
    created_at: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// Aggregated patterns (for /patterns) — one GROUP BY over findings.
// ---------------------------------------------------------------------------
export interface PatternRow {
  code: string;
  label: string;
  category: Category;
  n: number; // total occurrences
  stores_affected: number; // distinct audits
  top_severity: Severity | null;
}

export interface PatternsData {
  audit_count: number;
  avg_score: number;
  avg_category_scores: CategoryScores;
  problems: PatternRow[]; // weakness codes, desc by stores_affected
  strengths: PatternRow[]; // strength codes
  insights: string | null; // LLM summary over the aggregate (Person A route may fill/cache)
}

export async function getPatterns(): Promise<PatternsData> {
  const sb = getSupabase();
  if (!sb) {
    const { FAKE_PATTERNS } = await import("./fixtures");
    return FAKE_PATTERNS;
  }

  // Pull the two tables and aggregate in code. The corpus is small (hackathon
  // scale) so a client-side GROUP BY is fine and avoids a DB function.
  const [{ data: audits }, { data: findings }] = await Promise.all([
    sb.from("audits").select("id, score, category_scores"),
    sb.from("findings").select("code, type, severity, audit_id"),
  ]);

  const auditRows = audits ?? [];
  const findingRows = findings ?? [];

  const audit_count = auditRows.length;
  const avg_score = audit_count
    ? Math.round(auditRows.reduce((s, a) => s + (a.score ?? 0), 0) / audit_count)
    : 0;

  const avg_category_scores = CATEGORIES.reduce((acc, cat) => {
    const vals = auditRows
      .map((a) => (a.category_scores as CategoryScores | null)?.[cat])
      .filter((v): v is number => typeof v === "number");
    acc[cat] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    return acc;
  }, {} as CategoryScores);

  const { ISSUES } = await import("./taxonomy");
  const sevRank: Record<string, number> = { high: 3, med: 2, low: 1 };

  const group = (type: "strength" | "weakness"): PatternRow[] => {
    const byCode = new Map<
      string,
      { n: number; stores: Set<string>; sev: Severity | null }
    >();
    for (const f of findingRows) {
      if (f.type !== type) continue;
      const g = byCode.get(f.code) ?? { n: 0, stores: new Set<string>(), sev: null };
      g.n += 1;
      if (f.audit_id) g.stores.add(f.audit_id);
      if (
        f.severity &&
        (!g.sev || (sevRank[f.severity] ?? 0) > (sevRank[g.sev] ?? 0))
      ) {
        g.sev = f.severity as Severity;
      }
      byCode.set(f.code, g);
    }
    return [...byCode.entries()]
      .map(([code, g]) => ({
        code,
        label: (ISSUES as any)[code]?.label ?? code,
        category: ((ISSUES as any)[code]?.cat ?? "content") as Category,
        n: g.n,
        stores_affected: g.stores.size,
        top_severity: g.sev,
      }))
      .sort((a, b) => b.stores_affected - a.stores_affected || b.n - a.n);
  };

  const problems = group("weakness");
  const strengths = group("strength");

  const { composeInsights } = await import("./insights");
  return {
    audit_count,
    avg_score,
    avg_category_scores,
    problems,
    strengths,
    // Deterministic baseline so the panel always renders on real data. Person A
    // may override this field with a cached Claude narrative over the aggregate.
    insights: composeInsights({ audit_count, avg_score, avg_category_scores, problems, strengths }),
  };
}
