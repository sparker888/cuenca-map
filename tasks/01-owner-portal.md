# 01 — Owner self-serve portal
Status: backlog · Priority: P0 · Depends on: 02 (auth)

## Goal
A browser page where a logged-in business owner manages their own listing — the self-service that
the Enhanced/Premium tiers actually sell.

## Scope
- Auth as the **owner** via PocketBase (see task 02 for Google OAuth + Turnstile). Owners are
  created/assigned by admin; no public self-signup into the owner role.
- One config page, fields gated by the business's **tier**:
  - **Enhanced:** tagline, description, hours, phone, website, photos, specials/events.
  - **Premium:** + menu PDF + photo gallery.
  - **Free:** no owner editing.
- Specials/events editor: create / edit / deactivate `events_specials` for their own business.
- Media upload (photos; premium: menu PDF) via PocketBase `file` fields, within tier limits.
- Subscription status shown **read-only** (tier, paid_through) — never editable by the owner.
- The `whatsapp` field (task 03) is editable here too.

## Guardrails
- Owner sees/edits ONLY their own business(es) — enforce via PocketBase collection rules
  (`@request.auth.id`), not just the UI.
- The page authenticates as the owner; it must **never** hold admin credentials.
- Owners cannot change tier/status/category/owner, and cannot edit the review body (view only).

## Acceptance
- Owner logs in, sees only their listing, edits tier-appropriate fields, uploads a photo +
  (premium) a menu PDF, and adds a special that appears live with no rebuild.
- A second owner cannot read or edit the first owner's listing (rule-enforced, not just hidden).
