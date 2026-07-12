// lib/embedding.mjs
//
// SHARED embedding + similarity helpers. Imported by both:
//   - scripts/build_kb.mjs (offline, embeds the corpus once)
//   - the runtime retrieve() path (embeds each audited product)
//
// The SAME function must run in both places or cosine similarity is meaningless,
// so this is the single source of truth. Provider is chosen from env:
//
//   VOYAGE_API_KEY   -> Voyage `voyage-3-lite`   (1024 dims)
//   OPENAI_API_KEY   -> OpenAI `text-embedding-3-small` (1536 dims)
//   (neither)        -> deterministic local hashing embedding (LOCAL_DIM dims)
//
// The local fallback keeps the app fully runnable with no keys (dev + demo of
// the plumbing). For the real KB you build with a provider key set.

const LOCAL_DIM = 256;

export function embeddingProvider() {
  if (process.env.VOYAGE_API_KEY) return "voyage";
  if (process.env.OPENAI_API_KEY) return "openai";
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
async function openaiEmbedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => normalize(d.embedding));
}

async function voyageEmbedBatch(texts) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: "voyage-3-lite", input: texts }),
  });
  if (!res.ok) throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => normalize(d.embedding));
}

// --- public API -------------------------------------------------------------
// Embed a batch of texts. Providers are batched; local is mapped.
export async function embedBatch(texts) {
  const provider = embeddingProvider();
  if (provider === "openai") return openaiEmbedBatch(texts);
  if (provider === "voyage") return voyageEmbedBatch(texts);
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
