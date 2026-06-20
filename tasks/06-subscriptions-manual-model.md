# 06 — Subscriptions: manual payment model (reconcile to brief)
Status: done (2026-06-19) · Priority: P0 · Depends on: STEP 0 (tier enum, done)

## Goal
Reconcile `subscriptions` from a payment-processor shape to a **manual-payment** model so Alexa records
real payments (DeUna / cash / transfer) and the owner portal shows `tier` + `paid_through` + `status`.
No payment processor in v1.

## Target schema (implemented)
- `owner` (rel → users, required) — keep
- `business` (rel → businesses) — keep
- `tier` (select: free | enhanced | premium) — keep
- `period` (select: annual | monthly | quarterly) — added
- `amount` (number) — added
- `currency` (text; convention "USD" — PocketBase has no field-level default) — added
- `method` (select: deuna | transfer | cash | payphone | other) — added
- `paid_through` (date) — added (replaces `currentPeriodEnd`)
- `status` (select: active | grace | lapsed) — enum changed
- `notes` (text) — added
- `created` / `updated` (autodate) — keep
- removed: `provider`, `externalId`, `currentPeriodEnd`

## What was done
- `pocketbase/scripts/setup-collections.mjs` updated + migration regenerated; validated on a FRESH DB
  (schema reproduces exactly; status enum = active|grace|lapsed).
- **Data step skipped:** `subscriptions` had 0 rows (pre-launch), so no remap was needed.
- Owner portal (`/owner`) read-only panel re-pointed to `paid_through` (+ amount/currency/method);
  no `currentPeriodEnd`/`provider`/`externalId` references remain.
- Recording a payment is an admin action in the PB admin UI (create a row). create/update/delete
  rules stay null (superuser/admin only); owners only list/view their own (`owner = @request.auth.id`).

## Verified
- Admin created a row via API (period/amount/method/paid_through/status); owner saw tier + paid_through
  + status read-only in `/owner`; a second owner saw 0 subscriptions (isolation). Fresh-DB rebuild OK.
