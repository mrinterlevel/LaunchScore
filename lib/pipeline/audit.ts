import type { Report } from "@/lib/types";

import { crawlStore, type CrawlOptions } from "./crawler";
import { persistAudit } from "./persist";
import { buildDeterministicReport } from "./report";
import { deriveRetrievalRules, retrieveProductEvidence } from "./retrieval";
import { runRules } from "./rules";
import { synthesizeReport } from "./synth";

export interface AuditRunResult {
  id: string;
  report: Report;
  persisted: boolean;
  warnings: string[];
}

export async function runAudit(storeUrl: string, crawlOptions?: CrawlOptions): Promise<AuditRunResult> {
  const snapshot = await crawlStore(storeUrl, crawlOptions);
  const deterministicRules = runRules(snapshot);
  const retrievals = await retrieveProductEvidence(snapshot);
  const allRules = [...deterministicRules, ...deriveRetrievalRules(snapshot, retrievals)];
  const deterministicReport = buildDeterministicReport(snapshot, allRules, retrievals);
  const report = await synthesizeReport(deterministicReport, retrievals);
  const persistedId = await persistAudit(report);

  return {
    id: persistedId ?? "demo",
    report,
    persisted: persistedId !== null,
    warnings: snapshot.warnings,
  };
}
