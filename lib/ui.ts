// lib/ui.ts — small presentational helpers shared across UI components.
import type { Category, Severity } from "./types";
import { gradeColor } from "./grading";

export const CATEGORY_COLOR: Record<Category, string> = {
  trust: "#6366f1",
  content: "#0ea5e9",
  pricing: "#10b981",
  seo: "#f59e0b",
  catalog: "#ec4899",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  trust: "Trust",
  content: "Content",
  pricing: "Pricing",
  seo: "SEO",
  catalog: "Catalog",
};

// Score colors follow the A–D grade bands. Raw scores remain internal to
// scoring, chart widths, and aggregation; the UI displays the grade instead.
export function scoreColor(score: number): string {
  return gradeColor(score);
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  high: "#ef4444",
  med: "#f59e0b",
  low: "#94a0b8",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  med: "Medium",
  low: "Low",
};

export function fmtPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  return `$${p.toFixed(2)}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
