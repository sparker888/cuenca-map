# Cuenca Expat Map — Astro + Tailwind v4

A modern, editorial redesign of the Cuenca expat map. An interactive Leaflet map
of the places expats love, plus independent **long-form reviews** of the
restaurants worth your time. Featured (reviewed) venues carry a gold badge that
links straight to their review.

## Stack

- **Astro 5** (static, file-based routing)
- **Tailwind v4** via `@tailwindcss/vite` — tokens live in `src/styles/global.css`
  under `@theme` (no `tailwind.config.js`)
- **Leaflet 1.9** for the map (CARTO dark **no-labels** basemap, no API key)
- **Three.js** for the subtle animated Andes topography behind dark headers
- **Fonts:** Newsreader (editorial display + long-form) · Hanken Grotesk (UI)

## About page & business CTA

- `/about` highlights the maker (**Remote Solopreneur**) with a bio and a video
  reel — including the in-production **Cuenca in 2026**. Video cards use placeholder
  illustrations + titles; swap in real YouTube links and stills in `about.astro`.
- Below the reel, a deliberately low-key CTA invites owners to **add their business
  to the map**, with a basic contact form (name, business, email, message). The form
  is a static demo — wire it to a form service / endpoint / `mailto` for production.
- The **Design system** link is hidden from the nav and footer; the page still lives
  at `/design-system` for reference.

## Dark headers, language toggle & the map frame

- **Andes backdrop** — `AndesBackdrop.astro` (logic in `src/lib/andes.ts`) renders a
  faint, slowly-drifting wireframe mountain mesh that tilts toward the cursor and
  honors `prefers-reduced-motion`. It sits behind the dark headers on the home,
  reviews, design-system and review pages. Tune color/amplitude in `andes.ts`.
- **EN / ES toggle** — the globe button in the nav. UI strings live in
  `src/i18n/ui.ts`; `src/i18n/client.ts` (loaded once in `Base.astro`) swaps every
  `[data-i18n]` element, swaps `data-en`/`data-es` content pairs (card deks), and
  fires a `langchange` event the map listens to. The choice persists in
  `localStorage`. **Long-form article bodies stay English** — for full content
  translation, the production path is route-based i18n (`/es/…`); this toggle
  covers all the chrome + map + cards.
- **Map** — the homepage uses **`CuencaMapGL.astro`**: MapLibre GL with CARTO's
  open **Dark Matter** vector basemap (no API key). It shows road/place **labels**
  (artery names), and recolors the real basemap features — **rivers light-blue,
  major arteries (motorway/trunk/primary) gold** — via `setPaintProperty` on style
  load (see `recolorBasemap`). Tweak those colors there.
  - **Revert to the Leaflet map** any time: in `src/pages/index.astro` swap
    `<CuencaMapGL />` → `<CuencaMap />` and the matching import. `CuencaMap.astro`
    (raster CARTO dark, no feature recolor) is kept intact for exactly this.
  - The preview folder mirrors this: `preview/index.html` (MapLibre) and
    `preview/index-leaflet.html` (the Leaflet revert).

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output → dist/
```

## Project structure

```
src/
  styles/global.css            ← Tailwind import + @theme design tokens + base
  lib/andes.ts                 ← Three.js Andes-topography backdrop (initAndes)
  i18n/
    ui.ts                       ← EN/ES string dictionary + helpers
    client.ts                   ← toggle bootstrap (swaps [data-i18n], fires langchange)
  data/
    places.ts                  ← every map place (+ tier, illo, reviewSlug)
    reviews.ts                  ← review content (cards + full article bodies, dekEs)
  components/
    Nav.astro  Footer.astro     ← chrome (Nav carries the language toggle)
    AndesBackdrop.astro         ← <canvas> + client init for the dark headers
    Illustration.astro          ← the 5 abstract Cuenca placeholders (dome, facade…)
    CuencaMap.astro             ← Leaflet island: frame, CUENCA label, panel, i18n
    ReviewCard.astro            ← showcase / index card (handles "coming soon")
  layouts/Base.astro            ← <head>, fonts, global.css, i18n bootstrap
  pages/
    index.astro                 ← homepage: dark Andes hero + map + reviews showcase
    about.astro                 ← maker profile (Remote Solopreneur) + videos + "add your business" CTA form
    reviews/index.astro         ← reviews listing (featured + grid)
    reviews/[slug].astro        ← review template (Café San Sebas is the example)
    design-system.astro         ← living style guide (hidden from nav; still at /design-system)
public/
  listings/<business-id>/       ← drop real venue photos here at launch
```

## How the pieces connect

- **A place → its review.** Set a place's `reviewSlug` (in `places.ts`) to a
  review's `slug` (in `reviews.ts`). The map listing panel and the gold featured
  badge then link to `/reviews/<slug>`. `Café San Sebas` is wired this way.
- **Reviews in the nav.** `/reviews` is a top-level nav item (`Nav.astro`).
- **Publishing a review.** Reviews with `published: false` show as "coming soon"
  cards and generate no page. Write the `body`, fill `essentials`, flip to `true`.
- **Adding a review.** Append to `reviews` in `reviews.ts`. The `body` is an array
  of typed blocks (`p` / `h2` / `quote` / `figure`) rendered by `[slug].astro`.

## Replacing the illustrations with real photos

`Illustration.astro` renders flat, abstract placeholders. At launch, swap any
`<Illustration name="…" />` for an `<img>` pointing at `public/listings/<id>/…`.
Use photos the **business provides** or that **you shoot yourself** — don't host
Google Maps / Places imagery on a paid directory.

## Design tokens

All colors and fonts are defined once in `src/styles/global.css` (`@theme`).
Change a value there and it propagates everywhere (e.g. `--color-gold`,
`--font-display`). See `/design-system` in the running site for the full
reference.

## Migrating from the original component

`CuencaMap.astro` and `places.ts` are drop-in evolutions of the originals —
`places.ts` gains optional `illo` and `reviewSlug` fields (backward compatible);
the map now uses Tailwind for its chrome and links featured pins to reviews.
