# Tasks — Cuenca Maps backlog

Per-task briefs for Claude Code. Work in priority order; update **Status** as you go.
Conventions live in the root `CLAUDE.md` — keep schema/category changes reproducible
(migrations + seed scripts), and never put admin creds client-side.

| # | Task | Priority | Status |
|---|------|----------|--------|
| 01 | Owner self-serve portal | P0 | ✅ done (2026-06-19) |
| 02 | Auth: Google OAuth + Cloudflare Turnstile | P0 | ✅ done (2026-06-19) — Google OAuth enabled |
| 03 | WhatsApp buttons + de-Googled directions | P1 | ✅ done (2026-06-19) |
| 04 | Editorial content snapshot (git-tracked) | P1 | ✅ done (2026-06-20) |
| 05 | Polish & access-rule hardening | P2 | ✅ done (2026-06-20) — Parts A + B |
| 06 | Subscriptions: manual payment model | P0 | ✅ done (2026-06-19) |
| 07 | Coverage seed + prospect list (OSM pull) | P1 | ✅ done (2026-06-20) |
| 08 | Bulk-publish discovery drafts (curate-by-exclusion) | util | ✅ done (2026-06-20) |

Also done out-of-band: **STEP 0** tier-enum migration (standard/premium → free/enhanced/premium),
the **link-only Google OAuth** hook (task 02 addendum), and a security fix for an anonymous
draft-leak in owner-scoped rules (surfaced by task 07).

**All briefs in this folder are complete.** Outstanding items are operational/owner-side, not code:
- The 250 OSM discovery pins are now **published** (task 08) — curate by EXCLUSION: delete/unpublish
  the rejects in the PB admin. They're public on staging now; finish pruning before launch/promotion.
  (`publish-drafts.mjs --unpublish` reverts the whole set if needed.)
- Provide a Google Places API key if you want rating/review-weighted ranking (task 07 enrichment).
- Rotate the admin password via `flyctl secrets set` (see root `CLAUDE.md`).

Template for new tasks: Goal · Scope · Guardrails · Acceptance.
