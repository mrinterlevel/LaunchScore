import type { Category, FindingType, Severity } from "@/lib/types";

export interface SnapshotImage {
  src: string;
  alt: string;
}

export interface SnapshotPage {
  url: string;
  title: string;
  metaDescription: string;
  bodyText: string;
}

export interface SnapshotProduct extends SnapshotPage {
  description: string;
  descriptionWords: number;
  price: number | null;
  compareAtPrice: number | null;
  images: SnapshotImage[];
  hasProductSchema: boolean;
  hasReviews: boolean;
}

export type PolicyKind = "returns" | "shipping" | "contact" | "privacy" | "other";

export interface SnapshotPolicy extends SnapshotPage {
  kind: PolicyKind;
}

export interface StoreSnapshot {
  storeUrl: string;
  siteName: string;
  homepage: SnapshotPage;
  products: SnapshotProduct[];
  policies: SnapshotPolicy[];
  contacts: string[];
  warnings: string[];
  crawledAt: string;
}

export interface RuleResult {
  id: string;
  code: string;
  type: FindingType;
  category: Category;
  severity: Severity | null;
  passed: boolean;
  label: string;
  detail: string;
  productTitle: string | null;
}

export interface ProductRetrieval {
  productIndex: number;
  vector: number[];
  niche: string;
  comps: Array<{
    id: string;
    title: string;
    niche: string;
    price: number | null;
    images: number;
    descWords: number;
    sim: number;
    sourceUrl?: string;
  }>;
  guides: Array<{
    id: string;
    topic: string;
    text: string;
    sim: number;
  }>;
  metrics: {
    descWords: number;
    compDescMedian: number;
    images: number;
    compImageMedian: number;
    price: number | null;
    compPriceMedian: number | null;
    pricePercentile: number | null;
  };
}

export interface AuditStageResult {
  snapshot: StoreSnapshot;
  rules: RuleResult[];
  retrievals: ProductRetrieval[];
}
