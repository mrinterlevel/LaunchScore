import { CATEGORY_WEIGHTS } from "@/lib/taxonomy";
import { CATEGORIES, type CategoryScores } from "@/lib/types";

import type { ProductRetrieval, RuleResult } from "./types";

export interface ScoreResult {
  score: number;
  categoryScores: CategoryScores;
}

function ruleWeight(result: RuleResult): number {
  if (result.severity === "high") return 3;
  if (result.severity === "med") return 2;
  if (result.severity === "low") return 1;
  return 2;
}

function ruleScore(rules: RuleResult[]): number | null {
  if (!rules.length) return null;
  const total = rules.reduce((sum, rule) => sum + ruleWeight(rule), 0);
  const passed = rules.filter((rule) => rule.passed).reduce((sum, rule) => sum + ruleWeight(rule), 0);
  return (passed / total) * 100;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function contentMetricScore(retrievals: ProductRetrieval[]): number | null {
  if (!retrievals.length) return null;
  const ratios = retrievals.flatMap((retrieval) => {
    const values: number[] = [];
    if (retrieval.metrics.compDescMedian > 0) {
      values.push(clamp((retrieval.metrics.descWords / retrieval.metrics.compDescMedian) * 100));
    }
    if (retrieval.metrics.compImageMedian > 0) {
      values.push(clamp((retrieval.metrics.images / retrieval.metrics.compImageMedian) * 100));
    }
    return values;
  });
  return ratios.length ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : null;
}

function pricingMetricScore(retrievals: ProductRetrieval[]): number | null {
  const percentiles = retrievals
    .map((retrieval) => retrieval.metrics.pricePercentile)
    .filter((percentile): percentile is number => percentile != null);
  if (!percentiles.length) return null;
  return percentiles.reduce((sum, percentile) => sum + clamp(100 - Math.abs(percentile - 50) * 2), 0) / percentiles.length;
}

function blend(rule: number | null, metric: number | null): number {
  if (rule == null && metric == null) return 0;
  if (rule == null) return metric ?? 0;
  if (metric == null) return rule;
  return rule * 0.6 + metric * 0.4;
}

export function scoreAudit(rules: RuleResult[], retrievals: ProductRetrieval[]): ScoreResult {
  const categoryScores = {} as CategoryScores;

  for (const category of CATEGORIES) {
    const categoryRuleScore = ruleScore(rules.filter((rule) => rule.category === category));
    const metricScore =
      category === "content"
        ? contentMetricScore(retrievals)
        : category === "pricing"
          ? pricingMetricScore(retrievals)
          : null;
    categoryScores[category] = Math.round(blend(categoryRuleScore, metricScore));
  }

  const score = Math.round(
    CATEGORIES.reduce(
      (sum, category) => sum + categoryScores[category] * (CATEGORY_WEIGHTS[category] / 100),
      0,
    ),
  );

  return { score, categoryScores };
}
