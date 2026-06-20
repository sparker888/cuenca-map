# 04 — Editorial content snapshot (git-tracked)
Status: done (2026-06-20) · Priority: P1

Built: `pocketbase/scripts/export-snapshot.mjs` (admin auth; exports businesses/reviews/
categories incl. drafts to `pocketbase/snapshots/*.json`, allowlisted fields, stable sort +
key order, relations stored by key — categoryKey/businessSlug; drops owner + menuPdf; PII
leak-check) and `import-snapshot.mjs` (upsert by id then slug/key, dependency order
categories→businesses→reviews, re-links relations by key against the target DB, preserves ids).
Verified: export clean (no leads/subscriptions/users/owner/menuPdf); fresh-DB migrate+import
rebuilt 10 categories / 20 businesses / 3 reviews with 20/20 + 3/3 relations linked and drafts
present; re-run is idempotent (0 created). Run on demand after editorial changes; no live hook.

## Goal
Version-control the hard-to-recreate editorial content (especially the written reviews) and provide a
repo-only restore path. **Secondary** to PocketBase scheduled backups, which protect everything.

## Scope
- A script that exports **businesses, reviews, categories** from PocketBase to committed JSON (e.g.
  `pocketbase/snapshots/*.json`). Run after meaningful editorial changes — a periodic snapshot, not a
  live mirror.
- A matching import/restore path that can rebuild content into a fresh PocketBase.

## Guardrails — SCOPE STRICTLY
- Export ONLY editorial/public content. **Never** export `leads`, `subscriptions`, or `users` —
  customer PII, payment status, and password hashes must never land in git.

## Acceptance
- Running the export commits up-to-date businesses/reviews/categories JSON, with no PII/secrets.
- Content can be restored from the snapshot if PocketBase data is lost.

## Prerequisite
Confirm PocketBase **scheduled backups** are ON (Settings → Backups, ideally to S3) — that's the primary
durability layer; this snapshot is the git-history/secondary one.
