// lib/taxonomy.ts
//
// SHARED CONTRACT (plan Section 4). The fixed issue taxonomy is what makes
// /patterns possible: every finding — from a rule OR the LLM — carries exactly
// one canonical code from this closed list, so the dashboard is a GROUP BY.
//
// Depended on by: the rule engine, the LLM prompt (ALLOWED_CODES), scoring
// (category weights), and the UI (code -> label/category). Keep it the single
// source of truth; if Person A maintains a copy, they must be identical.

import type { Category } from "./types";

export interface IssueDef {
  cat: Category;
  label: string;
  kind: "weakness" | "strength";
}

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  trust: 25,
  content: 25,
  pricing: 20,
  seo: 15,
  catalog: 15,
};

export const ISSUES = {
  // TRUST (weight 25)
  NO_RETURN_POLICY: { cat: "trust", label: "Missing return policy", kind: "weakness" },
  NO_SHIPPING_INFO: { cat: "trust", label: "No shipping time stated", kind: "weakness" },
  NO_REVIEWS: { cat: "trust", label: "No customer reviews", kind: "weakness" },
  NO_CONTACT: { cat: "trust", label: "No contact method", kind: "weakness" },
  PLACEHOLDER_TEXT: { cat: "trust", label: "Placeholder/lorem text", kind: "weakness" },

  // CONTENT (weight 25)
  THIN_DESCRIPTION: { cat: "content", label: "Description too thin", kind: "weakness" },
  SPECS_NOT_BENEFITS: { cat: "content", label: "Specs without benefits", kind: "weakness" },
  FEW_IMAGES: { cat: "content", label: "Too few product images", kind: "weakness" },
  NO_ALT_TEXT: { cat: "content", label: "Missing image alt text", kind: "weakness" },
  DUPLICATE_COPY: { cat: "content", label: "Duplicated descriptions", kind: "weakness" },

  // PRICING (weight 20)
  PRICE_OUTLIER: { cat: "pricing", label: "Price far from comps", kind: "weakness" },
  FAKE_DISCOUNT: { cat: "pricing", label: "Implausible discount", kind: "weakness" },
  NO_CHARM_PRICING: { cat: "pricing", label: "No .99/.95 pricing", kind: "weakness" },

  // SEO (weight 15)
  META_MISSING: { cat: "seo", label: "Missing/short meta desc", kind: "weakness" },
  DUP_TITLES: { cat: "seo", label: "Duplicate title tags", kind: "weakness" },
  NO_SCHEMA: { cat: "seo", label: "No Product JSON-LD", kind: "weakness" },

  // CATALOG (weight 15)
  INCOHERENT_NICHE: { cat: "catalog", label: "Products lack a niche", kind: "weakness" },
  CATALOG_SIZE: { cat: "catalog", label: "Too few/many products", kind: "weakness" },

  // STRENGTH codes mirror the categories above.
  STRONG_TRUST: { cat: "trust", label: "Return & shipping policy present", kind: "strength" },
  RICH_DESCRIPTION: { cat: "content", label: "Rich, benefit-led description", kind: "strength" },
  GOOD_IMAGERY: { cat: "content", label: "Strong product imagery", kind: "strength" },
  PRICED_WITH_MARKET: { cat: "pricing", label: "Priced in line with the market", kind: "strength" },
  CLEAN_SEO: { cat: "seo", label: "Clean SEO basics", kind: "strength" },
  COHERENT_NICHE: { cat: "catalog", label: "Fits the store's niche", kind: "strength" },
} as const satisfies Record<string, IssueDef>;

export type IssueCode = keyof typeof ISSUES;

export const ALLOWED_CODES = Object.keys(ISSUES) as IssueCode[];

export function issueLabel(code: string): string {
  return (ISSUES as Record<string, IssueDef>)[code]?.label ?? code;
}

export function issueCategory(code: string): Category {
  return (ISSUES as Record<string, IssueDef>)[code]?.cat ?? "content";
}
