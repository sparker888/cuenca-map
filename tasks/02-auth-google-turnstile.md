# 02 — Auth: Google OAuth + Cloudflare Turnstile
Status: backlog · Priority: P0

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

## Out of scope — WhatsApp login
There is no "Sign in with WhatsApp" OAuth provider. The only real option is phone + OTP over the
WhatsApp Business API (custom build) — deferred; not worth it for ~30 owners. Email + Google cover it.
