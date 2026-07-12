import type { Evidence, EvidenceMap } from "@/lib/types";
import { fmtPrice } from "@/lib/ui";

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: "var(--panel-2)",
        color: color ?? "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: highlight ? "#22c55e" : "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

function EvidenceItem({ ev }: { ev: Evidence }) {
  if (ev.kind === "rule") {
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Chip color={ev.passed ? "#22c55e" : "#ef4444"}>
            {ev.passed ? "✓ RULE" : "✗ RULE"}
          </Chip>
          <span className="text-sm font-medium">{ev.label}</span>
          <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            {ev.id}
          </span>
        </div>
        <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
          {ev.detail}
        </p>
      </div>
    );
  }

  if (ev.kind === "comp") {
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Chip color="#0ea5e9">COMPARABLE</Chip>
          <span className="text-sm font-medium">{ev.title}</span>
          <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            {ev.id}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Niche" value={ev.niche} />
          <Stat label="Price" value={fmtPrice(ev.price)} />
          <Stat label="Images" value={String(ev.images)} highlight />
          <Stat label="Desc words" value={String(ev.desc_words)} highlight />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            similarity {Math.round(ev.sim * 100)}%
          </span>
          {ev.source_url && (
            <a
              href={ev.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] underline"
              style={{ color: "#0ea5e9" }}
            >
              view listing ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  // guide
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Chip color="#f59e0b">GUIDELINE</Chip>
        <span className="text-sm font-medium capitalize">{ev.topic}</span>
        <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--muted)" }}>
          {ev.id}
        </span>
      </div>
      <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
        {ev.text}
      </p>
    </div>
  );
}

// Given evidence ids and the report's evidence map, render the expandable
// evidence panel. Ids not present in the map are silently dropped (the pipeline
// validator should have removed them, but the UI stays defensive).
export default function Evidence({ ids, map }: { ids: string[]; map: EvidenceMap }) {
  const items = ids.map((id) => map[id]).filter(Boolean) as Evidence[];
  if (!items.length) return null;
  return (
    <details className="group mt-2">
      <summary
        className="cursor-pointer select-none text-xs font-medium"
        style={{ color: "#0ea5e9" }}
      >
        <span className="group-open:hidden">▸ Show evidence ({items.length})</span>
        <span className="hidden group-open:inline">▾ Hide evidence</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((ev) => (
          <EvidenceItem key={ev.id} ev={ev} />
        ))}
      </div>
    </details>
  );
}
