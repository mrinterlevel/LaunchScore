// lib/supabase.ts
//
// Shared Supabase client. Person A writes audits/findings here from the
// pipeline; Person B reads them for /report and /patterns.
//
// Returns null when env vars are absent. The UI then shows empty states rather
// than sample data. Set these to persist and aggregate audits:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SECRET_KEY  (preferred, server-only; used by the pipeline + reads)
//   SUPABASE_SERVICE_ROLE_KEY  (legacy server-only fallback)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null | undefined;

export function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value.trim());
    // The dashboard's REST endpoint is commonly copied as
    // https://<ref>.supabase.co/rest/v1. createClient expects the project root
    // and appends /rest/v1 itself, so normalize that endpoint to the root.
    if (url.pathname.replace(/\/+$/, "") === "/rest/v1") url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

export function getSupabaseServerKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getSupabaseServerKey();
  _client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return _client;
}

export function supabaseConfigured(): boolean {
  return getSupabase() !== null;
}
