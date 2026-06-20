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
  // Public rule already limits this to published businesses.
  const rows = await pbList<any>("businesses", { expand: "category", sort: "created" });
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
  used: number;
  remaining: number;
}

// Sales inventory: ONLY sellable (paid) categories — cap vs. count of published
// businesses — for the "X of N slots remaining" display on /list-your-business.
// Curated/tourist categories (sellable=false) are intentionally excluded.
export async function getInventory(): Promise<CategorySlot[]> {
  const [cats, biz] = await Promise.all([
    pbList<any>("categories", { sort: "order", filter: "sellable = true" }),
    pbList<any>("businesses", { expand: "category" }),
  ]);
  const counts: Record<string, number> = {};
  for (const b of biz) {
    const k = b.expand?.category?.key;
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return cats.map((c) => {
    const cap = c.cap ?? 0;
    const used = counts[c.key] ?? 0;
    return {
      id: c.id,
      key: c.key as Category,
      label: c.label,
      color: c.color,
      cap,
      used,
      remaining: Math.max(0, cap - used),
    };
  });
}
