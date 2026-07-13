"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  "Crawling store pages…",
  "Running rule checks…",
  "Retrieving comparable listings…",
  "Comparing against top listings…",
  "Synthesizing evidence-backed findings…",
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;
    setLoading(true);
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "object" &&
          payload.error !== null &&
          "message" in payload.error &&
          typeof payload.error.message === "string"
            ? payload.error.message
            : `Audit failed (${res.status})`;
        throw new Error(message);
      }
      const id =
        typeof payload === "object" && payload !== null && "id" in payload
          ? payload.id
          : null;
      if (!id) throw new Error("No audit id returned");
      router.push(`/report/${id}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    } finally {
      clearInterval(ticker);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Is your store actually ready to launch?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Paste a store URL. LaunchScore audits the store itself against real successful listings and
          returns an A–D store grade with evidence-backed fixes — not a grade for the platform or tool
          used to build it.
        </p>
      </div>

      {!loading ? (
        <form onSubmit={submit} className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-store.com"
              className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
              style={{
                background: "var(--panel)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              autoFocus
            />
            <button
              type="submit"
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1,#0ea5e9)" }}
            >
              Audit store
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}
          <p className="mt-3 text-center text-xs" style={{ color: "var(--muted)" }}>
            Takes ~20–30 seconds. No auto-fixing — you apply the changes.
          </p>
        </form>
      ) : (
        <div className="panel mt-8 flex flex-col items-center gap-4 p-8">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#0ea5e9", borderTopColor: "transparent" }}
          />
          <div className="text-sm font-medium">{STEPS[step]}</div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-6 rounded-full transition-colors"
                style={{ background: i <= step ? "#0ea5e9" : "var(--border)" }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Auditing {url}
          </p>
        </div>
      )}

      {/* what it checks */}
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Trust", "Returns, shipping, reviews, contact"],
          ["Content", "Description depth, images, benefits"],
          ["Pricing", "Market fit, charm pricing, discounts"],
          ["SEO", "Meta, titles, Product JSON-LD"],
          ["Catalog", "Niche coherence, catalog size"],
          ["Evidence", "Every finding cites a rule or comp"],
        ].map(([t, d]) => (
          <div key={t} className="panel p-3">
            <div className="text-sm font-semibold">{t}</div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              {d}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
