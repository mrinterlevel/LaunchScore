// lib/auditStore.ts
//
// Process-local, in-memory store for real audits when Supabase isn't
// configured. It lets a freshly-run audit be viewed at /report/[id] without
// inventing sample records.
//
// Caveats: not shared across processes and not durable. When Supabase is
// configured, this is never used (persist writes to the DB and getAudit reads
// from it). Uses globalThis so the map survives Next.js dev hot-reloads.

import type { Audit, Report } from "./types";

const MAX = 50;

type Store = Map<string, Audit>;

const g = globalThis as unknown as { __launchscoreAudits?: Store };
const store: Store = (g.__launchscoreAudits ??= new Map());

export function putMemAudit(report: Report): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  store.set(id, {
    id,
    store_url: report.store_url,
    score: report.score,
    category_scores: report.category_scores,
    report,
    created_at: report.generated_at ?? new Date().toISOString(),
  });
  // Evict oldest entries beyond MAX (Map preserves insertion order).
  while (store.size > MAX) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
  return id;
}

export function getMemAudit(id: string): Audit | null {
  return store.get(id) ?? null;
}
