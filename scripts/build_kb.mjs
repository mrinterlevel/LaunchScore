// scripts/build_kb.mjs
//
// Run once, offline, before the hackathon clock matters:
//   node scripts/build_kb.mjs
//
// Builds public/kb.json — the entire "vector store". Two corpora:
//   Corpus A ("listings"): ~120 proven products pulled from ~12 successful
//                          Shopify DTC stores via /collections/all/products.json
//   Corpus B ("guides"):   ~20 hand-written CRO guideline cards (data/guidelines.mjs)
//
// Each item is embedded once (see lib/embedding.mjs — real provider if a key is
// set, deterministic local fallback otherwise) and written with its vector.
// Runtime retrieval is brute-force cosine over this file (lib/kb.mjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embedBatch, embeddingProvider } from "../lib/embedding.mjs";
import { GUIDELINES } from "../data/guidelines.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "kb.json");

// ~12 successful Shopify DTC stores spanning the niches Daybot generates.
// All verified to expose /collections/all/products.json.
const STORES = [
  { url: "https://www.misen.com", niche: "kitchen" },
  { url: "https://deathwishcoffee.com", niche: "kitchen" },
  { url: "https://www.gozney.com", niche: "kitchen" },
  { url: "https://gymshark.com", niche: "fitness" },
  { url: "https://www.tenthousand.cc", niche: "fitness" },
  { url: "https://www.brooklinen.com", niche: "home" },
  { url: "https://www.snowehome.com", niche: "home" },
  { url: "https://www.beardbrand.com", niche: "beauty" },
  { url: "https://www.puravidabracelets.com", niche: "beauty" },
  { url: "https://maxbone.com", niche: "pets" },
  { url: "https://www.wildone.com", niche: "pets" },
  { url: "https://www.ridgewallet.com", niche: "gadgets" },
];

const PER_STORE = 10;
const UA = { "user-agent": "Mozilla/5.0 (compatible; LaunchScoreKB/1.0)" };

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const wordCount = (html) => {
  const t = stripHtml(html);
  return t ? t.split(/\s+/).length : 0;
};

function minVariantPrice(p) {
  const prices = (p.variants || [])
    .map((v) => parseFloat(v.price))
    .filter((n) => !Number.isNaN(n));
  return prices.length ? Math.min(...prices) : null;
}

async function fetchStore(store) {
  const url = `${store.url}/collections/all/products.json?limit=${PER_STORE}`;
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) {
      console.warn(`  ! ${store.url} -> HTTP ${r.status}, skipping`);
      return [];
    }
    const { products } = await r.json();
    return (products || []).slice(0, PER_STORE).map((p) => ({
      store: store.url,
      niche: store.niche,
      title: p.title,
      price: minVariantPrice(p),
      compare_at_price: parseFloat(p.variants?.[0]?.compare_at_price) || null,
      images: (p.images || []).length,
      desc: stripHtml(p.body_html).slice(0, 700),
      desc_words: wordCount(p.body_html),
      source_url: `${store.url}/products/${p.handle}`,
    }));
  } catch (e) {
    console.warn(`  ! ${store.url} -> ${e.message}, skipping`);
    return [];
  }
}

async function main() {
  console.log(`Embedding provider: ${embeddingProvider()}`);
  const items = [];

  // Corpus A — listings
  for (const store of STORES) {
    process.stdout.write(`Fetching ${store.niche.padEnd(8)} ${store.url} ... `);
    const products = await fetchStore(store);
    for (const p of products) {
      items.push({
        id: `COMP-${items.length}`,
        corpus: "listings",
        niche: p.niche,
        title: p.title,
        price: p.price,
        compare_at_price: p.compare_at_price,
        images: p.images,
        desc: p.desc,
        desc_words: p.desc_words,
        source_url: p.source_url,
      });
    }
    console.log(`${products.length} products`);
  }

  const listingCount = items.length;

  // Corpus B — guideline cards
  GUIDELINES.forEach((g, i) => {
    items.push({
      id: `GUIDE-${i}`,
      corpus: "guides",
      topic: g.topic,
      text: g.text,
    });
  });

  console.log(`\nCorpus A: ${listingCount} listings, Corpus B: ${GUIDELINES.length} guides`);
  console.log(`Embedding ${items.length} items ...`);

  // Embed the text of every item. For listings: "title. desc"; for guides: text.
  const texts = items.map((it) =>
    it.corpus === "guides" ? it.text : `${it.title}. ${it.desc}`
  );

  // Batch to keep provider requests reasonable.
  const BATCH = 64;
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH);
    const vecs = await embedBatch(chunk);
    vectors.push(...vecs);
    process.stdout.write(`  embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}\r`);
  }
  items.forEach((it, i) => (it.vector = vectors[i]));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(items));
  const kb = fs.statSync(OUT);
  console.log(`\nWrote ${OUT} (${items.length} items, ${(kb.size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
