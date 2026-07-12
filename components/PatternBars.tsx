import type { PatternRow } from "@/lib/data";
import { CATEGORY_COLOR, CATEGORY_LABEL, SEVERITY_COLOR } from "@/lib/ui";

// A ranked horizontal-bar list of coded findings. Bar length = share of audited
// stores affected. Used for both the problems panel and the strengths panel.
export default function PatternBars({
  rows,
  auditCount,
  tone,
}: {
  rows: PatternRow[];
  auditCount: number;
  tone: "problem" | "strength";
}) {
  if (!rows.length) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        No {tone === "problem" ? "problems" : "strengths"} recorded yet.
      </p>
    );
  }
  const denom = Math.max(1, auditCount);
  const barColor = (row: PatternRow) =>
    tone === "strength"
      ? "#22c55e"
      : row.top_severity
        ? SEVERITY_COLOR[row.top_severity]
        : CATEGORY_COLOR[row.category];

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const share = Math.round((row.stores_affected / denom) * 100);
        return (
          <div key={`${row.code}-${tone}`}>
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="font-medium">{row.label}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: "var(--panel-2)", color: CATEGORY_COLOR[row.category] }}
              >
                {CATEGORY_LABEL[row.category]}
              </span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                {row.stores_affected}/{auditCount} stores · {share}%
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--panel-2)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${share}%`, background: barColor(row) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
