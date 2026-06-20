# 02 — Auth: Google OAuth + Cloudflare Turnstile
Status: DONE (2026-06-19) — Turnstile verified; Google OAuth enabled (provider live) · Priority: P0

Google OAuth ENABLED 2026-06-19 via `pocketbase/scripts/configure-oauth.mjs` (creds from .env,
stored in PB settings — not in the repo). Public auth-methods now lists the `google` provider with
scopes email+profile; the SDK uses redirect `https://cuenca-map-production.fly.dev/api/oauth2-redirect`.
Requires: that redirect URI authorized in the Google Cloud client, and the signing-in Google email
pre-created as an owner (the oauth-link-only hook rejects unknown emails). Real end-to-end Google
sign-in not self-tested (needs a real Google account); test with a pre-created real-email owner.

Done:
- Turnstile widget on owner login (`/owner`), waitlist (`/list-your-business`), and the
  /about contact form. Token sent as `X-Turnstile-Token`; verified server-side via
  Cloudflare siteverify in `pocketbase/pb_hooks/turnstile.pb.js` on leads-create and
  users password-auth. Secret in fly secret `TURNSTILE_SECRET_KEY`; site key in
  `PUBLIC_TURNSTILE_SITE_KEY` (public). Verified: missing/invalid token rejected (400),
  valid token accepted (success path tested via Cloudflare test secret round-trip).
- Email/password login works (owner portal, task 01).
- Google "Sign in with Google" button wired (`authWithOAuth2({provider:'google'})`).

Blocked on user:
- Google OAuth provider not yet enabled — needs a Google Cloud OAuth Web client
  (redirect URI https://cuenca-map-production.fly.dev/api/oauth2-redirect). Add
  GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET to .env and run
  `node pocketbase/scripts/configure-oauth.mjs`. Until then Google sign-in errors gracefully.

DEPLOY DEPENDENCY: set `PUBLIC_TURNSTILE_SITE_KEY` in Netlify and add the site's
hostnames to the Turnstile widget's allowlist — otherwise the widget won't render and
(since the backend now requires a token) all logins + form submits would be rejected.

## Goal
Owner login supporting email/password + "Sign in with Google", with Turnstile bot protection on
auth and on the public waitlist form.

## Scope
- **Google OAuth:** enable PocketBase's built-in Google OAuth2 provider on the `users` auth
  collection (Google Cloud OAuth client id/secret + PocketBase's redirect URL). Frontend uses
  `pb.collection('users').authWithOAuth2({ provider: 'google' })`.
- **Turnstile:** render the widget (site key) on (a) owner login/signup and (b) the public
  `/list-your-business` waitlist form. Verify the token **server-side** against Cloudflare's
  siteverify endpoint inside PocketBase hooks before allowing the action.
  - Use Cloudflare **test** keys for now; swap to production keys later.
  - Site key → Netlify/public env. Turnstile **secret** → fly secret (never client).

## Guardrails
- Turnstile verification must be server-side — a passing client token alone is not trust.
- No admin creds in the client. Google client secret + Turnstile secret live in fly secrets.

## Acceptance
- Owner can sign in with Google or email/password.
- Submitting the waitlist or auth without a valid Turnstile token is rejected server-side.

## Addendum — link-only Google OAuth (done 2026-06-19)
No public self-signup: `pocketbase/pb_hooks/oauth-link-only.pb.js` rejects any OAuth2 sign-in that
would CREATE a new `users` record (`e.isNewRecord`) — only pre-created owners can link. PocketBase's
Google provider only populates the verified email, so matching is on the verified address; unknown
emails → new record → 403 "not an approved owner". Existing email/password login unaffected. Hook
deployed and loads cleanly; full Google sign-in path remains untested until Google Cloud OAuth
credentials are provided (see configure-oauth.mjs).

## Out of scope — WhatsApp login
There is no "Sign in with WhatsApp" OAuth provider. The only real option is phone + OTP over the
WhatsApp Business API (custom build) — deferred; not worth it for ~30 owners. Email + Google cover it.
