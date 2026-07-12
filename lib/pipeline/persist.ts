import { getSupabase } from "@/lib/supabase";
import { putMemAudit } from "@/lib/auditStore";
import type { FindingRow, Report } from "@/lib/types";

function persistenceMessage(action: string, message: string | undefined): string {
  if (message && /invalid api key/i.test(message)) {
    return (
      `Supabase rejected its server API key while ${action}. ` +
      "Set SUPABASE_SECRET_KEY to the project's sb_secret_ key (preferred), or use its legacy service_role key."
    );
  }
  return `Could not ${action}: ${message ?? "unknown database error"}`;
}

function findingRows(report: Report, auditId: string): FindingRow[] {
  const rows: FindingRow[] = [];
  const add = (
    findings: Array<{ code: string; severity?: "high" | "med" | "low" }>,
    type: "strength" | "weakness",
    productTitle: string | null,
  ) => {
    for (const finding of findings) {
      rows.push({
        audit_id: auditId,
        code: finding.code,
        type,
        severity: type === "weakness" ? finding.severity ?? "med" : null,
        product_title: productTitle,
      });
    }
  };

  add(report.store_strengths, "strength", null);
  add(report.store_weaknesses, "weakness", null);
  for (const product of report.products) {
    add(product.strengths, "strength", product.title);
    add(product.weaknesses, "weakness", product.title);
  }
  return rows;
}

export async function persistAudit(report: Report): Promise<string | null> {
  const supabase = getSupabase();
  // No DB configured: keep the report viewable via the in-memory fallback store
  // (dev/demo). Returns a real id so /report/[id] shows THIS audit, not the fixture.
  if (!supabase) return putMemAudit(report);

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      store_url: report.store_url,
      score: report.score,
      category_scores: report.category_scores,
      report,
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    throw new Error(persistenceMessage("persist the audit", auditError?.message ?? "no audit id returned"));
  }

  const rows = findingRows(report, audit.id);
  if (!rows.length) return audit.id;

  const { error: findingsError } = await supabase.from("findings").insert(rows);
  if (findingsError) {
    await supabase.from("audits").delete().eq("id", audit.id);
    throw new Error(persistenceMessage("persist the findings", findingsError.message));
  }

  return audit.id;
}
