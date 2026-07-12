import { describe, expect, it } from "vitest";

import { crawlStore, type FetchImplementation } from "./crawler";

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function fetchFrom(pages: Record<string, Response>): FetchImplementation {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return pages[url] ?? htmlResponse("missing", 404);
  };
}

const bypassTargetValidation = async () => undefined;

describe("crawlStore", () => {
  it("prefers Product JSON-LD and discovers policies and contacts", async () => {
    const home = "https://shop.example/";
    const product = "https://shop.example/products/bottle";
    const shipping = "https://shop.example/policies/shipping-policy";
    const pages = {
      [home]: htmlResponse(`
        <html><head><title>Example Shop</title><meta name="description" content="${"x".repeat(130)}" /></head>
        <body><a href="/products/bottle">Bottle</a><a href="/policies/shipping-policy">Shipping</a><a href="mailto:hello@shop.example">Email</a></body></html>
      `),
      [product]: htmlResponse(`
        <html><head><title>Fallback title</title><meta property="og:title" content="OG Bottle" /></head><body>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"JSON-LD Bottle","description":"An insulated bottle that keeps drinks cold all day.","image":["https://cdn.example/bottle.jpg"],"offers":{"price":"29.99"},"aggregateRating":{"ratingValue":"4.9"}}</script>
        <img src="https://cdn.example/bottle.jpg" alt="Blue bottle" />
        </body></html>
      `),
      [shipping]: htmlResponse("<html><title>Shipping</title><body>Orders ship in 2–4 business days.</body></html>"),
    };

    const snapshot = await crawlStore(home, {
      fetchImpl: fetchFrom(pages),
      validateTarget: bypassTargetValidation,
    });

    expect(snapshot.products).toHaveLength(1);
    expect(snapshot.products[0]).toMatchObject({
      title: "JSON-LD Bottle",
      price: 29.99,
      hasProductSchema: true,
      hasReviews: true,
      descriptionWords: 9,
    });
    expect(snapshot.policies).toHaveLength(1);
    expect(snapshot.policies[0].kind).toBe("shipping");
    expect(snapshot.contacts).toContain("mailto:hello@shop.example");
  });

  it("uses Open Graph product metadata when Product JSON-LD is absent", async () => {
    const home = "https://shop.example/";
    const product = "https://shop.example/products/mug";
    const snapshot = await crawlStore(home, {
      fetchImpl: fetchFrom({
        [home]: htmlResponse("<a href='/products/mug'>Mug</a>"),
        [product]: htmlResponse(`
          <meta property="og:title" content="Travel Mug" />
          <meta property="og:description" content="A ceramic travel mug for slow mornings." />
          <meta property="og:image" content="https://cdn.example/mug.jpg" />
          <meta property="product:price:amount" content="24.95" />
          <img src="https://cdn.example/mug.jpg" alt="Ceramic travel mug" />
        `),
      }),
      validateTarget: bypassTargetValidation,
    });

    expect(snapshot.products[0]).toMatchObject({
      title: "Travel Mug",
      description: "A ceramic travel mug for slow mornings.",
      price: 24.95,
      hasProductSchema: false,
    });
  });

  it("caps products and records partial product-page failures as warnings", async () => {
    const home = "https://shop.example/";
    const one = "https://shop.example/products/one";
    const two = "https://shop.example/products/two";
    const three = "https://shop.example/products/three";
    const snapshot = await crawlStore(home, {
      fetchImpl: fetchFrom({
        [home]: htmlResponse(`<a href="/products/one">One</a><a href="/products/two">Two</a><a href="/products/three">Three</a>`),
        [one]: htmlResponse("<title>One</title><h1>One</h1>"),
        [two]: htmlResponse("nope", 500),
        [three]: htmlResponse("<title>Three</title><h1>Three</h1>"),
      }),
      validateTarget: bypassTargetValidation,
      maxProducts: 2,
    });

    expect(snapshot.products.map((product) => product.title)).toEqual(["One"]);
    expect(snapshot.warnings).toHaveLength(1);
    expect(snapshot.warnings[0]).toContain("/products/two");
  });

  it("rejects private-network storefront targets before fetching", async () => {
    await expect(crawlStore("http://127.0.0.1")).rejects.toMatchObject({
      code: "UNSAFE_TARGET",
    });
  });
});
