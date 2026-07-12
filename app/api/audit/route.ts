import { NextResponse } from "next/server";

import type { ApiError, AuditRequest, AuditResponse } from "@/lib/types";
import { runAudit } from "@/lib/pipeline/audit";
import { CrawlError } from "@/lib/pipeline/crawler";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status });
}

function normalizeStoreUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  const input = value.trim();
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<AuditResponse | ApiError>> {
  let body: Partial<AuditRequest>;

  try {
    const parsedBody: unknown = await request.json();
    body =
      typeof parsedBody === "object" && parsedBody !== null
        ? (parsedBody as Partial<AuditRequest>)
        : {};
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const storeUrl = normalizeStoreUrl(body.url);
  if (!storeUrl) {
    return errorResponse(
      "INVALID_STORE_URL",
      "Provide a valid store URL in the `url` field.",
      400,
    );
  }

  try {
    const result = await runAudit(storeUrl);
    return NextResponse.json<AuditResponse>({ id: result.id, report: result.report });
  } catch (error) {
    if (error instanceof CrawlError) {
      const status = error.code === "INVALID_URL" || error.code === "UNSAFE_TARGET" ? 400 : 502;
      return errorResponse(error.code, error.message, status);
    }
    const message = error instanceof Error ? error.message : "The audit pipeline failed.";
    return errorResponse("AUDIT_FAILED", message, 500);
  }
}
