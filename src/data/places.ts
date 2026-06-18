// Cuenca Expat Map — place data
// -----------------------------------------------------------------------------
// To sell a listing: find the business below, change `tier` to "premium", and
// fill in tagline, description, hours, phone, website, and an `illo`.
// To attach a full review: set `reviewSlug` to the matching slug in reviews.ts —
// the map listing and the featured badge then link straight to that review.

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

  // Set when a full write-up exists in reviews.ts — the badge becomes a link.
  reviewSlug?: string;
}

// Label + color for each category. Colors are drawn from Cuenca's own palette:
// cathedral blue, toquilla-straw gold, terracotta roofs, Andean green, wine.
export const categoryMeta: Record<Category, { label: string; color: string }> = {
  landmark: { label: "Landmarks & plazas", color: "#1e5fa8" },
  market: { label: "Markets", color: "#c0533b" },
  museum: { label: "Museums & culture", color: "#c2922f" },
  outdoors: { label: "Parks & views", color: "#4e7a52" },
  food: { label: "Food & cafés", color: "#8c3f5e" },
};

export const places: Place[] = [
  // --- Landmarks & plazas ----------------------------------------------------
  { id: "parque-calderon", name: "Parque Calderón", category: "landmark", tier: "standard", lat: -2.8974172, lng: -79.0044893, address: "Mariscal Sucre, Cuenca", rating: 4.8, ratingCount: 20232 },
  { id: "new-cathedral", name: "Catedral de la Inmaculada (New Cathedral)", category: "landmark", tier: "standard", lat: -2.8974979, lng: -79.0050167, address: "Benigno Malo, Cuenca", rating: 4.8, ratingCount: 4109 },
  { id: "old-cathedral", name: "Old Cathedral (Catedral Vieja)", category: "landmark", tier: "standard", lat: -2.8978053, lng: -79.0038416, address: "C. Luis Cordero 8-88, Cuenca", rating: 4.7, ratingCount: 654 },
  { id: "plaza-de-las-flores", name: "Plaza de las Flores", category: "landmark", tier: "standard", lat: -2.8976754, lng: -79.0058073, address: "Beside Iglesia del Carmen, Cuenca", rating: 4.7, ratingCount: 1532 },
  { id: "parque-san-sebastian", name: "Parque San Sebastián", category: "landmark", tier: "standard", lat: -2.8955963, lng: -79.0111583, address: "Coronel Guillermo Tálbot, Cuenca", rating: 4.6, ratingCount: 1290 },

  // --- Markets ---------------------------------------------------------------
  { id: "plaza-san-francisco", name: "Plaza San Francisco", category: "market", tier: "standard", lat: -2.8981662, lng: -79.0066167, address: "Padre Aguirre y Pres. Córdova, Cuenca", rating: 4.3, ratingCount: 2325 },
  { id: "mercado-10-de-agosto", name: "Mercado 10 de Agosto", category: "market", tier: "standard", lat: -2.8991483, lng: -79.007599, address: "Calle Larga 1147, Cuenca", rating: 4.3, ratingCount: 9986 },
  { id: "mercado-9-de-octubre", name: "Mercado 9 de Octubre", category: "market", tier: "standard", lat: -2.8953853, lng: -79.0012254, address: "Mariano Cueva y Pío Bravo, Cuenca", rating: 4.1, ratingCount: 7608 },

  // --- Museums & culture -----------------------------------------------------
  { id: "pumapungo", name: "Pumapungo Museum & Ruins", category: "museum", tier: "standard", lat: -2.9060989, lng: -78.9968406, address: "Calle Larga y Av. Huayna Cápac, Cuenca", rating: 4.7, ratingCount: 6976 },
  { id: "museo-del-sombrero", name: "Museo del Sombrero (Toquilla Straw Hat)", category: "museum", tier: "standard", lat: -2.9002731, lng: -79.0069204, address: "Calle Larga 10-41, Cuenca", rating: 4.6, ratingCount: 1268 },
  { id: "homero-ortega", name: "Homero Ortega Panama Hats", category: "museum", tier: "standard", lat: -2.8909818, lng: -78.9929382, address: "Av. Gil Ramírez Dávalos, Cuenca", rating: 4.7, ratingCount: 691 },

  // --- Parks & views ---------------------------------------------------------
  { id: "mirador-de-turi", name: "Mirador de Turi", category: "outdoors", tier: "standard", lat: -2.9223661, lng: -79.0101307, address: "Av. Mirador de Turi, Cuenca", rating: 4.8, ratingCount: 3476 },
  { id: "parque-de-la-madre", name: "Parque de la Madre", category: "outdoors", tier: "standard", lat: -2.9045589, lng: -79.0031415, address: "Av. Fray Vicente Solano, Cuenca", rating: 4.6, ratingCount: 159 },
  { id: "rio-tomebamba", name: "Río Tomebamba Walk", category: "outdoors", tier: "standard", lat: -2.8927765, lng: -79.0202627, address: "Av. 3 de Noviembre, Cuenca", rating: 4.9, ratingCount: 8 },
  { id: "parque-el-paraiso", name: "Parque El Paraíso", category: "outdoors", tier: "standard", lat: -2.9114837, lng: -78.9894478, address: "El Paraíso, Cuenca", rating: 4.6, ratingCount: 7599 },

  // --- Food & cafés ----------------------------------------------------------
  {
    id: "cafe-san-sebas",
    name: "Café San Sebas",
    category: "food",
    tier: "premium",
    lat: -2.8960951,
    lng: -79.0114307,
    address: "San Sebastián y Mariscal Sucre 1-94, Cuenca",
    rating: 4.6,
    ratingCount: 1452,
    tagline: "Brunch & bottomless coffee",
    description:
      "A long-time expat favorite on the quiet edge of Parque San Sebastián — build-your-own breakfasts and a sunny upstairs terrace made for slow mornings.",
    illo: "dome",
    hours: ["Mon–Sun: 8:00 AM – 2:30 PM"],
    phone: "+593 7-284-3496",
    website: "https://www.sansebascuenca.com/",
    reviewSlug: "review-cafe-san-sebas", // ← full review exists; badge links to it
  },
  {
    id: "goza-espresso-bar",
    name: "Goza Espresso Bar",
    category: "food",
    tier: "premium",
    lat: -2.9017779,
    lng: -79.0039668,
    address: "La Merced y Presidente Borrero, Cuenca",
    rating: 4.5,
    ratingCount: 2482,
    tagline: "Espresso by day, cocktails by night",
    description:
      "Two levels of espresso, fresh pastries, and evening cocktails steps from El Centro's liveliest street.",
    illo: "facade",
    hours: ["Mon–Sun: 8:00 AM – 10:00 PM"],
    phone: "+593 98 966 2728",
    website: "https://linktr.ee/gozaespressobar",
    // featured listing, review not yet written → no reviewSlug
  },
  { id: "sunrise-cafe", name: "Sunrise Café", category: "food", tier: "standard", lat: -2.9007104, lng: -79.0058901, address: "Calle Larga 938, Cuenca", rating: 4.6, ratingCount: 855 },
  { id: "tutto-matto", name: "Tutto Matto Pizzería", category: "food", tier: "standard", lat: -2.9100462, lng: -79.0086246, address: "Av. Fray Vicente Solano 8-51, Cuenca", rating: 4.5, ratingCount: 124 },
  { id: "wunderbar", name: "Wunderbar Café", category: "food", tier: "standard", lat: -2.9025736, lng: -79.0030869, address: "Hermano Miguel (near the escalinata), Cuenca", rating: 4.4, ratingCount: 426 },
];
