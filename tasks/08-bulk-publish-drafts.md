# 08 — Bulk-publish the discovery drafts (curate-by-exclusion enabler)
Status: done (2026-06-20) · Priority: quick utility

`pocketbase/scripts/publish-drafts.mjs` admin-auths and flips `published` on the OSM-imported
discovery pins so Stephen curates by EXCLUSION (delete/unpublish rejects in PB admin) instead of
publishing 250 by hand.

- Strict scope: only `businesses` with `osmId` set AND `tier=free`. Never touches owner/editorial
  records, `tier!=free`, or leads/subscriptions/users. Idempotent.
- `--unpublish` flips the same set back to draft (fully reversible in one command).

Done: published 250 OSM pins; anon public read = 270 (20 editorial + 250 OSM); re-run = 0 (idempotent).
The full 1,705 stays in `coverage-counts.json` as backstop; deleted pins are re-pullable via
`pull-coverage.mjs`. NOTE: the uncurated set is now public on the staging URL — fine pre-launch;
prune before `cuencamap.com` / promotion.
