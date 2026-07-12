import type { EvidenceMap, ProductReport } from "@/lib/types";
import { fmtPrice } from "@/lib/ui";
import FindingCard from "./FindingCard";

function MetricCompare({
  label,
  value,
  comp,
  worseWhenLower = true,
  suffix = "",
}: {
  label: string;
  value: number | null;
  comp: number | null;
  worseWhenLower?: boolean;
  suffix?: string;
}) {
  const bad =
    value != null &&
    comp != null &&
    (worseWhenLower ? value < comp * 0.8 : value > comp * 1.2);
  return (
    <div
      className="rounded-lg border p-2.5"
      style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
    >
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: bad ? "#ef4444" : "var(--text)" }}
        >
          {value ?? "—"}
          {suffix}
        </span>
        {comp != null && (
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            vs {comp}
            {suffix} comps
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProductAccordion({
  product,
  map,
  defaultOpen = false,
}: {
  product: ProductReport;
  map: EvidenceMap;
  defaultOpen?: boolean;
}) {
  const m = product.metrics;
  const nStrength = product.strengths.length;
  const nWeakness = product.weaknesses.length;

  return (
    <details className="panel group overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-center gap-3 p-4">
        <span
          className="text-xs transition-transform group-open:rotate-90"
          style={{ color: "var(--muted)" }}
          aria-hidden
        >
          ▶
        </span>
        <span className="font-medium">{product.title}</span>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {nWeakness > 0 && (
            <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(239,68,68,.15)", color: "#ef4444" }}>
              {nWeakness} to fix
            </span>
          )}
          {nStrength > 0 && (
            <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(34,197,94,.15)", color: "#22c55e" }}>
              {nStrength} strong
            </span>
          )}
        </div>
      </summary>

      <div className="border-t px-4 pb-4 pt-4" style={{ borderColor: "var(--border)" }}>
        {/* metrics strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCompare label="Desc words" value={m.desc_words} comp={m.comp_desc_median} />
          <MetricCompare label="Images" value={m.images} comp={m.comp_image_median} />
          <div
            className="rounded-lg border p-2.5"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
          >
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Price
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums">{fmtPrice(m.price)}</span>
              {m.comp_price_median != null && (
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  vs {fmtPrice(m.comp_price_median)} med
                </span>
              )}
            </div>
          </div>
          <div
            className="rounded-lg border p-2.5"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
          >
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Price percentile
            </div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">
              {m.price_percentile != null ? `${m.price_percentile}th` : "—"}
            </div>
          </div>
        </div>

        {/* findings */}
        <div className="mt-4 flex flex-col gap-2">
          {product.weaknesses.map((w, i) => (
            <FindingCard key={`w${i}`} finding={w} map={map} />
          ))}
          {product.strengths.map((s, i) => (
            <FindingCard key={`s${i}`} finding={s} map={map} />
          ))}
        </div>
      </div>
    </details>
  );
}
