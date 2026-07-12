import { cosine, embed } from "@/lib/embedding.mjs";
import {
  loadKb,
  median,
  retrieve,
  type KbGuide,
  type KbItem,
  type KbListing,
} from "@/lib/kb";
import { ISSUES, type IssueCode } from "@/lib/taxonomy";

import type { ProductRetrieval, RuleResult, StoreSnapshot } from "./types";

type RetrievedListing = KbListing & { sim: number };
type RetrievedGuide = KbGuide & { sim: number };

function isListing(item: KbItem): item is KbListing {
  return item.corpus === "listings";
}

function isGuide(item: KbItem): item is KbGuide {
  return item.corpus === "guides";
}

function retrievedListings(vector: number[], count: number, niche?: string): RetrievedListing[] {
  return retrieve(vector, "listings", count, niche).filter(isListing) as RetrievedListing[];
}

function retrievedGuides(vector: number[], count: number): RetrievedGuide[] {
  return retrieve(vector, "guides", count).filter(isGuide) as RetrievedGuide[];
}

function productEmbeddingText(title: string, description: string): string {
  return `${title}. ${description}`.trim();
}

function pricePercentile(price: number | null, comps: KbListing[]): number | null {
  if (price == null) return null;
  const priced = comps.map((comp) => comp.price).filter((value): value is number => value != null);
  if (!priced.length) return null;
  return Math.round((priced.filter((value) => value <= price).length / priced.length) * 100);
}

function assertVectorCompatibility(vector: number[]): void {
  const kbVector = loadKb().find((item) => item.vector.length > 0)?.vector;
  if (!kbVector || kbVector.length !== vector.length) {
    throw new Error(
      "Knowledge-base embedding dimensions do not match runtime embeddings. Rebuild public/kb.json with npm run build:kb using the current embedding provider.",
    );
  }
}

export async function retrieveProductEvidence(snapshot: StoreSnapshot): Promise<ProductRetrieval[]> {
  const results = await Promise.all(
    snapshot.products.map(async (product, productIndex) => {
      const vector = await embed(productEmbeddingText(product.title, product.description));
      assertVectorCompatibility(vector);
      const firstComp = retrievedListings(vector, 1)[0];
      const niche = firstComp?.niche ?? "general";
      const comps = retrievedListings(vector, 4, niche);
      const guides = retrievedGuides(vector, 3);
      const compDescMedian = median(comps.map((comp) => comp.desc_words)) ?? 0;
      const compImageMedian = median(comps.map((comp) => comp.images)) ?? 0;
      const compPriceMedian = median(
        comps.map((comp) => comp.price).filter((price): price is number => price != null),
      );

      return {
        productIndex,
        vector,
        niche,
        comps: comps.map((comp) => ({
          id: comp.id,
          title: comp.title,
          niche: comp.niche,
          price: comp.price,
          images: comp.images,
          descWords: comp.desc_words,
          sim: comp.sim,
          sourceUrl: comp.source_url,
        })),
        guides: guides.map((guide) => ({
          id: guide.id,
          topic: guide.topic,
          text: guide.text,
          sim: guide.sim,
        })),
        metrics: {
          descWords: product.descriptionWords,
          compDescMedian,
          images: product.images.length,
          compImageMedian,
          price: product.price,
          compPriceMedian,
          pricePercentile: pricePercentile(product.price, comps),
        },
      } satisfies ProductRetrieval;
    }),
  );

  return results;
}

function metricResult(
  id: string,
  code: IssueCode,
  passed: boolean,
  detail: string,
  productTitle: string | null,
): RuleResult {
  const issue = ISSUES[code];
  return {
    id,
    code,
    type: issue.kind,
    category: issue.cat,
    severity: issue.kind === "weakness" ? "med" : null,
    passed,
    label: issue.label,
    detail,
    productTitle,
  };
}

export function deriveRetrievalRules(
  snapshot: StoreSnapshot,
  retrievals: ProductRetrieval[],
): RuleResult[] {
  const results: RuleResult[] = [];

  for (const retrieval of retrievals) {
    const product = snapshot.products[retrieval.productIndex];
    if (!product) continue;
    const percentile = retrieval.metrics.pricePercentile;
    if (percentile != null) {
      const inMarketRange = percentile >= 10 && percentile <= 90;
      results.push(
        metricResult(
          `RULE-PRICE-MARKET-${retrieval.productIndex + 1}`,
          inMarketRange ? "PRICED_WITH_MARKET" : "PRICE_OUTLIER",
          inMarketRange,
          inMarketRange
            ? `Price sits in the ${percentile}th percentile of retrieved comparables.`
            : `Price sits in the ${percentile}th percentile of retrieved comparables.`,
          product.title,
        ),
      );
    }
  }

  for (let left = 0; left < retrievals.length; left += 1) {
    for (let right = left + 1; right < retrievals.length; right += 1) {
      const leftProduct = snapshot.products[retrievals[left].productIndex];
      const rightProduct = snapshot.products[retrievals[right].productIndex];
      if (!leftProduct || !rightProduct || !leftProduct.description || !rightProduct.description) continue;
      const similarity = cosine(retrievals[left].vector, retrievals[right].vector);
      if (similarity > 0.92) {
        results.push(
          metricResult(
            `RULE-DUPLICATE-COPY-${left + 1}-${right + 1}`,
            "DUPLICATE_COPY",
            false,
            `${leftProduct.title} and ${rightProduct.title} have near-identical descriptions (${similarity.toFixed(2)} cosine similarity).`,
            leftProduct.title,
          ),
        );
      }
    }
  }

  if (retrievals.length >= 2) {
    const similarities: number[] = [];
    for (let left = 0; left < retrievals.length; left += 1) {
      for (let right = left + 1; right < retrievals.length; right += 1) {
        similarities.push(cosine(retrievals[left].vector, retrievals[right].vector));
      }
    }
    const average = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
    const coherent = average >= 0.35;
    results.push(
      metricResult(
        "RULE-NICHE-COHERENCE",
        coherent ? "COHERENT_NICHE" : "INCOHERENT_NICHE",
        coherent,
        coherent
          ? `Catalog description similarity averages ${average.toFixed(2)}.`
          : `Catalog description similarity averages ${average.toFixed(2)}, below the 0.35 coherence threshold.`,
        null,
      ),
    );
  }

  return results;
}
