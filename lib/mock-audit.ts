import type { CompEvidence, EvidenceMap, Report } from "@/lib/types";

export function createMockReport(storeUrl: string): Report {
  const storeName = new URL(storeUrl).hostname.replace(/^www\./, "");
  const comparable: CompEvidence = {
    id: "COMP-17",
    kind: "comp",
    title: "Insulated Bottle Pro",
    niche: "kitchen",
    price: 34.99,
    images: 6,
    desc_words: 184,
    sim: 0.82,
    source_url: "https://example.com/products/insulated-bottle-pro",
  };

  const evidence: EvidenceMap = {
    "RULE-SHIPPING-1": {
      id: "RULE-SHIPPING-1",
      kind: "rule",
      label: "Shipping-window check",
      detail:
        "No delivery-window language was found on the homepage, product page, or policy links.",
      passed: false,
    },
    "GUIDE-TRUST-2": {
      id: "GUIDE-TRUST-2",
      kind: "guide",
      topic: "trust",
      text: "A concrete dispatch and delivery window reduces uncertainty before purchase.",
      sim: 0.76,
    },
    "RULE-SEO-1": {
      id: "RULE-SEO-1",
      kind: "rule",
      label: "Metadata check",
      detail:
        "The homepage meta description is present and falls within the recommended length range.",
      passed: true,
    },
    "RULE-DESC-1": {
      id: "RULE-DESC-1",
      kind: "rule",
      label: "Description depth check",
      detail: "The product description contains 46 words, below the 80-word rule threshold.",
      passed: false,
    },
    "RULE-IMAGES-1": {
      id: "RULE-IMAGES-1",
      kind: "rule",
      label: "Image-count check",
      detail: "Five distinct product images were detected.",
      passed: true,
    },
    [comparable.id]: comparable,
  };

  return {
    store_url: storeUrl,
    score: 72,
    category_scores: {
      trust: 62,
      content: 68,
      pricing: 76,
      seo: 88,
      catalog: 73,
    },
    executive_summary: `${storeName} has a solid launch foundation, with strong metadata and product imagery. Clarifying shipping expectations and expanding product copy would create the biggest lift before launch.`,
    store_strengths: [
      {
        code: "CLEAN_SEO",
        label: "Clean SEO basics",
        category: "seo",
        finding:
          "The homepage has a descriptive title, useful meta description, and valid social metadata.",
        evidence: ["RULE-SEO-1"],
      },
    ],
    store_weaknesses: [
      {
        code: "NO_SHIPPING_INFO",
        label: "No shipping time stated",
        category: "trust",
        severity: "high",
        finding:
          "The storefront does not state a concrete delivery window before checkout.",
        how_top_stores_do_it:
          "Top stores show a delivery estimate near add-to-cart and link to a detailed shipping policy.",
        evidence: ["RULE-SHIPPING-1", "GUIDE-TRUST-2"],
      },
    ],
    products: [
      {
        title: "Everyday Carry Bottle",
        url: `${storeUrl}/products/everyday-carry-bottle`,
        metrics: {
          desc_words: 46,
          comp_desc_median: 171,
          images: 5,
          comp_image_median: 6,
          price: 29,
          comp_price_median: 34.99,
          price_percentile: 34,
        },
        strengths: [
          {
            code: "GOOD_IMAGERY",
            label: "Strong product imagery",
            category: "content",
            finding:
              "The image set shows the product clearly from multiple angles and in use.",
            evidence: ["RULE-IMAGES-1"],
          },
        ],
        weaknesses: [
          {
            code: "THIN_DESCRIPTION",
            label: "Description too thin",
            category: "content",
            severity: "med",
            finding:
              "The description is substantially shorter than relevant successful listings.",
            how_top_stores_do_it:
              "Top listings explain materials, dimensions, care, and the practical benefit of each feature.",
            evidence: ["RULE-DESC-1", comparable.id],
          },
        ],
        comparables: [comparable],
      },
    ],
    products_audited: 1,
    products_total: 1,
    product_cap: 8,
    evidence,
    generated_at: new Date().toISOString(),
  };
}
