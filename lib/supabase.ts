// lib/supabase.ts
//
// Shared Supabase client. Person A writes audits/findings here from the
// pipeline; Person B reads them for /report and /patterns.
//
// Returns null when env vars are absent so the app degrades gracefully to
// fixtures instead of crashing (see lib/data.ts). Set these to go live:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SECRET_KEY  (preferred, server-only; used by the pipeline + reads)
//   SUPABASE_SERVICE_ROLE_KEY  (legacy server-only fallback)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null | undefined;

export function getSupabaseServerKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseServerKey();
  _client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return _client;
}

export function supabaseConfigured(): boolean {
  return getSupabase() !== null;
}
