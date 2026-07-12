import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { ALLOWED_CODES, ISSUES } from "@/lib/taxonomy";
import type { Report, Strength, Weakness } from "@/lib/types";

import type { ProductRetrieval } from "./types";

const MAX_PRODUCTS_TO_SYNTHESIZE = 8;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

const strengthSchema = z.object({
  code: z.string(),
  finding: z.string().min(1).max(500),
  evidence: z.array(z.string()).min(1).max(6),
});

const weaknessSchema = strengthSchema.extend({
  severity: z.enum(["high", "med", "low"]),
  how_top_stores_do_it: z.string().min(1).max(600),
});

const productSynthesisSchema = z.object({
  strengths: z.array(strengthSchema).max(3),
  weaknesses: z.array(weaknessSchema).max(4),
});

const storeSynthesisSchema = z.object({
  executive_summary: z.string().min(1).max(1_200),
});

function parseJson(text: string): unknown {
  const unwrapped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unwrapped);
}

async function askGemini<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const client = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            "You are an evidence-grounded ecommerce launch auditor. Use only the evidence supplied. Return only valid JSON with no markdown.",
          responseMimeType: "application/json",
          maxOutputTokens: 1_200,
        },
      });
      if (!response.text) throw new Error("Gemini returned no text content.");
      return schema.parse(parseJson(response.text));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Claude synthesis failed.");
}

function validStrength(finding: z.infer<typeof strengthSchema>, allowedEvidence: Set<string>): Strength | null {
  const issue = ISSUES[finding.code as keyof typeof ISSUES];
  if (!issue || issue.kind !== "strength" || !finding.evidence.every((id) => allowedEvidence.has(id))) return null;
  return {
    code: finding.code,
    label: issue.label,
    category: issue.cat,
    finding: finding.finding,
    evidence: [...new Set(finding.evidence)],
  };
}

function validWeakness(finding: z.infer<typeof weaknessSchema>, allowedEvidence: Set<string>): Weakness | null {
  const issue = ISSUES[finding.code as keyof typeof ISSUES];
  if (!issue || issue.kind !== "weakness" || !finding.evidence.every((id) => allowedEvidence.has(id))) return null;
  return {
    code: finding.code,
    label: issue.label,
    category: issue.cat,
    severity: finding.severity,
    finding: finding.finding,
    how_top_stores_do_it: finding.how_top_stores_do_it,
    evidence: [...new Set(finding.evidence)],
  };
}

function appendUnique<T extends Strength | Weakness>(current: T[], incoming: T[]): T[] {
  const byCode = new Map(current.map((finding) => [finding.code, finding]));
  for (const finding of incoming) {
    const existing = byCode.get(finding.code);
    if (!existing) {
      byCode.set(finding.code, finding);
      continue;
    }
    existing.evidence = [...new Set([...existing.evidence, ...finding.evidence])];
  }
  return [...byCode.values()];
}

function productPrompt(
  report: Report,
  productIndex: number,
  retrieval: ProductRetrieval | undefined,
): { prompt: string; evidence: Set<string> } {
  const product = report.products[productIndex];
  const ruleIds = [...product.strengths, ...product.weaknesses].flatMap((finding) => finding.evidence);
  const compIds = product.comparables.map((comp) => comp.id);
  const guideIds = retrieval?.guides.map((guide) => guide.id) ?? [];
  const evidenceIds = new Set([...ruleIds, ...compIds, ...guideIds]);
  const evidence = [...evidenceIds]
    .map((id) => report.evidence[id])
    .filter(Boolean);

  return {
    evidence: evidenceIds,
    prompt: JSON.stringify({
      allowed_codes: ALLOWED_CODES,
      product: {
        title: product.title,
        metrics: product.metrics,
      },
      evidence,
      instructions: {
        strengths: "Return up to 3 evidence-backed strengths.",
        weaknesses: "Return up to 4 evidence-backed weaknesses and explain how comparable listings do better.",
        output: {
          strengths: [{ code: "strength code", finding: "string", evidence: ["evidence id"] }],
          weaknesses: [
            {
              code: "weakness code",
              severity: "high|med|low",
              finding: "string",
              how_top_stores_do_it: "string",
              evidence: ["evidence id"],
            },
          ],
        },
      },
    }),
  };
}

export async function synthesizeReport(report: Report, retrievals: ProductRetrieval[]): Promise<Report> {
  if (!process.env.GEMINI_API_KEY) return report;

  const next: Report = structuredClone(report);
  const retrievalByIndex = new Map(retrievals.map((retrieval) => [retrieval.productIndex, retrieval]));
  const productResults = await Promise.all(
    next.products.slice(0, MAX_PRODUCTS_TO_SYNTHESIZE).map(async (product, index) => {
      const input = productPrompt(next, index, retrievalByIndex.get(index));
      try {
        const synthesized = await askGemini(input.prompt, productSynthesisSchema);
        return {
          index,
          strengths: synthesized.strengths
            .map((finding) => validStrength(finding, input.evidence))
            .filter((finding): finding is Strength => finding !== null),
          weaknesses: synthesized.weaknesses
            .map((finding) => validWeakness(finding, input.evidence))
            .filter((finding): finding is Weakness => finding !== null),
        };
      } catch {
        return { index, strengths: [], weaknesses: [] };
      }
    }),
  );

  for (const synthesized of productResults) {
    const product = next.products[synthesized.index];
    product.strengths = appendUnique(product.strengths, synthesized.strengths);
    product.weaknesses = appendUnique(product.weaknesses, synthesized.weaknesses);
  }

  try {
    const summary = await askGemini(
      JSON.stringify({
        store_url: next.store_url,
        score: next.score,
        category_scores: next.category_scores,
        store_strengths: next.store_strengths,
        store_weaknesses: next.store_weaknesses,
        products: next.products.map((product) => ({
          title: product.title,
          strengths: product.strengths,
          weaknesses: product.weaknesses,
        })),
        instruction:
          "Write a concise executive summary grounded only in these supplied findings. Do not introduce new claims or codes. Return { executive_summary: string }.",
      }),
      storeSynthesisSchema,
    );
    next.executive_summary = summary.executive_summary;
  } catch {
    // Deterministic summary remains available when the store-level call fails.
  }

  return next;
}
