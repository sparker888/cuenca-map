// Cuenca Expat Map — review types
// -----------------------------------------------------------------------------
// Review DATA now lives in PocketBase, loaded at build time by src/lib/content.ts
// (getReviews / getPublishedReviews). This file keeps only the shared types.
//
// In PocketBase: `published = true` renders a full review page (and a card);
// `comingSoon = true` renders a teaser "coming soon" card only (no page);
// a record with neither flag is a private draft and is not exposed publicly.

import type { IlloName } from "./places";

export type Block =
  | { type: "p"; text: string; dropcap?: boolean }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string }
  | { type: "figure"; illo: IlloName; caption: string };

export interface Review {
  slug: string;
  placeId: string;
  published: boolean;
  businessSlug?: string; // slug of the linked business — used to fetch live specials
  businessWhatsapp?: string; // linked business's whatsapp number (for the WhatsApp button)
  businessPriceTier?: string; // linked business's $ / $$ / $$$ indicator

  // Card (homepage showcase + reviews index)
  name: string;
  category: string; // human label, e.g. "Food & cafés"
  rating: number;
  cardIllo: IlloName;
  dek: string;
  dekEs?: string;

  // Article (only required when published)
  title?: string;
  eyebrow?: string; // e.g. "Food & cafés · El Centro"
  lede?: string;
  author?: string;
  authorInitial?: string;
  date?: string;
  readTime?: string;
  ratingLabel?: string; // e.g. "Local favorite"
  leadIllo?: IlloName;
  leadCaption?: string;
  body?: Block[];
  essentials?: {
    address: string;
    hours: string;
    goodFor: string;
    price: string;
    website?: string;
    phone?: string;
    lat: number;
    lng: number;
    miniIllo: IlloName;
    miniCaption: string;
  };
}
