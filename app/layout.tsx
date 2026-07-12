import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchScore",
  description:
    "RAG-grounded launch auditor for Daybot stores — evidence-backed findings and cross-store patterns.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#0ea5e9)" }}
              >
                L
              </span>
              <span className="text-lg">LaunchScore</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm" style={{ color: "var(--muted)" }}>
              <Link href="/" className="hover:text-white">
                Audit
              </Link>
              <Link href="/patterns" className="hover:text-white">
                Patterns
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
        <footer
          className="mx-auto max-w-5xl px-5 py-10 text-xs"
          style={{ color: "var(--muted)" }}
        >
          LaunchScore — Daybot Commerce Hackathon. Findings are grounded in deterministic rule
          checks and comparables retrieved from real successful listings.
        </footer>
      </body>
    </html>
  );
}
