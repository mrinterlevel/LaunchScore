import { ISSUES, type IssueCode } from "@/lib/taxonomy";

import type { RuleResult, SnapshotProduct, StoreSnapshot } from "./types";

const PLACEHOLDER_PATTERN = /lorem ipsum|your product here|insert (?:text|copy)|\bTODO\b/i;
const SHIPPING_WINDOW_PATTERN =
  /(?:ships?|dispatch(?:es)?|deliver(?:y|ies)|arrives?)\s*(?:within|in)?\s*\d+\s*(?:[-–]\s*\d+\s*)?(?:business\s*)?(?:day|week)s?/i;
const BENEFIT_PATTERN = /helps?|keeps?|makes?|designed|perfect|enjoy|comfort|easy|ideal|so you/i;
const SPEC_PATTERN = /material|dimension|weight|size|capacity|voltage|watt|inch|cm|oz|ml/i;

function result(
  id: string,
  code: IssueCode,
  passed: boolean,
  detail: string,
  productTitle: string | null = null,
): RuleResult {
  const issue = ISSUES[code];
  const severity =
    code === "NO_RETURN_POLICY" || code === "NO_SHIPPING_INFO" || code === "NO_SCHEMA"
      ? "high"
      : code === "NO_CHARM_PRICING" || code === "NO_ALT_TEXT"
        ? "low"
        : "med";
  return {
    id,
    code,
    type: issue.kind,
    category: issue.cat,
    severity: issue.kind === "weakness" ? severity : null,
    passed,
    label: issue.label,
    detail,
    productTitle,
  };
}

function hasCharmPrice(price: number): boolean {
  const cents = Math.abs(Math.round(price * 100)) % 100;
  return cents === 95 || cents === 99;
}

function hasAltText(product: SnapshotProduct): boolean {
  return product.images.length > 0 && product.images.every((image) => image.alt.length > 0);
}

function productRules(product: SnapshotProduct, index: number): RuleResult[] {
  const suffix = `${index + 1}`;
  const findings: RuleResult[] = [];
  const productTitle = product.title || `Product ${suffix}`;
  const descriptionIsRich = product.descriptionWords >= 80;

  findings.push(
    result(
      `RULE-DESCRIPTION-${suffix}`,
      descriptionIsRich ? "RICH_DESCRIPTION" : "THIN_DESCRIPTION",
      descriptionIsRich,
      descriptionIsRich
        ? `Description contains ${product.descriptionWords} words.`
        : `Description contains ${product.descriptionWords} words; the launch threshold is 80.`,
      productTitle,
    ),
  );

  const specsWithoutBenefits =
    product.descriptionWords > 0 && SPEC_PATTERN.test(product.description) && !BENEFIT_PATTERN.test(product.description);
  if (specsWithoutBenefits) {
    findings.push(
      result(
        `RULE-BENEFITS-${suffix}`,
        "SPECS_NOT_BENEFITS",
        false,
        "Description lists specifications without explaining a shopper benefit.",
        productTitle,
      ),
    );
  }

  const enoughImages = product.images.length >= 3;
  findings.push(
    result(
      `RULE-IMAGES-${suffix}`,
      enoughImages ? "GOOD_IMAGERY" : "FEW_IMAGES",
      enoughImages,
      enoughImages
        ? `${product.images.length} product images were found.`
        : `Only ${product.images.length} product images were found; the launch threshold is 3.`,
      productTitle,
    ),
  );

  if (product.images.length > 0) {
    const imagesHaveAlt = hasAltText(product);
    findings.push(
      result(
        `RULE-ALT-TEXT-${suffix}`,
        imagesHaveAlt ? "GOOD_IMAGERY" : "NO_ALT_TEXT",
        imagesHaveAlt,
        imagesHaveAlt
          ? "All detected product images have alt text."
          : "One or more detected product images have no alt text.",
        productTitle,
      ),
    );
  }

  findings.push(
    result(
      `RULE-SCHEMA-${suffix}`,
      product.hasProductSchema ? "CLEAN_SEO" : "NO_SCHEMA",
      product.hasProductSchema,
      product.hasProductSchema
        ? "Product JSON-LD was found on the page."
        : "No Product JSON-LD was found on the page.",
      productTitle,
    ),
  );

  if (product.price != null) {
    const charm = hasCharmPrice(product.price);
    findings.push(
      result(
        `RULE-CHARM-PRICE-${suffix}`,
        charm ? "PRICED_WITH_MARKET" : "NO_CHARM_PRICING",
        charm,
        charm
          ? `Price ${product.price.toFixed(2)} uses .95 or .99 charm pricing.`
          : `Price ${product.price.toFixed(2)} does not use .95 or .99 charm pricing.`,
        productTitle,
      ),
    );
  }

  if (product.price != null && product.compareAtPrice != null && product.compareAtPrice > product.price) {
    const discount = 1 - product.price / product.compareAtPrice;
    if (discount > 0.7) {
      findings.push(
        result(
          `RULE-DISCOUNT-${suffix}`,
          "FAKE_DISCOUNT",
          false,
          `Compare-at price implies a ${(discount * 100).toFixed(0)}% discount, above the 70% plausibility threshold.`,
          productTitle,
        ),
      );
    }
  }

  return findings;
}

export function runRules(snapshot: StoreSnapshot): RuleResult[] {
  const results: RuleResult[] = [];
  const allStoreText = [snapshot.homepage.bodyText, ...snapshot.policies.map((policy) => policy.bodyText)].join(" ");
  const hasReturnPolicy = snapshot.policies.some((policy) => policy.kind === "returns");
  const hasShippingPolicy = snapshot.policies.some((policy) => policy.kind === "shipping");
  const hasShippingWindow = SHIPPING_WINDOW_PATTERN.test(allStoreText);
  const hasContact = snapshot.contacts.length > 0 || snapshot.policies.some((policy) => policy.kind === "contact");
  const hasPlaceholder = PLACEHOLDER_PATTERN.test(
    [allStoreText, ...snapshot.products.map((product) => product.description)].join(" "),
  );

  results.push(
    result(
      "RULE-RETURN-POLICY",
      hasReturnPolicy ? "STRONG_TRUST" : "NO_RETURN_POLICY",
      hasReturnPolicy,
      hasReturnPolicy ? "A return/refund policy page was found." : "No return or refund policy page was found.",
    ),
    result(
      "RULE-SHIPPING-WINDOW",
      hasShippingPolicy && hasShippingWindow ? "STRONG_TRUST" : "NO_SHIPPING_INFO",
      hasShippingPolicy && hasShippingWindow,
      hasShippingPolicy && hasShippingWindow
        ? "A shipping policy with a concrete delivery window was found."
        : "No concrete shipping or delivery window was found.",
    ),
    result(
      "RULE-CONTACT",
      hasContact ? "STRONG_TRUST" : "NO_CONTACT",
      hasContact,
      hasContact ? "A contact method was found." : "No contact email, phone, or contact page was found.",
    ),
  );

  if (hasPlaceholder) {
    results.push(
      result(
        "RULE-PLACEHOLDER-TEXT",
        "PLACEHOLDER_TEXT",
        false,
        "Placeholder or unfinished copy was detected.",
      ),
    );
  }

  const metaLength = snapshot.homepage.metaDescription.length;
  const metaHealthy = metaLength >= 120 && metaLength <= 160;
  results.push(
    result(
      "RULE-META-DESCRIPTION",
      metaHealthy ? "CLEAN_SEO" : "META_MISSING",
      metaHealthy,
      metaHealthy
        ? `Homepage meta description is ${metaLength} characters long.`
        : `Homepage meta description is ${metaLength} characters; the recommended range is 120–160.`,
    ),
  );

  const normalizedTitles = snapshot.products.map((product) => product.title.toLowerCase().trim()).filter(Boolean);
  const duplicateTitles = new Set(normalizedTitles).size !== normalizedTitles.length;
  if (normalizedTitles.length > 1) {
    results.push(
      result(
        "RULE-DUPLICATE-TITLES",
        duplicateTitles ? "DUP_TITLES" : "CLEAN_SEO",
        !duplicateTitles,
        duplicateTitles ? "Two or more product pages share the same title." : "Product page titles are distinct.",
      ),
    );
  }

  const catalogInRange = snapshot.products.length > 0 && snapshot.products.length <= 50;
  results.push(
    result(
      "RULE-CATALOG-SIZE",
      catalogInRange ? "COHERENT_NICHE" : "CATALOG_SIZE",
      catalogInRange,
      catalogInRange
        ? `${snapshot.products.length} crawlable product pages were found.`
        : `${snapshot.products.length} crawlable product pages were found; expected 1–50.`,
    ),
  );

  const hasAnyReviews = snapshot.products.some((product) => product.hasReviews);
  if (snapshot.products.length > 0) {
    results.push(
      result(
        "RULE-REVIEWS",
        hasAnyReviews ? "STRONG_TRUST" : "NO_REVIEWS",
        hasAnyReviews,
        hasAnyReviews ? "Review or rating markup was detected." : "No review or rating markup was detected.",
      ),
    );
  }

  snapshot.products.forEach((product, index) => results.push(...productRules(product, index)));
  return results;
}
