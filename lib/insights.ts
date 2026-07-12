// lib/insights.ts
//
// Deterministic "Insights for Daybot" composer. Turns the aggregate patterns
// data into a 2–4 sentence narrative with zero external dependencies, so the
// insights panel always renders on real data (the LLM version in the plan is
// the first cut-item; this is the always-on baseline).
//
// Person A may later replace getPatterns().insights with a cached Claude call
// over the same aggregate — same field, richer prose. This stays as fallback.

import type { Category } from "./types";
import { CATEGORY_LABEL } from "./ui";

interface AggregateForInsights {
  audit_count: number;
  avg_score: number;
  avg_category_scores: Record<Category, number>;
  problems: { label: string; category: Category; stores_affected: number }[];
  strengths: { label: string; category: Category; stores_affected: number }[];
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function composeInsights(a: AggregateForInsights): string | null {
  const n = a.audit_count;
  if (n === 0) return null;

  const sentences: string[] = [];

  // 1. Headline: the most widespread problem.
  const topProblem = a.problems[0];
  if (topProblem) {
    const share = Math.round((topProblem.stores_affected / n) * 100);
    const universal = topProblem.stores_affected === n;
    sentences.push(
      universal
        ? `Across ${n} audited Daybot ${plural(n, "store")}, ${lower(topProblem.label)} shows up in every single one — the most pervasive gap in the ecosystem.`
        : `Across ${n} audited Daybot ${plural(n, "store")}, ${lower(topProblem.label)} is the most common gap, affecting ${topProblem.stores_affected} of ${n} ${plural(topProblem.stores_affected, "store")} (${share}%).`
    );
  } else {
    sentences.push(`Across ${n} audited Daybot ${plural(n, "store")}, no recurring problems surfaced.`);
  }

  // 2. A second widespread problem, if it's also broad.
  const second = a.problems[1];
  if (second && second.stores_affected >= Math.ceil(n / 2)) {
    sentences.push(
      `${cap(lower(second.label))} is close behind at ${second.stores_affected} of ${n} ${plural(second.stores_affected, "store")}.`
    );
  }

  // 3. What Daybot already does well (lead with green — it reads as analysis).
  const topStrength = a.strengths[0];
  if (topStrength) {
    sentences.push(
      `Daybot's templates reliably get ${lower(topStrength.label)} right (${topStrength.stores_affected} of ${n} ${plural(topStrength.stores_affected, "store")}), so the foundations are sound.`
    );
  }

  // 4. Weakest category + the highest-leverage recommendation.
  const weakest = weakestCategory(a.avg_category_scores);
  if (weakest && topProblem) {
    sentences.push(
      `The weakest category on average is ${CATEGORY_LABEL[weakest.cat]} (${weakest.score}/100); templating richer ${categoryFix(topProblem.category)} would lift the average LaunchScore above its current ${a.avg_score}.`
    );
  }

  return sentences.join(" ");
}

function weakestCategory(scores: Record<Category, number>): { cat: Category; score: number } | null {
  const entries = Object.entries(scores) as [Category, number][];
  if (!entries.length) return null;
  let best = entries[0];
  for (const e of entries) if (e[1] < best[1]) best = e;
  return { cat: best[0], score: best[1] };
}

function categoryFix(cat: Category): string {
  switch (cat) {
    case "content":
      return "description and image scaffolds";
    case "trust":
      return "trust scaffolds (returns, shipping, reviews)";
    case "pricing":
      return "pricing guidance";
    case "seo":
      return "SEO defaults (meta, titles, Product JSON-LD)";
    case "catalog":
      return "catalog curation";
  }
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
