import { ISSUES } from "@/lib/taxonomy";
import type {
  CompEvidence,
  EvidenceMap,
  GuideEvidence,
  Report,
  RuleEvidence,
  Strength,
  Weakness,
} from "@/lib/types";

import { scoreAudit } from "./scoring";
import type { ProductRetrieval, RuleResult, StoreSnapshot } from "./types";

function severityRank(severity: Weakness["severity"]): number {
  return severity === "high" ? 3 : severity === "med" ? 2 : 1;
}

function ruleEvidence(rule: RuleResult): RuleEvidence {
  return {
    id: rule.id,
    kind: "rule",
    label: rule.label,
    detail: rule.detail,
    passed: rule.passed,
  };
}

function compEvidence(retrieval: ProductRetrieval): CompEvidence[] {
  return retrieval.comps.map((comp) => ({
    id: comp.id,
    kind: "comp",
    title: comp.title,
    niche: comp.niche,
    price: comp.price,
    images: comp.images,
    desc_words: comp.descWords,
    sim: comp.sim,
    source_url: comp.sourceUrl,
  }));
}

function guideEvidence(retrieval: ProductRetrieval): GuideEvidence[] {
  return retrieval.guides.map((guide) => ({
    id: guide.id,
    kind: "guide",
    topic: guide.topic,
    text: guide.text,
    sim: guide.sim,
  }));
}

function mergeFinding<T extends Strength | Weakness>(
  current: T[],
  finding: T,
  isWeakness: boolean,
): void {
  const existing = current.find((candidate) => candidate.code === finding.code && candidate.category === finding.category);
  if (!existing) {
    current.push(finding);
    return;
  }

  existing.evidence = [...new Set([...existing.evidence, ...finding.evidence])];
  if (isWeakness) {
    const currentWeakness = existing as Weakness;
    const incomingWeakness = finding as Weakness;
    if (severityRank(incomingWeakness.severity) > severityRank(currentWeakness.severity)) {
      currentWeakness.severity = incomingWeakness.severity;
      currentWeakness.finding = incomingWeakness.finding;
      currentWeakness.how_top_stores_do_it = incomingWeakness.how_top_stores_do_it;
    }
  }
}

function ruleFinding(rule: RuleResult): Strength | Weakness {
  const issue = ISSUES[rule.code as keyof typeof ISSUES];
  if (rule.type === "strength") {
    return {
      code: rule.code,
      label: issue?.label ?? rule.label,
      category: rule.category,
      finding: rule.detail,
      evidence: [rule.id],
    };
  }
  return {
    code: rule.code,
    label: issue?.label ?? rule.label,
    category: rule.category,
    severity: rule.severity ?? "med",
    finding: rule.detail,
    how_top_stores_do_it:
      "Strong listings make this information concrete, visible, and easy to verify before checkout.",
    evidence: [rule.id],
  };
}

function deterministicSummary(snapshot: StoreSnapshot, rules: RuleResult[]): string {
  const weaknesses = rules.filter((rule) => rule.type === "weakness" && !rule.passed);
  const strengths = rules.filter((rule) => rule.type === "strength" && rule.passed);
  const weaknessLabel = weaknesses[0]?.label ?? "catalog depth";
  const strengthLabel = strengths[0]?.label ?? "the crawlable storefront structure";
  if (!snapshot.products.length) {
    return `${snapshot.siteName} did not expose crawlable product pages, so LaunchScore could only evaluate store-level launch signals.`;
  }
  return `${snapshot.siteName} has a foundation in ${strengthLabel.toLowerCase()}, but ${weaknessLabel.toLowerCase()} is the highest-leverage gap before launch.`;
}

export function buildDeterministicReport(
  snapshot: StoreSnapshot,
  rules: RuleResult[],
  retrievals: ProductRetrieval[],
): Report {
  const evidence: EvidenceMap = {};
  for (const rule of rules) evidence[rule.id] = ruleEvidence(rule);
  for (const retrieval of retrievals) {
    for (const comp of compEvidence(retrieval)) evidence[comp.id] = comp;
    for (const guide of guideEvidence(retrieval)) evidence[guide.id] = guide;
  }

  const storeStrengths: Strength[] = [];
  const storeWeaknesses: Weakness[] = [];
  const productFindings = new Map<string, { strengths: Strength[]; weaknesses: Weakness[] }>();
  for (const product of snapshot.products) {
    productFindings.set(product.title, { strengths: [], weaknesses: [] });
  }

  for (const rule of rules) {
    const finding = ruleFinding(rule);
    const target = rule.productTitle ? productFindings.get(rule.productTitle) : null;
    if (target) {
      if (rule.type === "strength") {
        mergeFinding(target.strengths, finding as Strength, false);
      } else {
        mergeFinding(target.weaknesses, finding as Weakness, true);
      }
    } else if (rule.type === "strength") {
      mergeFinding(storeStrengths, finding as Strength, false);
    } else {
      mergeFinding(storeWeaknesses, finding as Weakness, true);
    }
  }

  const retrievalByIndex = new Map(retrievals.map((retrieval) => [retrieval.productIndex, retrieval]));
  const score = scoreAudit(rules, retrievals);

  return {
    store_url: snapshot.storeUrl,
    score: score.score,
    category_scores: score.categoryScores,
    executive_summary: deterministicSummary(snapshot, rules),
    store_strengths: storeStrengths,
    store_weaknesses: storeWeaknesses,
    products: snapshot.products.map((product, index) => {
      const retrieval = retrievalByIndex.get(index);
      const findings = productFindings.get(product.title) ?? { strengths: [], weaknesses: [] };
      return {
        title: product.title,
        url: product.url,
        image: product.images[0]?.src,
        metrics: {
          desc_words: retrieval?.metrics.descWords ?? product.descriptionWords,
          comp_desc_median: retrieval?.metrics.compDescMedian ?? 0,
          images: retrieval?.metrics.images ?? product.images.length,
          comp_image_median: retrieval?.metrics.compImageMedian ?? 0,
          price: retrieval?.metrics.price ?? product.price,
          comp_price_median: retrieval?.metrics.compPriceMedian ?? null,
          price_percentile: retrieval?.metrics.pricePercentile ?? null,
        },
        strengths: findings.strengths,
        weaknesses: findings.weaknesses,
        comparables: retrieval ? compEvidence(retrieval) : [],
      };
    }),
    products_audited: Math.min(snapshot.products.length, 8),
    products_total: snapshot.products.length,
    product_cap: 8,
    evidence,
    generated_at: snapshot.crawledAt,
  };
}
