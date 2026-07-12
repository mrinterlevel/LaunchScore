import type { EvidenceMap, Strength, Weakness } from "@/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/ui";
import Evidence from "./Evidence";

function isWeakness(f: Strength | Weakness): f is Weakness {
  return "severity" in f;
}

export default function FindingCard({
  finding,
  map,
}: {
  finding: Strength | Weakness;
  map: EvidenceMap;
}) {
  const weakness = isWeakness(finding);
  const accent = weakness ? "#ef4444" : "#22c55e";

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <span className="text-sm font-semibold">{finding.label}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: "var(--panel-2)", color: CATEGORY_COLOR[finding.category] }}
        >
          {CATEGORY_LABEL[finding.category]}
        </span>
        {weakness && (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{ background: "var(--panel-2)", color: SEVERITY_COLOR[finding.severity] }}
          >
            {SEVERITY_LABEL[finding.severity]}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--muted)" }}>
          {finding.code}
        </span>
      </div>

      <p className="mt-2 text-sm">{finding.finding}</p>

      {weakness && (
        <p
          className="mt-2 rounded-lg border-l-2 pl-3 text-sm"
          style={{ borderColor: "#0ea5e9", color: "var(--muted)" }}
        >
          <span className="font-medium" style={{ color: "var(--text)" }}>
            How top listings do it:{" "}
          </span>
          {finding.how_top_stores_do_it}
        </p>
      )}

      <Evidence ids={finding.evidence} map={map} />
    </div>
  );
}
