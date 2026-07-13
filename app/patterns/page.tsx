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

  if (p.audit_count === 0) {
    return (
      <div className="mx-auto mt-10 max-w-lg text-center">
        <div className="text-4xl">📊</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">No audits yet</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {live
            ? "Run your first audit and recurring problems, strengths, and average scores will appear here automatically."
            : "Connect Supabase to retain audits and build cross-store patterns."}
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

  let insights = p.insights;
  try {
    const generatedInsight = await getAggregateInsight();
    insights = generatedInsight.insights ?? insights;
  } catch {
    // The deterministic aggregate summary remains visible if optional insight
    // generation is unavailable for any unexpected reason.
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          Cross-store patterns
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          What we learned across {p.audit_count} audited stores
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Every finding carries a canonical code, so recurring gaps and strengths can be compared
          across audited stores.
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
          <h2 className="mb-1 text-sm font-semibold">Recurring strengths</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            Strengths that recur across audited stores.
          </p>
          <PatternBars rows={p.strengths} auditCount={p.audit_count} tone="strength" />
        </section>
      </div>

      {/* cross-store insights */}
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
            <h2 className="text-sm font-semibold uppercase tracking-wide">Cross-store insights</h2>
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
