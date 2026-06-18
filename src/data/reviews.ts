// Cuenca Expat Map — review data
// -----------------------------------------------------------------------------
// Each review links back to a place in places.ts via `placeId`. Set the matching
// place's `reviewSlug` to this `slug` so the map listing + featured badge link here.
//
// `published: false` reviews appear as "coming soon" cards in the index/showcase
// and are excluded from getStaticPaths(), so no page is generated for them yet.
// To publish: write the `body`, fill `essentials`, and flip `published` to true.

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

export const reviews: Review[] = [
  {
    slug: "review-cafe-san-sebas",
    placeId: "cafe-san-sebas",
    published: true,
    name: "Café San Sebas",
    category: "Food & cafés",
    rating: 4.6,
    cardIllo: "dome",
    dek: "The expat brunch institution on the quiet plaza — bottomless coffee, an upstairs terrace, and the slowest, best mornings in El Centro.",
    dekEs: "La institución del brunch expat en la plaza tranquila: café sin fondo, una terraza arriba y las mañanas más lentas y placenteras de El Centro.",

    title: "A slow morning at Café San Sebas",
    eyebrow: "Food & cafés · El Centro",
    lede: "Bottomless coffee, a sunny upstairs terrace, and the most unhurried brunch in Cuenca — eight years on, still the one we send everyone to.",
    author: "Marisol Vega",
    authorInitial: "M",
    date: "March 18, 2026",
    readTime: "6 min read",
    ratingLabel: "Local favorite",
    leadIllo: "dome",
    leadCaption:
      "The terrace catches the morning sun over Parque San Sebastián. Illustration — replace with a photo from the venue.",
    body: [
      {
        type: "p",
        dropcap: true,
        text: "There is a particular kind of Cuenca morning that Café San Sebas was built for: cool air off the Cajas, the bells of San Sebastián church a block away, and absolutely nowhere you need to be. For close to a decade this corner spot has been the unofficial living room of the city's expat community — and, increasingly, of the Cuencanos who've decided the gringos got this one right.",
      },
      {
        type: "p",
        text: "The room itself is unfussy. Whitewashed walls, a few framed prints, a chalkboard of specials that hasn't changed much in years and is all the better for it. The magic is upstairs: a small terrace, half-shaded, that looks straight onto the leafy plaza. Get there before ten on a weekend and you'll have to wait. Get there before nine and the city is still yours.",
      },
      { type: "h2", text: "The build-your-own breakfast" },
      {
        type: "p",
        text: "San Sebas made its name on a deceptively simple idea — let people assemble their own breakfast. You pick eggs, a base, a side, a bread, a coffee, and the kitchen does the rest with the kind of consistency that's harder to pull off than it looks. The huevos rancheros are the move if you want one decision made for you: two eggs over a soft tortilla, a bright tomato salsa, beans with real depth, all of it built to be mopped up slowly.",
      },
      {
        type: "figure",
        illo: "facade",
        caption: "Plaza-side arches a few doors down — the walk that earns the second coffee.",
      },
      {
        type: "p",
        text: "And then there is the coffee, which is bottomless, which changes everything. A second cup is never a transaction here; you simply look up and it appears. It's the small mechanism that turns a meal into a morning, and it's the single biggest reason people linger at San Sebas the way they do.",
      },
      {
        type: "quote",
        text: "It's not the best food in Cuenca. It's the best <em>morning</em> in Cuenca — and after eight years that's the thing I'd actually fight to protect.",
      },
      { type: "h2", text: "What it gets right" },
      {
        type: "p",
        text: "Plenty of cafés in El Centro do a sharper flat white or a more photogenic plate. What San Sebas understands, and most don't, is pace. Nobody hovers. Nobody drops the check before you've asked. The terrace is engineered — accidentally or not — to make two hours feel like forty minutes, and the staff have clearly been told that a slow table is a happy table, not a problem to solve.",
      },
      {
        type: "p",
        text: 'It helps that the location is quietly perfect. Parque San Sebastián is the prettiest of the centro\'s smaller plazas and the least trafficked, so the soundtrack is birds and the occasional church bell rather than buses. After breakfast, a slow loop of the square and the little gallery on its north side is the natural next move — <a href="/">find it on the map</a> and make an afternoon of it.',
      },
      { type: "h2", text: "The verdict" },
      {
        type: "p",
        text: "If you've just landed in Cuenca and want one place that explains why people stay, this is it. Come hungry, come with no plans, and order a second coffee before you think you want it. San Sebas isn't trying to be the city's most ambitious kitchen — it's trying to give you the best two hours of your day, and it does, reliably, every single morning.",
      },
    ],
    essentials: {
      address: "San Sebastián y Mariscal Sucre 1-94, Cuenca",
      hours: "Mon–Sun · 8:00 AM – 2:30 PM",
      goodFor: "Brunch · bottomless coffee · slow mornings · terrace",
      price: "$$ · $5–9 a plate",
      website: "https://www.sansebascuenca.com/",
      phone: "+593 7-284-3496",
      lat: -2.8960951,
      lng: -79.0114307,
      miniIllo: "river",
      miniCaption: "On the quiet edge of Parque San Sebastián.",
    },
  },

  // --- Teased / not yet written ----------------------------------------------
  {
    slug: "review-mercado-10",
    placeId: "mercado-10-de-agosto",
    published: false,
    name: "Mercado 10 de Agosto",
    category: "Markets",
    rating: 4.3,
    cardIllo: "market",
    dek: "Three floors of fruit, hornado, and ten-dollar almuerzos. A guide to eating your way through Cuenca's best market without getting lost.",
    dekEs: "Tres pisos de fruta, hornado y almuerzos de diez dólares. Una guía para comer por el mejor mercado de Cuenca sin perderte.",
  },
  {
    slug: "review-little-italy",
    placeId: "little-italy",
    published: false,
    name: "Little Italy",
    category: "Food & cafés",
    rating: 4.5,
    cardIllo: "terrace",
    dek: "A cozy Italian spot in El Ejido for a proper sit-down dinner — wood-fired pizza, red sauce done right, and a warm room that fills up after dark. Placeholder copy.",
    dekEs: "Un acogedor lugar italiano en El Ejido para una cena de verdad: pizza al horno de leña, buena salsa roja y un salón cálido que se llena al caer la noche. Texto de ejemplo.",
  },
];

export const publishedReviews = reviews.filter((r) => r.published);
export const getReview = (slug: string) => reviews.find((r) => r.slug === slug);
