import { notFound } from "next/navigation";
import Link from "next/link";
import { getAudit } from "@/lib/data";
import ScoreDial from "@/components/ScoreDial";
import CategoryBars from "@/components/CategoryBars";
import ProductAccordion from "@/components/ProductAccordion";
import FindingCard from "@/components/FindingCard";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) notFound();
  const r = audit.report;

  return (
    <div className="flex flex-col gap-8">
      {/* header */}
      <div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          LaunchScore report
        </div>
        <h1 className="mt-1 break-all text-xl font-semibold">{r.store_url}</h1>
        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Audited {new Date(r.generated_at).toLocaleString()} ·{" "}
          {r.products_audited} of {r.products_total} products scored
          {r.products_total > r.product_cap && ` (capped at ${r.product_cap})`}
        </div>
      </div>

      {/* score + categories */}
      <div className="panel flex flex-col items-center gap-8 p-6 md:flex-row md:items-center">
        <div className="shrink-0">
          <ScoreDial score={r.score} />
        </div>
        <div className="w-full flex-1">
          <div className="mb-3 text-sm font-medium">Category grades</div>
          <CategoryBars scores={r.category_scores} />
        </div>
      </div>

      {/* executive summary */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Executive summary
        </h2>
        <p className="panel p-4 text-sm leading-relaxed">{r.executive_summary}</p>
      </section>

      {/* store-level findings */}
      {(r.store_weaknesses.length > 0 || r.store_strengths.length > 0) && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Store-level findings
          </h2>
          <div className="flex flex-col gap-2">
            {r.store_weaknesses.map((w, i) => (
              <FindingCard key={`sw${i}`} finding={w} map={r.evidence} />
            ))}
            {r.store_strengths.map((s, i) => (
              <FindingCard key={`ss${i}`} finding={s} map={r.evidence} />
            ))}
          </div>
        </section>
      )}

      {/* per-product */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Products ({r.products.length})
        </h2>
        {r.products.length === 0 ? (
          <p className="panel p-4 text-sm" style={{ color: "var(--muted)" }}>
            The crawler didn&apos;t find any product pages to audit on this store. Store-level trust,
            SEO, and catalog checks above still apply.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {r.products.map((p, i) => (
              <ProductAccordion key={i} product={p} map={r.evidence} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm underline" style={{ color: "#0ea5e9" }}>
          ← Audit another store
        </Link>
        <Link href="/patterns" className="text-sm underline" style={{ color: "#0ea5e9" }}>
          See cross-store patterns →
        </Link>
      </div>
    </div>
  );
}
