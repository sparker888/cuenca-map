# CLAUDE.md — Cuenca Maps

Persistent context for Claude Code. Read this first, every session.

## What this is
Cuenca Maps (a.k.a. Cuenca Expat Map) — a curated, editorial map + review guide to the places
expats love in Cuenca, Ecuador, with a monetized listing/inventory model. Brand: Gravital Digital.
**Editorial stance: curation, not criticism** — we only publish places we recommend, never negative
takedowns (Ecuador has criminal defamation law).

## Stack
- **Frontend:** Astro 5, static, on **Netlify** (`cuenca-map.netlify.app`; production domain
  `cuencamap.com` pending). Map = Leaflet / MapLibre + CARTO tiles. **No Google Maps dependency by design.**
- **Backend:** **PocketBase** (single Go binary: SQLite + auth + admin UI + REST/realtime API + file
  storage) on **fly.io**, app `cuenca-map-production` (`cuenca-map-production.fly.dev`). Admin UI at `/_/`.
  PocketBase is the **source of truth**.

## Architecture (hybrid sync)
- **Build time:** Astro pulls *published* businesses/reviews/media/categories from PocketBase to
  generate static pages (`src/lib/content.ts`, `src/lib/pocketbase.ts`).
- **Rebuilds:** a PocketBase hook (`pocketbase/pb_hooks/rebuild.pb.js`) sets a dirty flag, drained by a
  1/min cron that POSTs the Netlify build hook on static-affecting changes.
- **Live data:** the browser fetches `events_specials` directly from PocketBase (`src/lib/specials.ts`) —
  instant, no rebuild. specials/events never trigger rebuilds.

## Source of truth & reproducibility
- Reproducible from the repo: the **schema** (`pocketbase/pb_migrations/`) and **category config**
  (`pocketbase/scripts/seed-categories.mjs`).
- NOT in the repo: **businesses & reviews** (PocketBase-managed editorial content). See
  `tasks/04-editorial-content-snapshot.md`.

## Security — collection rules ARE the perimeter (the browser hits PocketBase directly)
- Public read: **published** businesses/reviews + categories/media only.
- `leads`: create-only, read blocked. `subscriptions` / `users`: owner/admin only.
- Owners scoped to `@request.auth.id`. Never expose draft/unpublished content publicly.

## Env vars (placement matters)
- **Netlify:** `PUBLIC_APP_URL`, `PUBLIC_POCKETBASE_URL`, `POCKETBASE_URL` (URLs only).
- **fly secrets only — never Netlify/client:** `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD`,
  `NETLIFY_BUILD_HOOK_URL`, and the future Turnstile secret.
- The admin password is re-applied from the `PB_ADMIN_PASSWORD` fly secret on every boot — rotate via
  `flyctl secrets set`, not the admin UI.

## Conventions
- Keep the public site static; never put admin credentials in client/Netlify.
- Schema/category changes go in migrations / seed scripts (reproducible), not hand-edits in the UI.
- PocketBase JSVM hooks/crons run in isolated scopes — inline everything (no module-level refs).
- One PocketBase machine, `pb_data` on a mounted volume, scheduled backups ON.

## Pricing / inventory model (for any sales-facing UI)
- Tiers: Free curated; Enhanced $180/yr; Premium/Review $399 first yr → $180/yr renew; +YouTube $599.
- Capped **sellable** categories: Restaurants & cafés 12, Dental 3, Real estate 3, Visa/legal 3, Tours 4,
  Bars 3. **Curated** categories (landmark/market/museum/outdoors) are free & uncapped, map-only.
- Scarcity is the product — publish slot counts, keep a waitlist.

## Backlog
See `tasks/` (start with `tasks/README.md`). Full business plan + build brief live in Notion.
