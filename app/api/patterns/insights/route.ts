import { NextResponse } from "next/server";

import { getAggregateInsight } from "@/lib/pipeline/insights";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getAggregateInsight());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate Daybot insights.";
    return NextResponse.json({ error: { code: "INSIGHTS_FAILED", message } }, { status: 500 });
  }
}
