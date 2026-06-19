// Cuenca Expat Map — place types
// -----------------------------------------------------------------------------
// The place/category DATA now lives in PocketBase and is loaded at build time by
// src/lib/content.ts (getPlaces / getCategoryMeta). This file keeps only the
// shared types so components and the loader agree on shape.
// To edit listings (tier, tagline, hours, reviewSlug, …) use the PocketBase
// admin UI; a static-affecting change triggers a Netlify rebuild.

export type Category = "landmark" | "market" | "museum" | "outdoors" | "food";
export type Tier = "standard" | "premium";
export type IlloName = "dome" | "facade" | "market" | "terrace" | "river";

export interface Place {
  id: string;
  name: string;
  category: Category;
  tier: Tier;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  ratingCount?: number;

  // Premium-only fields (shown on featured listings)
  tagline?: string;
  description?: string;
  illo?: IlloName; // illustrated placeholder shown in the listing
  hours?: string[];
  phone?: string;
  website?: string;

  // Set when a full write-up exists — the badge becomes a link to /reviews/<slug>.
  reviewSlug?: string;
}

// Label + color per category. Shape kept here; values now come from PocketBase
// (categories collection) via getCategoryMeta() in src/lib/content.ts.
export type CategoryMeta = Record<Category, { label: string; color: string }>;
