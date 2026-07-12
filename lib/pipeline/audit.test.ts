import { describe, expect, it } from "vitest";

import { runAudit } from "./audit";
import type { FetchImplementation } from "./crawler";

function page(html: string): Response {
  return new Response(html, { headers: { "content-type": "text/html" } });
}

const home = "https://shop.example/";
const product = "https://shop.example/products/bottle";

const fixtureFetch: FetchImplementation = async (input) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url === home) {
    return page(`
      <title>Example Shop</title>
      <meta name="description" content="${"A useful store description. ".repeat(7)}" />
      <a href="/products/bottle">Bottle</a>
      <a href="/policies/returns">Returns</a>
      <a href="/policies/shipping">Shipping</a>
      <a href="mailto:hello@shop.example">Contact</a>
    `);
  }
  if (url === product) {
    return page(`
      <script type="application/ld+json">{"@type":"Product","name":"Insulated Travel Bottle","description":"A durable insulated bottle designed to keep drinks cold through a full day of travel, work, and outdoor use while remaining easy to carry and clean.","image":["https://cdn.example/bottle-1.jpg","https://cdn.example/bottle-2.jpg","https://cdn.example/bottle-3.jpg"],"offers":{"price":"29.99"}}</script>
      <img src="https://cdn.example/bottle-1.jpg" alt="Bottle on a table" />
      <img src="https://cdn.example/bottle-2.jpg" alt="Bottle lid detail" />
      <img src="https://cdn.example/bottle-3.jpg" alt="Bottle in a bag" />
    `);
  }
  if (url === "https://shop.example/policies/returns") return page("<title>Returns</title><p>30-day returns.</p>");
  if (url === "https://shop.example/policies/shipping") return page("<title>Shipping</title><p>Orders ship in 2–4 business days.</p>");
  return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
};

describe("runAudit", () => {
  it("produces a real contract-valid report without Supabase or Gemini configured", async () => {
    const result = await runAudit(home, {
      fetchImpl: fixtureFetch,
      validateTarget: async () => undefined,
      persist: async () => null,
      synthesize: async (report) => report,
    });

    expect(result).toMatchObject({ id: "demo", persisted: false });
    expect(result.report.store_url).toBe(home);
    expect(result.report.products).toHaveLength(1);
    expect(result.report.products[0].comparables).toHaveLength(4);
    expect(Object.keys(result.report.evidence)).toEqual(
      expect.arrayContaining(["RULE-DESCRIPTION-1", result.report.products[0].comparables[0].id]),
    );
  });
});
