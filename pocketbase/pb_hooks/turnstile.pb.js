/// <reference path="../pb_data/types.d.ts" />

// Cloudflare Turnstile server-side verification.
// ---------------------------------------------------------------------------
// A passing client token is not trust — we re-verify it here against Cloudflare's
// siteverify endpoint before allowing the action:
//   (a) public waitlist / contact  -> leads create
//   (b) owner login                 -> users auth-with-password
// The browser sends the widget token in the `X-Turnstile-Token` header.
//
// Secret comes from the fly secret TURNSTILE_SECRET_KEY (never client-exposed).
// If the secret is unset, verification is skipped (safe for local/dev).
//
// JSVM note: handlers run in isolated scopes — the verify logic is inlined in each.

// (a) Waitlist / contact form -> leads
onRecordCreateRequest((e) => {
  const secret = $os.getenv("TURNSTILE_SECRET_KEY");
  if (secret) {
    // RequestInfo.headers are normalized: lowercased, "-" -> "_".
    const token = e.requestInfo().headers["x_turnstile_token"];
    if (!token) throw new BadRequestError("Captcha required.");
    const res = $http.send({
      url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "secret=" + encodeURIComponent(secret) + "&response=" + encodeURIComponent(token),
      timeout: 10,
    });
    if (!res.json || !res.json.success) throw new BadRequestError("Captcha verification failed.");
  }
  e.next();
}, "leads");

// (b) Owner login -> users password auth
onRecordAuthWithPasswordRequest((e) => {
  const secret = $os.getenv("TURNSTILE_SECRET_KEY");
  if (secret) {
    // RequestInfo.headers are normalized: lowercased, "-" -> "_".
    const token = e.requestInfo().headers["x_turnstile_token"];
    if (!token) throw new BadRequestError("Captcha required.");
    const res = $http.send({
      url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "secret=" + encodeURIComponent(secret) + "&response=" + encodeURIComponent(token),
      timeout: 10,
    });
    if (!res.json || !res.json.success) throw new BadRequestError("Captcha verification failed.");
  }
  e.next();
}, "users");
