// lib/fixtures.ts
//
// A realistic fake audit used to build and demo the UI before Person A's
// /api/audit is wired up ("Report page against the fake report JSON").
// Also used by the data layer as a graceful fallback when Supabase isn't
// configured, so the whole app runs end-to-end with zero setup.

import type { Audit, EvidenceMap, Report } from "./types";

const evidence: EvidenceMap = {
  "RULE-THIN_DESCRIPTION": {
    id: "RULE-THIN_DESCRIPTION",
    kind: "rule",
    label: "Description too thin",
    detail: "Product description is 38 words; strong listings run 150–300.",
    passed: false,
  },
  "RULE-FEW_IMAGES": {
    id: "RULE-FEW_IMAGES",
    kind: "rule",
    label: "Too few product images",
    detail: "Only 1 image found; comparable listings show a median of 5.",
    passed: false,
  },
  "RULE-NO_SCHEMA": {
    id: "RULE-NO_SCHEMA",
    kind: "rule",
    label: "No Product JSON-LD",
    detail: "No Product structured data emitted on the page.",
    passed: false,
  },
  "RULE-NO_CHARM_PRICING": {
    id: "RULE-NO_CHARM_PRICING",
    kind: "rule",
    label: "No .99/.95 pricing",
    detail: "Price is $40.00 — a round number rather than charm pricing.",
    passed: false,
  },
  "RULE-STRONG_TRUST": {
    id: "RULE-STRONG_TRUST",
    kind: "rule",
    label: "Return & shipping policy present",
    detail: "Return policy and a concrete shipping window were both found.",
    passed: true,
  },
  "COMP-14": {
    id: "COMP-14",
    kind: "comp",
    title: "Titanium Insulated Tumbler 20oz",
    niche: "kitchen",
    price: 34.99,
    images: 6,
    desc_words: 214,
    sim: 0.81,
    source_url: "https://example-comp.com/products/tumbler",
  },
  "COMP-31": {
    id: "COMP-31",
    kind: "comp",
    title: "Double-Wall Ceramic Mug Set",
    niche: "kitchen",
    price: 28.0,
    images: 5,
    desc_words: 176,
    sim: 0.77,
    source_url: "https://example-comp.com/products/mug-set",
  },
  "COMP-08": {
    id: "COMP-08",
    kind: "comp",
    title: "Pour-Over Coffee Carafe",
    niche: "kitchen",
    price: 42.5,
    images: 7,
    desc_words: 231,
    sim: 0.73,
    source_url: "https://example-comp.com/products/carafe",
  },
  "GUIDE-5": {
    id: "GUIDE-5",
    kind: "guide",
    topic: "description",
    text:
      "Thin product descriptions under ~80 words leave buyers guessing and hurt search ranking. Strong listings run 150–300 words covering what it is, who it is for, materials, sizing, and everyday use.",
    sim: 0.68,
  },
  "GUIDE-9": {
    id: "GUIDE-9",
    kind: "guide",
    topic: "images",
    text:
      "A single product image is rarely enough. High-converting listings show three or more: on white, in-context, a scale reference, and a detail close-up.",
    sim: 0.64,
  },
};

const report: Report = {
  store_url: "https://demo-daybot-store.myshopify.com",
  score: 57,
  category_scores: { trust: 74, content: 41, pricing: 55, seo: 48, catalog: 66 },
  executive_summary:
    "This store has a trustworthy foundation — a clear return policy and a stated shipping window — but its product pages are underbuilt. Descriptions average 44 words against a comparable median of ~190, most products ship a single image, and no page emits Product structured data. Closing the content and SEO gaps would move this listing from 'looks like a template' to 'ready to launch'.",
  store_strengths: [
    {
      code: "STRONG_TRUST",
      label: "Return & shipping policy present",
      category: "trust",
      finding: "The store surfaces a 30-day return policy and a 2–4 day shipping window on product pages.",
      evidence: ["RULE-STRONG_TRUST"],
    },
  ],
  store_weaknesses: [
    {
      code: "THIN_DESCRIPTION",
      label: "Description too thin",
      category: "content",
      severity: "high",
      finding: "Across audited products, descriptions average 44 words versus a comparable median near 190.",
      how_top_stores_do_it:
        "Top comparables devote 150–300 words to materials, sizing, and use-cases, translating specs into benefits.",
      evidence: ["RULE-THIN_DESCRIPTION", "GUIDE-5", "COMP-14"],
    },
    {
      code: "NO_SCHEMA",
      label: "No Product JSON-LD",
      category: "seo",
      severity: "med",
      finding: "No product page emits Product structured data, forfeiting rich results in search.",
      how_top_stores_do_it:
        "Comparable stores emit Product JSON-LD with price, availability, and rating, earning star-rating rich snippets.",
      evidence: ["RULE-NO_SCHEMA"],
    },
  ],
  products: [
    {
      title: "Stainless Steel Travel Mug",
      url: "https://demo-daybot-store.myshopify.com/products/travel-mug",
      metrics: {
        desc_words: 38,
        comp_desc_median: 190,
        images: 1,
        comp_image_median: 5,
        price: 40.0,
        comp_price_median: 34.99,
        price_percentile: 68,
      },
      strengths: [
        {
          code: "PRICED_WITH_MARKET",
          label: "Priced in line with the market",
          category: "pricing",
          finding: "At $40 the mug sits within the range of comparable insulated drinkware.",
          evidence: ["COMP-14", "COMP-31"],
        },
      ],
      weaknesses: [
        {
          code: "THIN_DESCRIPTION",
          label: "Description too thin",
          category: "content",
          severity: "high",
          finding: "The description is 38 words and lists specs without explaining benefits.",
          how_top_stores_do_it:
            "The top comparable (214 words) opens with the payoff — 'coffee stays hot through your whole commute' — then backs it with the 20oz double-wall spec.",
          evidence: ["RULE-THIN_DESCRIPTION", "GUIDE-5", "COMP-14"],
        },
        {
          code: "FEW_IMAGES",
          label: "Too few product images",
          category: "content",
          severity: "high",
          finding: "Only one image is shown; buyers can't see scale, lid detail, or in-use context.",
          how_top_stores_do_it:
            "Comparable listings show a median of 5 images including a lifestyle shot and a detail close-up.",
          evidence: ["RULE-FEW_IMAGES", "GUIDE-9", "COMP-08"],
        },
        {
          code: "NO_CHARM_PRICING",
          label: "No .99/.95 pricing",
          category: "pricing",
          severity: "low",
          finding: "The price is a round $40.00 rather than charm-priced.",
          how_top_stores_do_it: "Comparable mainstream drinkware prices at $34.99, anchoring the leftmost digit lower.",
          evidence: ["RULE-NO_CHARM_PRICING", "COMP-14"],
        },
      ],
      comparables: [
        evidence["COMP-14"] as any,
        evidence["COMP-31"] as any,
        evidence["COMP-08"] as any,
      ],
    },
    {
      title: "Ceramic Pour-Over Set",
      url: "https://demo-daybot-store.myshopify.com/products/pour-over",
      metrics: {
        desc_words: 51,
        comp_desc_median: 190,
        images: 2,
        comp_image_median: 5,
        price: 24.0,
        comp_price_median: 42.5,
        price_percentile: 22,
      },
      strengths: [
        {
          code: "COHERENT_NICHE",
          label: "Fits the store's niche",
          category: "catalog",
          finding: "The pour-over set is coherent with the store's coffee-and-kitchen catalog.",
          evidence: ["COMP-08"],
        },
      ],
      weaknesses: [
        {
          code: "THIN_DESCRIPTION",
          label: "Description too thin",
          category: "content",
          severity: "high",
          finding: "51 words with no mention of capacity, material care, or brew guidance.",
          how_top_stores_do_it:
            "The comparable carafe listing (231 words) covers capacity, heat resistance, and a step-by-step brew ritual.",
          evidence: ["RULE-THIN_DESCRIPTION", "GUIDE-5", "COMP-08"],
        },
        {
          code: "PRICE_OUTLIER",
          label: "Price far from comps",
          category: "pricing",
          severity: "med",
          finding: "At $24 it sits in the 22nd percentile of comps — low enough to raise quality doubts.",
          how_top_stores_do_it:
            "Comparable pour-over sets price near $42 and justify it with ceramic-quality and capacity copy.",
          evidence: ["COMP-08"],
        },
      ],
      comparables: [evidence["COMP-08"] as any, evidence["COMP-31"] as any],
    },
  ],
  products_audited: 2,
  products_total: 2,
  product_cap: 8,
  evidence,
  generated_at: "2026-07-12T16:00:00.000Z",
};

export const FAKE_AUDIT: Audit = {
  id: "demo",
  store_url: report.store_url,
  score: report.score,
  category_scores: report.category_scores,
  report,
  created_at: report.generated_at,
};

// ---------------------------------------------------------------------------
// Fake aggregated patterns data (for /patterns before real audits exist).
// Mirrors the shape of what getPatterns() returns from Supabase.
// ---------------------------------------------------------------------------
import type { PatternsData } from "./data";

export const FAKE_PATTERNS: PatternsData = {
  audit_count: 9,
  avg_score: 58,
  avg_category_scores: { trust: 71, content: 43, pricing: 59, seo: 46, catalog: 64 },
  problems: [
    { code: "THIN_DESCRIPTION", label: "Description too thin", category: "content", n: 41, stores_affected: 8, top_severity: "high" },
    { code: "NO_REVIEWS", label: "No customer reviews", category: "trust", n: 9, stores_affected: 9, top_severity: "high" },
    { code: "FEW_IMAGES", label: "Too few product images", category: "content", n: 33, stores_affected: 7, top_severity: "high" },
    { code: "DUPLICATE_COPY", label: "Duplicated descriptions", category: "content", n: 22, stores_affected: 6, top_severity: "med" },
    { code: "NO_SCHEMA", label: "No Product JSON-LD", category: "seo", n: 18, stores_affected: 6, top_severity: "med" },
    { code: "NO_CHARM_PRICING", label: "No .99/.95 pricing", category: "pricing", n: 27, stores_affected: 5, top_severity: "low" },
    { code: "META_MISSING", label: "Missing/short meta desc", category: "seo", n: 15, stores_affected: 5, top_severity: "med" },
    { code: "NO_ALT_TEXT", label: "Missing image alt text", category: "content", n: 20, stores_affected: 4, top_severity: "low" },
  ],
  strengths: [
    { code: "STRONG_TRUST", label: "Return & shipping policy present", category: "trust", n: 24, stores_affected: 8, top_severity: null },
    { code: "COHERENT_NICHE", label: "Fits the store's niche", category: "catalog", n: 31, stores_affected: 7, top_severity: null },
    { code: "PRICED_WITH_MARKET", label: "Priced in line with the market", category: "pricing", n: 19, stores_affected: 6, top_severity: null },
    { code: "CLEAN_SEO", label: "Clean SEO basics", category: "seo", n: 8, stores_affected: 3, top_severity: null },
  ],
  insights:
    "Across 9 audited Daybot stores, not one shipped with customer reviews enabled, and 8 of 9 had product descriptions averaging under 80 words — the single biggest drag on the content score. Every store nailed trust basics (return policy and shipping windows), so Daybot's template foundations are sound. The highest-leverage change would be scaffolding richer description templates that prompt for materials, sizing, and benefits; our estimate is that alone would lift the average content score by ~14 points and the overall LaunchScore from 58 to roughly 66.",
};
