// lib/kb.ts
//
// The entire "vector store": load public/kb.json once and brute-force cosine
// over it. Sized to the corpus (~140 items) — retrieval is retrieval.
//
// Person A calls retrieve() from the pipeline after embedding each product with
// lib/embedding.mjs `embed()` (same function used to build the KB).

import fs from "node:fs";
import path from "node:path";
import { cosine } from "./embedding.mjs";

export interface KbListing {
  id: string; // COMP-*
  corpus: "listings";
  niche: string;
  title: string;
  price: number | null;
  compare_at_price: number | null;
  images: number;
  desc: string;
  desc_words: number;
  source_url: string;
  vector: number[];
}

export interface KbGuide {
  id: string; // GUIDE-*
  corpus: "guides";
  topic: string;
  text: string;
  vector: number[];
}

export type KbItem = KbListing | KbGuide;

let _kb: KbItem[] | null = null;

export function loadKb(): KbItem[] {
  if (_kb) return _kb;
  const p = path.join(process.cwd(), "public", "kb.json");
  _kb = JSON.parse(fs.readFileSync(p, "utf8")) as KbItem[];
  return _kb;
}

export interface Retrieved<T> {
  item: T;
  sim: number;
}

// Retrieve top-k items of a corpus by cosine similarity to `vec`.
// For listings you may pass a `niche` to bias toward same-niche comps; if fewer
// than k exist in that niche we fall back to filling from all niches.
export function retrieve(
  vec: number[],
  corpus: "listings" | "guides",
  k: number,
  niche?: string
): KbItem[] {
  const kb = loadKb();
  const scored = kb
    .filter((x) => x.corpus === corpus)
    .map((x) => ({ item: x, sim: cosine(vec, x.vector) }))
    .sort((a, b) => b.sim - a.sim);

  if (corpus === "listings" && niche) {
    const sameNiche = scored.filter((s) => (s.item as KbListing).niche === niche);
    const picked = sameNiche.slice(0, k);
    if (picked.length < k) {
      const seen = new Set(picked.map((p) => p.item.id));
      for (const s of scored) {
        if (picked.length >= k) break;
        if (!seen.has(s.item.id)) picked.push(s);
      }
    }
    return picked.map((s) => ({ ...s.item, sim: s.sim } as unknown as KbItem));
  }

  return scored.slice(0, k).map((s) => ({ ...s.item, sim: s.sim } as unknown as KbItem));
}

// Median helper — used by metrics (comp_desc_median etc.). Kept here since the
// KB is where comps come from; Person A may re-import.
export function median(nums: number[]): number | null {
  const xs = nums.filter((n) => typeof n === "number" && !Number.isNaN(n)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
