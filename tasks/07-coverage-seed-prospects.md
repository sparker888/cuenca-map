# 07 — Comprehensive coverage seed + prospect list (data pull)
Status: done (2026-06-20) · Priority: P1

## What was built
- `pocketbase/scripts/pull-coverage.mjs` — Overpass/OSM pull (ODbL) for the Cuenca bbox, normalized to
  our taxonomy, deduped by OSM id. Quality-ranks by **OSM completeness** (maintained-tag richness) and
  spreads across ~2km grid cells (round-robin), selecting ~180 restaurants-cafés / 40 bars / 30 tours.
  `--import` upserts the selection into `businesses` as `tier=free, published=false` (drafts), basic
  fields only, idempotent by `osmId`. Services are vetting-only, never imported.
- Schema: added `businesses.osmId` (dedup/upsert key).

## Outputs (committed)
- `pocketbase/snapshots/coverage-counts.{json,md}` — FULL backstop counts + the selection counts.
  Discovery full: restaurants-cafés 1531, bars 114, tours 60 (1705; fast_food/food_court 293 counted
  but excluded from selection). Services: dental 91, visa-legal 38, real-estate 13.
- `pocketbase/snapshots/coverage-selected.json` — the 250-record import manifest / prospect subset.
- `pocketbase/snapshots/service-candidates.json` — 142 service candidates (NOT published).

## Done / verified
- 250 discovery drafts imported (published=false); anon public read stays at 20 (drafts hidden);
  idempotent by osmId.
- **Licensing:** OSM only (safe to persist/publish). Google Places NOT used — needs an API key and its
  terms forbid persisting/publishing Places content on a competing map. Google rating/review ranking is
  a future refinement once a key is available.

## Follow-up for Stephen
- Curate the 250 drafts in the PB admin and flip `published` on the keepers (nothing auto-goes-live).
- Caps/scope: the full 1705 backstop + 142 service candidates inform cap-setting and the sales target list.

## Note
Surfaced + fixed a pre-existing security bug: owner-scoped rules matched anonymous requests against
owner-less records (`owner = @request.auth.id` → "" = "" → true), exposing drafts. Now guarded with
`@request.auth.id != ""`. See [[cuenca-owner-portal-auth]].
