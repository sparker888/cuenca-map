// Enable PocketBase's built-in Google OAuth2 provider on the `users` collection.
// ---------------------------------------------------------------------------
// Requires a Google Cloud OAuth 2.0 Client (Web application):
//   - Authorized redirect URI:
//       https://cuenca-map-production.fly.dev/api/oauth2-redirect
//   - Put the credentials in the repo-root .env (git-ignored):
//       GOOGLE_OAUTH_CLIENT_ID=...
//       GOOGLE_OAUTH_CLIENT_SECRET=...
// Then run:  node scripts/configure-oauth.mjs
//
// The client secret is read from .env and pushed to PocketBase's settings; it is
// never committed. Re-runnable (idempotent — it overwrites the google provider).

import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.\n" +
      "Create a Google OAuth Web client (redirect URI: " +
      BASE + "/api/oauth2-redirect) and add the credentials to .env first."
  );
  process.exit(1);
}

async function api(p, opts = {}, tok) {
  const res = await fetch(`${BASE}${p}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(tok ? { Authorization: tok } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status}\n${JSON.stringify(body, null, 2)}`);
  return body;
}

const token = (await api("/api/collections/_superusers/auth-with-password", {
  method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
})).token;

const users = await api("/api/collections/users", {}, token);
const existing = (users.oauth2?.providers || []).filter((p) => p.name !== "google");

const updated = await api(`/api/collections/${users.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    oauth2: {
      enabled: true,
      providers: [...existing, { name: "google", clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }],
    },
  }),
}, token);

const names = (updated.oauth2?.providers || []).map((p) => p.name);
console.log(`✓ users.oauth2 enabled=${updated.oauth2?.enabled} providers=[${names.join(", ")}]`);
