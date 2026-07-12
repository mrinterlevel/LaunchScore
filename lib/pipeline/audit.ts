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

export interface AuditRunOptions extends CrawlOptions {
  persist?: typeof persistAudit;
  synthesize?: typeof synthesizeReport;
  retrieve?: typeof retrieveProductEvidence;
}

export async function runAudit(storeUrl: string, options: AuditRunOptions = {}): Promise<AuditRunResult> {
  const {
    persist = persistAudit,
    synthesize = synthesizeReport,
    retrieve = retrieveProductEvidence,
    ...crawlOptions
  } = options;
  const snapshot = await crawlStore(storeUrl, crawlOptions);
  const deterministicRules = runRules(snapshot);
  const retrievals = await retrieve(snapshot);
  const allRules = [...deterministicRules, ...deriveRetrievalRules(snapshot, retrievals)];
  const deterministicReport = buildDeterministicReport(snapshot, allRules, retrievals);
  const report = await synthesize(deterministicReport, retrievals);
  const persistedId = await persist(report);

  return {
    id: persistedId ?? "demo",
    report,
    persisted: persistedId !== null,
    warnings: snapshot.warnings,
  };
}
