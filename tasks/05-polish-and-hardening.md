# 05 — Polish & access-rule hardening
Status: backlog · Priority: P2

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
