// lib/ui.ts — small presentational helpers shared across UI components.
import type { Category, Severity } from "./types";

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

// Score -> color. Red below 50, amber 50–74, green 75+.
export function scoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function scoreVerdict(score: number): string {
  if (score >= 85) return "Launch-ready";
  if (score >= 70) return "Nearly there";
  if (score >= 50) return "Needs work";
  return "Not ready to launch";
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
