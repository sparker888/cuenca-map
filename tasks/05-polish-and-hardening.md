# 05 — Polish & access-rule hardening
Status: Part A + Part B done (2026-06-20) · Priority: P2

Part A (access-rule hardening): events_specials + media public reads now require
business.published = true (owner/admin still see their own drafts). businesses/reviews/
categories already gated. Verified anonymously: unpublished-business specials/media return
nothing; published still read; owner sees own drafts. setup-collections + migration; fresh-DB
validated. (Also fixed gen-migration to strip oauth2 — redacted clientSecret was breaking
fresh-DB import.)

Part B (price tier): businesses.priceTier select ($/$$/$$$), optional. Owner-editable
(enhanced/premium) in /owner, admin any. Rendered next to the category on map panel + review
page + review cards; absent = nothing. Verified owner can set it (PATCH 200) and it renders.

## Scope
- Gate `media` and `events_specials` public **read** to records whose parent business is published.
  (Today they're world-readable regardless of parent status — low-risk, but tighten it so a draft
  business's photos/specials aren't publicly fetchable.)
- Image handling/optimization for owner-uploaded photos (size limits, responsive variants).
- Optional: email notifications (new lead arrived; renewal reminder to admin).
- Confirm operational must-dos hold: `pb_data` on a mounted volume, single machine, scheduled backups
  ON, collections defined as committed migrations.

## Acceptance
- A draft (unpublished) business's `media` and `events_specials` are not publicly readable.
- Owner photo uploads are size-bounded and served at sensible dimensions.
