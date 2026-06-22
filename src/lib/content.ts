// Build-time content loaders. These replace the old hardcoded arrays in
// src/data/places.ts and src/data/reviews.ts, fetching the same data from
// PocketBase (anonymously, published-only) and mapping it to the exact
// `Place` / `Review` / categoryMeta shapes the components already expect — so
// the rendered site is identical, just sourced from the backend.
import type { Category, Place } from "../data/places";
import type { Block, Review } from "../data/reviews";
import { pbList } from "./pocketbase";

export type CategoryMeta = Record<Category, { label: string; color: string }>;

// Drop empty strings / nulls so optional fields stay `undefined`, matching the
// original hand-authored objects (the components branch on truthiness).
const opt = <T>(v: T | "" | null | undefined): T | undefined =>
  v === "" || v === null || v === undefined ? undefined : (v as T);

export async function getCategoryMeta(): Promise<CategoryMeta> {
  const cats = await pbList<any>("categories", { sort: "order" });
  const meta = {} as CategoryMeta;
  for (const c of cats) meta[c.key as Category] = { label: c.label, color: c.color };
  return meta;
}

export async function getPlaces(): Promise<Place[]> {
  // Public rule already limits this to published businesses. Reviews are loaded
  // once here so each place can carry a `reviewed` flag (a published review links
  // to it) — used by the map's gold-star treatment. Coming-soon teasers
  // (published=false) intentionally do NOT count as reviewed.
  const [rows, reviews] = await Promise.all([
    pbList<any>("businesses", { expand: "category", sort: "created" }),
    getReviews(),
  ]);
  const pub = reviews.filter((r) => r.published);
  const reviewedReviewSlugs = new Set(pub.map((r) => r.slug));
  const reviewedBizSlugs = new Set(pub.map((r) => r.businessSlug).filter(Boolean));
  return rows.map((b) => ({
    id: b.slug,
    name: b.name,
    category: (b.expand?.category?.key ?? "") as Category,
    tier: b.tier,
    lat: b.lat,
    lng: b.lng,
    address: opt(b.address),
    rating: opt(b.rating),
    ratingCount: opt(b.ratingCount),
    priceTier: opt(b.priceTier),
    tagline: opt(b.tagline),
    description: opt(b.description),
    illo: opt(b.illo),
    hours: Array.isArray(b.hours) && b.hours.length ? b.hours : undefined,
    phone: opt(b.phone),
    whatsapp: opt(b.whatsapp),
    website: opt(b.website),
    reviewSlug: opt(b.reviewSlug),
    reviewed: reviewedBizSlugs.has(b.slug) || (!!b.reviewSlug && reviewedReviewSlugs.has(b.reviewSlug)),
  }));
}

function mapReview(r: any): Review {
  return {
    slug: r.slug,
    placeId: "", // not needed at render time; relation lives on the record
    businessSlug: r.expand?.business?.slug,
    businessWhatsapp: r.expand?.business?.whatsapp || undefined,
    businessPriceTier: r.expand?.business?.priceTier || undefined,
    published: !!r.published,
    name: r.name,
    category: r.category,
    rating: r.rating,
    cardIllo: r.cardIllo,
    dek: r.dek,
    dekEs: opt(r.dekEs),
    title: opt(r.title),
    eyebrow: opt(r.eyebrow),
    lede: opt(r.lede),
    author: opt(r.author),
    authorInitial: opt(r.authorInitial),
    date: opt(r.date),
    readTime: opt(r.readTime),
    ratingLabel: opt(r.ratingLabel),
    leadIllo: opt(r.leadIllo),
    leadCaption: opt(r.leadCaption),
    body: Array.isArray(r.body) && r.body.length ? (r.body as Block[]) : undefined,
    essentials: r.essentials && Object.keys(r.essentials).length ? r.essentials : undefined,
  };
}

// All publicly-visible reviews (published + coming-soon teasers), in seed order.
export async function getReviews(): Promise<Review[]> {
  const rows = await pbList<any>("reviews", { sort: "created", expand: "business" });
  return rows.map(mapReview);
}

// Only fully-published reviews — drives getStaticPaths() for /reviews/[slug].
export async function getPublishedReviews(): Promise<Review[]> {
  return (await getReviews()).filter((r) => r.published);
}

export interface CategorySlot {
  id: string; // PocketBase record id (used as the waitlist form value)
  key: Category;
  label: string;
  color: string;
  cap: number;
  filled: number; // PAID listings (enhanced/premium) — the only thing a cap counts
  remaining: number;
  full: boolean;
  base: number; // all published businesses in the category — scarcity context
}

// Sales inventory: ONLY sellable (paid) categories — cap vs. count of PAID
// (enhanced/premium) listings — for the "X of N open" display on /list-your-business.
// `filled` (the quota signal) counts paid tiers only, so the free curated/discovery
// base never eats a slot; `base` is the all-tiers published count, shown as context.
// Curated/tourist categories (sellable=false) are intentionally excluded.
export async function getInventory(): Promise<CategorySlot[]> {
  const [cats, paid, published] = await Promise.all([
    pbList<any>("categories", { sort: "order", filter: "sellable = true" }),
    pbList<any>("businesses", {
      filter: 'published = true && (tier = "enhanced" || tier = "premium")',
      expand: "category",
    }),
    pbList<any>("businesses", { filter: "published = true", expand: "category" }),
  ]);
  const countByCat = (rows: any[]) => {
    const m: Record<string, number> = {};
    for (const b of rows) {
      const k = b.expand?.category?.key;
      if (k) m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  };
  const filledByCat = countByCat(paid);
  const baseByCat = countByCat(published);
  return cats.map((c) => {
    const cap = c.cap ?? 0;
    const filled = filledByCat[c.key] ?? 0;
    const remaining = Math.max(0, cap - filled);
    return {
      id: c.id,
      key: c.key as Category,
      label: c.label,
      color: c.color,
      cap,
      filled,
      remaining,
      full: remaining <= 0,
      base: baseByCat[c.key] ?? 0,
    };
  });
}
