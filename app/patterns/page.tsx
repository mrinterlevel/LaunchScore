import Link from "next/link";
import { getPatterns } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase";
import PatternBars from "@/components/PatternBars";
import CategoryBars from "@/components/CategoryBars";
import { scoreGrade } from "@/lib/grading";
import { getAggregateInsight } from "@/lib/pipeline/insights";
import { scoreColor } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const p = await getPatterns();
  const live = supabaseConfigured();

  // Live DB connected but no audits run yet — invite the first audit rather than
  // rendering "across 0 audited stores" with empty bars.
  if (live && p.audit_count === 0) {
    return (
      <div className="mx-auto mt-10 max-w-lg text-center">
        <div className="text-4xl">📊</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">No audits yet</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          The Patterns dashboard aggregates every audit into cross-store insights for Daybot. Run
          your first audit and the recurring problems, strengths, and average scores will populate
          here automatically.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl px-5 py-3 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#0ea5e9)" }}
        >
          Audit a store →
        </Link>
      </div>
    );
  }

  const generatedInsight = await getAggregateInsight();
  const insights = generatedInsight.insights ?? p.insights;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Ecosystem patterns · the Daybot view
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          What we learned across {p.audit_count} audited Daybot stores
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Every finding across every audit carries a canonical code, so the recurring gaps — and the
          things Daybot already nails — are a single GROUP BY. This is product feedback for Daybot
          itself.
          {!live && (
            <span className="ml-1 italic">
              (Showing sample data — connect Supabase to populate from real audits.)
            </span>
          )}
        </p>
      </div>

      {/* summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Stores audited
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{p.audit_count}</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Average grade
          </div>
          <div className="mt-1 text-3xl font-bold" style={{ color: scoreColor(p.avg_score) }}>
            {scoreGrade(p.avg_score)}
          </div>
        </div>
        <div className="panel col-span-2 p-4 sm:col-span-1">
          <div className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
            Average category grades
          </div>
          <CategoryBars scores={p.avg_category_scores} />
        </div>
      </div>

      {/* problems + strengths */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-1 text-sm font-semibold">Top recurring problems</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            Ranked by share of audited stores affected.
          </p>
          <PatternBars rows={p.problems} auditCount={p.audit_count} tone="problem" />
        </section>

        <section className="panel p-5">
          <h2 className="mb-1 text-sm font-semibold">What Daybot already does well</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            Strengths that recur across generated stores.
          </p>
          <PatternBars rows={p.strengths} auditCount={p.audit_count} tone="strength" />
        </section>
      </div>

      {/* insights for Daybot */}
      {insights && (
        <section
          className="rounded-2xl border p-6"
          style={{
            borderColor: "var(--border)",
            background: "linear-gradient(135deg, rgba(99,102,241,.12), rgba(14,165,233,.08))",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Insights for Daybot</h2>
          </div>
          <p className="text-sm leading-relaxed">{insights}</p>
        </section>
      )}

      <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm underline" style={{ color: "#0ea5e9" }}>
          ← Audit a store
        </Link>
      </div>
    </div>
  );
}
