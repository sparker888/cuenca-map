/// <reference path="../pb_data/types.d.ts" />

// Link-only Google OAuth (no public self-signup).
// ---------------------------------------------------------------------------
// Owners are created by admin; there is no public signup. By default PocketBase
// OAuth2 CREATES a new users record on first sign-in for an unknown email, which
// would let any Google user mint an account. This hook rejects that: OAuth may
// only LINK to a pre-created owner. Existing accounts link normally.
//
// PocketBase links an OAuth identity to an existing user by the provider's
// VERIFIED email (the Google provider only populates oAuth2User.email when
// Google reports email_verified=true). If no user matches, e.isNewRecord is true.
//
// JSVM note: handler runs in an isolated scope — everything inlined.

onRecordAuthWithOAuth2Request((e) => {
  // No match for the Google-verified email -> PocketBase would create a new user.
  if (e.isNewRecord) {
    throw new ForbiddenError("This Google account isn't an approved owner. Ask Cuenca Maps to set you up first.");
  }
  // Defensive: require a verified email came back from the provider.
  if (!e.oAuth2User || !e.oAuth2User.email) {
    throw new ForbiddenError("Your Google email could not be verified.");
  }
  e.next();
}, "users");
