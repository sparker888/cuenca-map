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
- **Directions:** don't *force* Google, but don't degrade the UX to avoid it. Primary "Directions"
  action = a `geo:<lat>,<lng>` link (opens the device's default maps app — Google on Android, Apple
  on iOS). Also surface an explicit **Apple Maps** link
  (`https://maps.apple.com/?ll=<lat>,<lng>&q=<name>`) as a visible secondary. A Google Maps link is
  fine as an additional option — just never the only/forced one. Card CTA:
  **Directions + Message on WhatsApp + Website**.

## Guardrails
- Only render the WhatsApp button when the business has a `whatsapp` value.
- The base map stays no-Google (CARTO/Leaflet). For *directions* specifically, Google may appear as one
  option among others — just never the forced/only one (see the revised Directions bullet).

## Acceptance
- A business with a `whatsapp` number shows a working "Message on WhatsApp" button (prefilled chat).
- Directions resolve to the device's default maps app via `geo:`, and an Apple Maps link is available;
  Google is offered but never the forced or only option.
