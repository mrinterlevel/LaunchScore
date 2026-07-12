// data/guidelines.mjs
//
// Corpus B of the knowledge base: ~20 hand-written best-practice guideline
// cards. Paraphrased CRO fundamentals, ~60 words each, no scraped text (clean
// retrieval, no copyright). Each has a `topic` used for niche-agnostic retrieval:
//   trust | pricing | description | images | seo | catalog
//
// build_kb.mjs embeds `text` for each and tags corpus:"guides".

export const GUIDELINES = [
  {
    topic: "trust",
    text: "Product pages that state a concrete delivery window — 'ships in 2–4 business days' — reduce purchase anxiety far more than vague 'fast shipping' claims. Shoppers weigh certainty heavily at checkout. Put the specific timeframe near the buy button, not buried in a policy page, so it answers the question before it becomes a reason to abandon the cart.",
  },
  {
    topic: "trust",
    text: "A visible, plain-language return policy is one of the strongest trust signals a store can show. State the window, who pays return shipping, and how refunds are issued. Ambiguity reads as risk. Stores that surface a 30-day, no-questions return line on the product page consistently convert hesitant first-time buyers better than those that hide it in the footer.",
  },
  {
    topic: "trust",
    text: "Customer reviews are the single most persuasive element on a product page. Even a handful of honest, dated reviews with a star average outperform none, because social proof answers the unspoken 'will this actually work for me?'. New stores should seed reviews from early buyers immediately; a page with zero reviews signals an untested, possibly abandoned listing.",
  },
  {
    topic: "trust",
    text: "Shoppers look for a real way to reach a human before trusting a new store with payment. A visible contact method — email, chat, or phone — plus a physical or company address signals accountability. Stores that omit any contact path read as fly-by-night. Add a contact link in the header or footer and a support email on policy pages.",
  },
  {
    topic: "trust",
    text: "Placeholder and lorem-ipsum text, 'sample product' titles, or default theme copy left in production instantly destroys credibility. It tells the shopper the store was never finished and no one is minding it. Audit every page for template leftovers before launch; a single block of dummy text near a real product can sink the sale.",
  },
  {
    topic: "description",
    text: "Thin product descriptions under ~80 words leave buyers guessing and hurt search ranking. Strong listings run 150–300 words that cover what it is, who it is for, the materials or ingredients, dimensions or sizing, and how it fits into daily use. Depth signals a real, considered product; a one-line description signals a drop-shipped placeholder.",
  },
  {
    topic: "description",
    text: "The best descriptions translate specs into benefits. '2000mAh battery' becomes 'a full week of charge between top-ups.' Buyers care about the outcome, not the number. Lead each feature with the payoff, then back it with the spec. Listings that only list specifications leave the shopper to do the translation, and many will not bother.",
  },
  {
    topic: "description",
    text: "Duplicated or near-identical descriptions across a catalog are a red flag that copy was templated or auto-generated. Each product deserves language specific to its use, materials, and audience. Shoppers who click between two products and see the same paragraph lose trust in the whole store. Unique copy also prevents search engines from treating pages as duplicate content.",
  },
  {
    topic: "description",
    text: "Scannable structure beats a wall of text. Use a short opening hook, then bullet points for key features, sizing, and materials, and a closing line on the experience or guarantee. Most shoppers skim first and read second. A description broken into digestible chunks holds attention long enough to reach the add-to-cart decision.",
  },
  {
    topic: "images",
    text: "A single product image is rarely enough. High-converting listings show three or more: the product on white, in-context or lifestyle use, a scale reference, and a detail or texture close-up. Multiple angles reduce returns and answer questions text cannot. A lone thumbnail signals an unfinished listing and forces the buyer to imagine the rest.",
  },
  {
    topic: "images",
    text: "Lifestyle imagery — the product in a real setting or in use — outperforms studio-on-white shots for emotional connection and helps shoppers picture ownership. Pair at least one clean catalog shot for clarity with one in-context shot for desire. Stores relying solely on manufacturer stock photos look generic and interchangeable with every competitor using the same asset.",
  },
  {
    topic: "images",
    text: "Descriptive image alt text helps visually impaired shoppers, improves image search ranking, and provides a fallback when an image fails to load. Write what the image shows — 'stainless steel saucier on a stovetop' — not 'IMG_1234'. Missing or generic alt text is a common oversight in auto-built stores and a quick, high-value accessibility and SEO fix.",
  },
  {
    topic: "pricing",
    text: "Prices that sit far above or below comparable products in the same category invite doubt. Too high without a clear premium justification loses value shoppers; too low signals poor quality or a scam. Benchmark against real competitors in your niche and position deliberately, with copy that explains the price when it diverges from the market.",
  },
  {
    topic: "pricing",
    text: "Charm pricing — ending prices in .99 or .95 — reliably lifts conversion for mainstream consumer goods because the leftmost digit anchors perception. $19.99 reads meaningfully cheaper than $20. Reserve round numbers for premium or luxury positioning where they signal quality. Auto-generated stores often default to round prices, leaving an easy conversion gain on the table.",
  },
  {
    topic: "pricing",
    text: "Inflated compare-at prices — a '$200, now $49' that was never really $200 — erode trust once shoppers sense the discount is fabricated, and can breach advertising rules. Discounts over roughly 60–70% off a supposed original read as implausible. Show genuine reference prices, or lead with the real value of the product rather than a fake markdown.",
  },
  {
    topic: "seo",
    text: "A meta description of roughly 120–160 characters that summarizes the product and includes its main search term improves click-through from search results. Missing or truncated meta descriptions let search engines auto-generate a poor snippet. Write one deliberate sentence per page that would make a searcher choose your result over the nine others on the page.",
  },
  {
    topic: "seo",
    text: "Every product page should emit Product JSON-LD structured data with name, price, availability, and rating. This is what powers rich results — price and star ratings — in search listings, which lift click-through substantially. Stores missing schema markup forfeit that visibility. Most modern themes include it; auto-built stores sometimes strip or never populate it.",
  },
  {
    topic: "seo",
    text: "Duplicate or templated title tags across products confuse search engines and shoppers alike. Each page needs a unique, descriptive title leading with the product name and a distinguishing attribute. Generic titles like the store name repeated on every page waste the most valuable SEO real estate and make browser tabs and search results indistinguishable.",
  },
  {
    topic: "catalog",
    text: "A coherent catalog focused on one niche or theme reads as a real brand; a grab-bag of unrelated products reads as a drop-shipping front. Shoppers trust a store that clearly knows its category. When products span wildly different niches with no connective story, buyers question the store's expertise and legitimacy. Curate around a clear identity.",
  },
  {
    topic: "catalog",
    text: "Catalog size should match the store's positioning. Too few products (one or two) looks unfinished or like a test store; too many hundreds with thin content looks like an unmanaged dump. A focused launch of a dozen well-merchandised products with rich pages converts better than a sprawling catalog of neglected listings.",
  },
];
