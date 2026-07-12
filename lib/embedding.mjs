// lib/embedding.mjs
//
// SHARED embedding + similarity helpers. Imported by both:
//   - scripts/build_kb.mjs (offline, embeds the corpus once)
//   - the runtime retrieve() path (embeds each audited product)
//
// The SAME function must run in both places or cosine similarity is meaningless,
// so this is the single source of truth. Provider is chosen from env:
//
//   GEMINI_API_KEY   -> Gemini `gemini-embedding-2`
//   (unset)          -> deterministic local hashing embedding (LOCAL_DIM dims)
//
// The local fallback keeps the app fully runnable with no keys (dev + demo of
// the plumbing). For the real KB you build with a provider key set.

import { GoogleGenAI } from "@google/genai";

const LOCAL_DIM = 256;
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";

export function embeddingProvider() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

// --- deterministic local embedding -----------------------------------------
// Bag-of-words hashed into LOCAL_DIM buckets with sublinear tf, then L2
// normalized so a plain dot product == cosine similarity.
function localEmbed(text) {
  const vec = new Array(LOCAL_DIM).fill(0);
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  for (const [tok, c] of counts) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % LOCAL_DIM;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx] += sign * (1 + Math.log(c));
  }
  return normalize(vec);
}

function normalize(vec) {
  let norm = 0;
  for (const x of vec) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return vec.map((x) => x / norm);
}

// --- provider calls ---------------------------------------------------------
async function geminiEmbedBatch(texts) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: texts.map((text) => ({ parts: [{ text }] })),
  });
  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== texts.length || embeddings.some((embedding) => !embedding.values?.length)) {
    throw new Error("Gemini returned an incomplete embedding batch.");
  }
  return embeddings.map((embedding) => normalize(embedding.values));
}

// --- public API -------------------------------------------------------------
// Embed a batch of texts. Providers are batched; local is mapped.
export async function embedBatch(texts) {
  const provider = embeddingProvider();
  if (provider === "gemini") return geminiEmbedBatch(texts);
  return texts.map(localEmbed);
}

export async function embed(text) {
  const [v] = await embedBatch([text]);
  return v;
}

// Cosine similarity for L2-normalized vectors == dot product.
export function cosine(a, b) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
