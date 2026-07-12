import { describe, expect, it } from "vitest";

import { buildDeterministicReport } from "./report";
import { deriveRetrievalRules } from "./retrieval";
import { runRules } from "./rules";
import type { ProductRetrieval, StoreSnapshot } from "./types";

function snapshot(): StoreSnapshot {
  return {
    storeUrl: "https://shop.example/",
    siteName: "Example Shop",
    homepage: {
      url: "https://shop.example/",
      title: "Example Shop",
      metaDescription: "x".repeat(140),
      bodyText: "Welcome. Orders ship in 2–4 business days.",
    },
    policies: [
      {
        kind: "returns",
        url: "https://shop.example/policies/returns",
        title: "Returns",
        metaDescription: "",
        bodyText: "30-day returns",
      },
      {
        kind: "shipping",
        url: "https://shop.example/policies/shipping",
        title: "Shipping",
        metaDescription: "",
        bodyText: "Orders ship in 2–4 business days.",
      },
    ],
    contacts: ["hello@shop.example"],
    warnings: [],
    crawledAt: "2026-07-12T00:00:00.000Z",
    products: [
      {
        url: "https://shop.example/products/bottle",
        title: "Everyday Bottle",
        metaDescription: "",
        bodyText: "",
        description: "x ".repeat(100),
        descriptionWords: 100,
        price: 29.99,
        compareAtPrice: null,
        images: [
          { src: "https://cdn.example/1.jpg", alt: "Bottle front" },
          { src: "https://cdn.example/2.jpg", alt: "Bottle side" },
          { src: "https://cdn.example/3.jpg", alt: "Bottle open" },
        ],
        hasProductSchema: true,
        hasReviews: true,
      },
      {
        url: "https://shop.example/products/mug",
        title: "Everyday Mug",
        metaDescription: "",
        bodyText: "",
        description: "y ".repeat(120),
        descriptionWords: 120,
        price: 24.95,
        compareAtPrice: null,
        images: [
          { src: "https://cdn.example/4.jpg", alt: "Mug front" },
          { src: "https://cdn.example/5.jpg", alt: "Mug side" },
          { src: "https://cdn.example/6.jpg", alt: "Mug handle" },
        ],
        hasProductSchema: true,
        hasReviews: true,
      },
    ],
  };
}

function retrievals(): ProductRetrieval[] {
  return [0, 1].map((productIndex) => ({
    productIndex,
    vector: productIndex === 0 ? [1, 0] : [0.9, 0.4],
    niche: "kitchen",
    comps: [
      {
        id: `COMP-${productIndex}`,
        title: "Comparable",
        niche: "kitchen",
        price: 28.99,
        images: 4,
        descWords: 110,
        sim: 0.8,
      },
    ],
    guides: [
      { id: `GUIDE-${productIndex}`, topic: "description", text: "Use benefit-led copy.", sim: 0.7 },
    ],
    metrics: {
      descWords: productIndex === 0 ? 100 : 120,
      compDescMedian: 110,
      images: 3,
      compImageMedian: 4,
      price: productIndex === 0 ? 29.99 : 24.95,
      compPriceMedian: 28.99,
      pricePercentile: 50,
    },
  }));
}

describe("buildDeterministicReport", () => {
  it("produces a contract-valid report whose findings only cite known evidence", () => {
    const store = snapshot();
    const productRetrievals = retrievals();
    const rules = [...runRules(store), ...deriveRetrievalRules(store, productRetrievals)];
    const report = buildDeterministicReport(store, rules, productRetrievals);
    const allFindings = [
      ...report.store_strengths,
      ...report.store_weaknesses,
      ...report.products.flatMap((product) => [...product.strengths, ...product.weaknesses]),
    ];

    expect(report.products_audited).toBe(2);
    expect(report.products_total).toBe(2);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    for (const finding of allFindings) {
      expect(finding.evidence.every((id) => report.evidence[id] !== undefined)).toBe(true);
    }
  });

  it("returns a valid report for a store with no crawlable products", () => {
    const store = snapshot();
    store.products = [];
    const rules = runRules(store);
    const report = buildDeterministicReport(store, rules, []);

    expect(report.products).toEqual([]);
    expect(report.products_total).toBe(0);
    expect(report.store_weaknesses.some((finding) => finding.code === "CATALOG_SIZE")).toBe(true);
  });
});
