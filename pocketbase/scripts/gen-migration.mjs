// Exports the live (non-system) collection schema and writes it as a committed
// PocketBase migration, so a fresh instance reproduces the exact schema on boot.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";
const STAMP = process.env.STAMP; // unix seconds, passed in for determinism

const KEEP = ["categories", "users", "businesses", "reviews", "media", "events_specials", "leads", "subscriptions"];

const token = (await (await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
})).json()).token;

const all = (await (await fetch(`${BASE}/api/collections?perPage=200`, { headers: { Authorization: token } })).json()).items;
const snapshot = KEEP.map((n) => all.find((c) => c.name === n)).filter(Boolean);

// Strip oauth2 provider config: PocketBase redacts clientSecret in exports, so a
// fresh-DB import of an enabled provider with a blank secret fails validation.
// OAuth is environment/secret config, not committed schema — it's (re)enabled by
// configure-oauth.mjs from .env. Keep the migration to pure schema.
for (const c of snapshot) {
  if (c.oauth2) c.oauth2 = { enabled: false, providers: [] };
}

const file = path.join(here, "..", "pb_migrations", `${STAMP}_cuenca_collections.js`);
const out = `/// <reference path="../pb_data/types.d.ts" />

// Cuenca Maps schema — generated from the live instance. Applied automatically
// on boot via PocketBase automigrate; reproduces the full schema on a fresh DB.
// deleteMissing=false, so this safely no-ops on an instance that already has it.
migrate((app) => {
  const snapshot = ${JSON.stringify(snapshot, null, 2)};
  app.importCollections(snapshot, false);
}, (app) => {
  const names = ${JSON.stringify(KEEP.filter((n) => n !== "users"))};
  for (const n of names) {
    try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {}
  }
});
`;
fs.writeFileSync(file, out);
console.log("wrote", path.basename(file), `(${snapshot.length} collections, ${out.length} bytes)`);
