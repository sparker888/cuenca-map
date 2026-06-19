# 03 — WhatsApp buttons + de-Googled directions
Status: backlog · Priority: P1

## Goal
Lean into WhatsApp (the dominant channel in Ecuador) with zero-API click-to-chat links, and stop
forcing Google Maps for directions.

## Scope
- Add a `whatsapp` field (phone, international format, no `+`/spaces) to the `businesses` collection
  (migration + owner-editable in task 01).
- **"Message on WhatsApp"** button on listing cards + review pages for businesses that have a number:
  `https://wa.me/<number>?text=<prefilled>`. A paid-tier value-add — feature it on Enhanced/Premium.
- **"Claim this listing" / waitlist** action that opens WhatsApp to **Alexa** (the sales channel) with
  a prefilled message, alongside the existing leads-form path.
- **"Share on WhatsApp"** on listings/reviews for organic spread in expat groups.
- **Directions:** keep them, but de-Google — use a `geo:` URI (opens the user's default maps app) or an
  OpenStreetMap directions link instead of hardcoding Google Maps. Card CTA becomes:
  **Directions + Message on WhatsApp + Website**.

## Guardrails
- Only render the WhatsApp button when the business has a `whatsapp` value.
- Keep with the no-Google-Maps design stance (CARTO/Leaflet already; directions shouldn't reintroduce it).

## Acceptance
- A business with a `whatsapp` number shows a working "Message on WhatsApp" button (prefilled chat).
- Directions open the device's default maps app, not forced Google Maps.
