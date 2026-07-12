import { NextResponse } from "next/server";

// ===========================================================================
// ⚠️  STUB — OWNED BY PERSON A (pipeline). Person B added this placeholder only
//     so the home → spinner → /report flow is testable end-to-end against the
//     fixture. Person A replaces the body with the real pipeline:
//       CRAWL → RULES → RETRIEVE → METRICS → SYNTH → SCORE → PERSIST,
//     then return { id } of the newly persisted audit.
//     Contract: POST { url } -> 200 { id }.
// ===========================================================================

export async function POST(req: Request) {
  let url = "";
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Placeholder: no real audit yet. Return the demo id; getAudit() serves the
  // fixture when Supabase isn't configured, so /report/demo renders in full.
  return NextResponse.json({ id: "demo" });
}
