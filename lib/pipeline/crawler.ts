import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { load } from "cheerio";

import type {
  PolicyKind,
  SnapshotImage,
  SnapshotPage,
  SnapshotPolicy,
  SnapshotProduct,
  StoreSnapshot,
} from "./types";

// One audit then makes at most 8 embedding calls + 8 product summaries + one
// store summary, leaving room under Gemini's 20 requests/minute free tier.
const PRODUCT_LIMIT = 8;
const POLICY_LIMIT = 5;
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BODY_BYTES = 1_500_000;

type JsonRecord = Record<string, unknown>;

export type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type TargetValidator = (url: URL) => Promise<void>;

export interface CrawlOptions {
  fetchImpl?: FetchImplementation;
  validateTarget?: TargetValidator;
  maxProducts?: number;
  maxPolicyPages?: number;
  timeoutMs?: number;
  maxBodyBytes?: number;
}

export class CrawlError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "UNSAFE_TARGET"
      | "FETCH_FAILED"
      | "NON_HTML"
      | "BODY_TOO_LARGE",
  ) {
    super(message);
    this.name = "CrawlError";
  }
}

interface HtmlResponse {
  html: string;
  url: string;
}

interface PageParse {
  page: SnapshotPage;
  productNodes: JsonRecord[];
  productLinks: string[];
  policyLinks: Array<{ url: string; kind: PolicyKind }>;
  contacts: string[];
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function wordCount(value: string): number {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function normalizeUrl(value: string): URL {
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new CrawlError("Only HTTP(S) storefront URLs can be audited.", "INVALID_URL");
    }
    url.hash = "";
    url.search = "";
    return url;
  } catch (error) {
    if (error instanceof CrawlError) throw error;
    throw new CrawlError("Provide a valid storefront URL.", "INVALID_URL");
  }
}

function isPrivateIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true;
  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    a >= 224
  );
}

function isPrivateIp(value: string): boolean {
  const version = isIP(value);
  if (version === 4) return isPrivateIpv4(value);
  if (version !== 6) return true;

  const lower = value.toLowerCase();
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("::ffff:")
  );
}

export async function assertPublicTarget(url: URL): Promise<void> {
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new CrawlError("Only standard HTTP(S) storefront ports can be audited.", "UNSAFE_TARGET");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new CrawlError("Local network URLs cannot be audited.", "UNSAFE_TARGET");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new CrawlError("Private network URLs cannot be audited.", "UNSAFE_TARGET");
    }
    return;
  }

  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((address) => isPrivateIp(address.address))) {
      throw new CrawlError("The storefront host resolves to a private network.", "UNSAFE_TARGET");
    }
  } catch (error) {
    if (error instanceof CrawlError) throw error;
    throw new CrawlError("The storefront host could not be resolved.", "UNSAFE_TARGET");
  }
}

async function fetchHtml(
  initial: URL,
  {
    fetchImpl,
    validateTarget,
    timeoutMs,
    maxBodyBytes,
  }: Required<Pick<CrawlOptions, "fetchImpl" | "validateTarget" | "timeoutMs" | "maxBodyBytes">>,
): Promise<HtmlResponse> {
  let target = new URL(initial);

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await validateTarget(target);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(target, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "LaunchScoreBot/0.1 (+https://launchscore.local)",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown network error";
      throw new CrawlError(`Could not fetch ${target.hostname}: ${reason}`, "FETCH_FAILED");
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new CrawlError("Storefront redirect has no destination.", "FETCH_FAILED");
      target = new URL(location, target);
      continue;
    }

    if (!response.ok) {
      throw new CrawlError(`Storefront returned HTTP ${response.status}.`, "FETCH_FAILED");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xhtml/i.test(contentType)) {
      throw new CrawlError("Storefront page is not HTML.", "NON_HTML");
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBodyBytes) {
      throw new CrawlError("Storefront page is too large to audit.", "BODY_TOO_LARGE");
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > maxBodyBytes) {
      throw new CrawlError("Storefront page is too large to audit.", "BODY_TOO_LARGE");
    }
    return { html, url: target.toString() };
  }

  throw new CrawlError("Storefront exceeded the redirect limit.", "FETCH_FAILED");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? cleanText(value) : "";
}

function numberValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numericText = typeof value === "number" ? String(value) : String(value).replace(/[^0-9.\-]/g, "");
  if (!numericText) return null;
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function flattenJsonLd(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  const record = recordValue(value);
  if (!record) return [];
  return [record, ...flattenJsonLd(record["@graph"])];
}

function hasType(record: JsonRecord, type: string): boolean {
  return arrayValue(record["@type"]).some((entry) => stringValue(entry).toLowerCase() === type.toLowerCase());
}

function jsonLdProducts($: ReturnType<typeof load>): JsonRecord[] {
  const nodes: JsonRecord[] = [];
  $("script[type*='ld+json']").each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) return;
    try {
      nodes.push(...flattenJsonLd(JSON.parse(raw)).filter((node) => hasType(node, "Product")));
    } catch {
      // Invalid JSON-LD is common in storefront themes; the OG fallback remains available.
    }
  });
  return nodes;
}

function sameOriginUrl(value: string, base: string, origin: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.origin !== origin || url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

function policyKind(label: string, url: string): PolicyKind | null {
  const value = `${label} ${url}`.toLowerCase();
  if (/return|refund|exchange/.test(value)) return "returns";
  if (/shipping|delivery|fulfil|fulfill/.test(value)) return "shipping";
  if (/contact|support|help/.test(value)) return "contact";
  if (/privacy|terms|legal/.test(value)) return "privacy";
  return null;
}

function collectContacts(text: string, hrefs: string[] = []): string[] {
  const contacts = new Set<string>();
  for (const email of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
    contacts.add(email.toLowerCase());
  }
  for (const href of hrefs) {
    if (/^(mailto:|tel:)/i.test(href)) contacts.add(href);
  }
  return [...contacts];
}

function parsePage(html: string, url: string, origin: string): PageParse {
  const $ = load(html);
  const title = cleanText($("title").first().text());
  const metaDescription = cleanText(
    $("meta[name='description']").attr("content") ?? $("meta[property='og:description']").attr("content"),
  );
  const bodyText = cleanText($("body").text());
  const productLinks = new Set<string>();
  const policyLinks = new Map<string, PolicyKind>();
  const hrefs: string[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    hrefs.push(href);
    const absolute = sameOriginUrl(href, url, origin);
    if (!absolute) return;
    if (new URL(absolute).pathname.includes("/products/")) productLinks.add(absolute);

    const kind = policyKind(cleanText($(element).text()), absolute);
    if (kind) policyLinks.set(absolute, kind);
  });

  const productNodes = jsonLdProducts($);
  for (const product of productNodes) {
    const productUrl = stringValue(product.url);
    const absolute = productUrl ? sameOriginUrl(productUrl, url, origin) : null;
    if (absolute && new URL(absolute).pathname.includes("/products/")) productLinks.add(absolute);
  }

  return {
    page: { url, title, metaDescription, bodyText },
    productNodes,
    productLinks: [...productLinks],
    policyLinks: [...policyLinks].map(([policyUrl, kind]) => ({ url: policyUrl, kind })),
    contacts: collectContacts(bodyText, hrefs),
  };
}

function imageUrls(value: unknown, base: string): string[] {
  const output: string[] = [];
  for (const entry of arrayValue(value)) {
    const record = recordValue(entry);
    const raw = typeof entry === "string" ? entry : stringValue(record?.url ?? record?.contentUrl);
    if (!raw) continue;
    try {
      output.push(new URL(raw, base).toString());
    } catch {
      // Ignore malformed theme image URLs.
    }
  }
  return output;
}

function parseProduct(html: string, url: string, origin: string): SnapshotProduct {
  const $ = load(html);
  const parsed = parsePage(html, url, origin);
  const product = parsed.productNodes[0] ?? null;
  const offers = arrayValue(product?.offers).map(recordValue).find(Boolean) ?? null;
  const ogTitle = cleanText($("meta[property='og:title']").attr("content"));
  const ogDescription = cleanText($("meta[property='og:description']").attr("content"));
  const description = cleanText(
    stringValue(product?.description) ||
      $("[itemprop='description'], .product__description, .product-description, #ProductDescription")
        .first()
        .text() ||
      ogDescription,
  );
  const rawImages: SnapshotImage[] = [];
  const seenImages = new Set<string>();
  const addImage = (src: string, alt = "") => {
    if (!src || seenImages.has(src)) return;
    seenImages.add(src);
    rawImages.push({ src, alt: cleanText(alt) });
  };

  for (const src of imageUrls(product?.image, url)) addImage(src);
  $("meta[property='og:image']").each((_, element) => {
    const src = $(element).attr("content") ?? "";
    if (src) addImage(new URL(src, url).toString());
  });
  $("img").each((_, element) => {
    const src = $(element).attr("src") ?? $(element).attr("data-src") ?? "";
    if (!src) return;
    try {
      addImage(new URL(src, url).toString(), $(element).attr("alt") ?? "");
    } catch {
      // Ignore malformed asset URLs.
    }
  });

  const schemaPrice = numberValue(offers?.price ?? offers?.lowPrice);
  const ogPrice = numberValue($("meta[property='product:price:amount']").attr("content"));
  const compareAtPrice = numberValue(
    $("[data-compare-at-price], [data-compare-price]").first().attr("data-compare-at-price") ??
      $("[data-compare-price]").first().attr("data-compare-price"),
  );
  const title = stringValue(product?.name) || ogTitle || cleanText($("h1").first().text()) || parsed.page.title;
  const hasReviews =
    Boolean(product?.aggregateRating || product?.review) || /review|rating|star-rating/i.test(parsed.page.bodyText);

  return {
    ...parsed.page,
    title,
    description,
    descriptionWords: wordCount(description),
    price: schemaPrice ?? ogPrice,
    compareAtPrice,
    images: rawImages,
    hasProductSchema: Boolean(product),
    hasReviews,
  };
}

function policyFromPage(kind: PolicyKind, html: string, url: string, origin: string): SnapshotPolicy {
  const { page } = parsePage(html, url, origin);
  return { ...page, kind };
}

function warningFor(url: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : "unknown error";
  return `Skipped ${new URL(url).pathname || url}: ${detail}`;
}

export async function crawlStore(storeUrl: string, options: CrawlOptions = {}): Promise<StoreSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const validateTarget = options.validateTarget ?? assertPublicTarget;
  const maxProducts = options.maxProducts ?? PRODUCT_LIMIT;
  const maxPolicyPages = options.maxPolicyPages ?? POLICY_LIMIT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const requestOptions = { fetchImpl, validateTarget, timeoutMs, maxBodyBytes };
  const homepageResponse = await fetchHtml(normalizeUrl(storeUrl), requestOptions);
  const origin = new URL(homepageResponse.url).origin;
  const homepage = parsePage(homepageResponse.html, homepageResponse.url, origin);
  const warnings: string[] = [];
  const productUrls = homepage.productLinks.slice(0, maxProducts);
  const policyTargets = homepage.policyLinks.slice(0, maxPolicyPages);

  const productResults = await Promise.all(
    productUrls.map(async (productUrl) => {
      try {
        const response = await fetchHtml(new URL(productUrl), requestOptions);
        if (new URL(response.url).origin !== origin) {
          throw new CrawlError("Product redirect left the storefront origin.", "UNSAFE_TARGET");
        }
        return parseProduct(response.html, response.url, origin);
      } catch (error) {
        warnings.push(warningFor(productUrl, error));
        return null;
      }
    }),
  );

  const policyResults = await Promise.all(
    policyTargets.map(async ({ url, kind }) => {
      try {
        const response = await fetchHtml(new URL(url), requestOptions);
        if (new URL(response.url).origin !== origin) {
          throw new CrawlError("Policy redirect left the storefront origin.", "UNSAFE_TARGET");
        }
        return policyFromPage(kind, response.html, response.url, origin);
      } catch (error) {
        warnings.push(warningFor(url, error));
        return null;
      }
    }),
  );

  const policies = policyResults.filter((policy): policy is SnapshotPolicy => policy !== null);
  const contacts = new Set(homepage.contacts);
  for (const policy of policies) {
    for (const contact of collectContacts(policy.bodyText)) contacts.add(contact);
  }

  return {
    storeUrl: homepageResponse.url,
    siteName:
      cleanText(load(homepageResponse.html)("meta[property='og:site_name']").attr("content")) ||
      new URL(homepageResponse.url).hostname.replace(/^www\./, ""),
    homepage: homepage.page,
    products: productResults.filter((product): product is SnapshotProduct => product !== null),
    policies,
    contacts: [...contacts],
    warnings,
    crawledAt: new Date().toISOString(),
  };
}
