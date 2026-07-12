import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { ISSUES } from "@/lib/taxonomy";
import { CATEGORIES, type CategoryScores, type Severity } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

export interface AggregateInsight {
  insights: string | null;
  generatedAt: string | null;
  source: "unconfigured" | "empty" | "cache" | "generated" | "unavailable";
}

interface AggregateRow {
  code: string;
  type: "strength" | "weakness";
  count: number;
  storesAffected: number;
  topSeverity: Severity | null;
}

interface InsightCacheEntry {
  insights: string;
  generatedAt: string;
  expiresAt: number;
}

const insightCache: Map<string, InsightCacheEntry> =
  (globalThis as typeof globalThis & { __launchScoreInsightCache?: Map<string, InsightCacheEntry> })
    .__launchScoreInsightCache ?? new Map<string, InsightCacheEntry>();

(globalThis as typeof globalThis & { __launchScoreInsightCache?: Map<string, InsightCacheEntry> }).__launchScoreInsightCache =
  insightCache;

function severityRank(severity: string | null | undefined): number {
  return severity === "high" ? 3 : severity === "med" ? 2 : severity === "low" ? 1 : 0;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseAggregate(
  audits: Array<{ id: string; score: number | null; category_scores: unknown }>,
  findings: Array<{ audit_id: string; code: string; type: "strength" | "weakness"; severity: string | null }>,
) {
  const avgCategoryScores = CATEGORIES.reduce((acc, category) => {
    const values = audits
      .map((audit) => (audit.category_scores as Partial<CategoryScores> | null)?.[category])
      .filter((value): value is number => typeof value === "number");
    acc[category] = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;
    return acc;
  }, {} as CategoryScores);
  const grouped = new Map<string, { count: number; stores: Set<string>; topSeverity: Severity | null }>();

  for (const finding of findings) {
    const key = `${finding.type}:${finding.code}`;
    const current = grouped.get(key) ?? { count: 0, stores: new Set<string>(), topSeverity: null };
    current.count += 1;
    current.stores.add(finding.audit_id);
    if (severityRank(finding.severity) > severityRank(current.topSeverity)) {
      current.topSeverity = finding.severity as Severity;
    }
    grouped.set(key, current);
  }

  const rows: AggregateRow[] = [...grouped.entries()].map(([key, value]) => {
    const [type, code] = key.split(":") as ["strength" | "weakness", string];
    return {
      code,
      type,
      count: value.count,
      storesAffected: value.stores.size,
      topSeverity: value.topSeverity,
    };
  });

  return {
    auditCount: audits.length,
    averageScore: audits.length
      ? Math.round(audits.reduce((sum, audit) => sum + (audit.score ?? 0), 0) / audits.length)
      : 0,
    averageCategoryScores: avgCategoryScores,
    problems: rows.filter((row) => row.type === "weakness").sort((a, b) => b.storesAffected - a.storesAffected),
    strengths: rows.filter((row) => row.type === "strength").sort((a, b) => b.storesAffected - a.storesAffected),
  };
}

const insightSchema = z.object({ insights: z.string().min(1).max(1_500) });

export async function getAggregateInsight(): Promise<AggregateInsight> {
  const supabase = getSupabase();
  if (!supabase) return { insights: null, generatedAt: null, source: "unconfigured" };

  const [{ data: audits, error: auditsError }, { data: findings, error: findingsError }] = await Promise.all([
    supabase.from("audits").select("id, score, category_scores"),
    supabase.from("findings").select("audit_id, code, type, severity"),
  ]);
  if (auditsError || findingsError) {
    throw new Error(auditsError?.message ?? findingsError?.message ?? "Could not read audit aggregates.");
  }

  const aggregate = parseAggregate(audits ?? [], findings ?? []);
  if (!aggregate.auditCount) return { insights: null, generatedAt: null, source: "empty" };
  if (!process.env.GEMINI_API_KEY) return { insights: null, generatedAt: null, source: "unavailable" };

  const key = fingerprint(aggregate);
  const cached = insightCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { insights: cached.insights, generatedAt: cached.generatedAt, source: "cache" };
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const issueRows = (rows: AggregateRow[]) =>
    rows.slice(0, 8).map((row) => ({
      ...row,
      label: ISSUES[row.code as keyof typeof ISSUES]?.label ?? row.code,
    }));
  const response = await client.models.generateContent({
    model: MODEL,
    contents: JSON.stringify({
      audits: aggregate.auditCount,
      average_score: aggregate.averageScore,
      average_category_scores: aggregate.averageCategoryScores,
      recurring_problems: issueRows(aggregate.problems),
      recurring_strengths: issueRows(aggregate.strengths),
      output: { insights: "3–5 sentences, grounded in the supplied counts" },
    }),
    config: {
      systemInstruction:
        "You are an ecommerce product analyst. Use only supplied aggregate data. Return only JSON with a concise 3–5 sentence actionable insight for Daybot.",
      responseMimeType: "application/json",
      maxOutputTokens: 700,
    },
  });
  if (!response.text) throw new Error("Gemini returned no insight text.");
  const parsed = insightSchema.parse(
    JSON.parse(response.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")),
  );
  const generatedAt = new Date().toISOString();
  insightCache.set(key, { insights: parsed.insights, generatedAt, expiresAt: Date.now() + CACHE_TTL_MS });

  return { insights: parsed.insights, generatedAt, source: "generated" };
}
