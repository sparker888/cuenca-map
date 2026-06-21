// Bulk-publish (or unpublish) the OSM-imported discovery drafts.
// ---------------------------------------------------------------------------
// Flips `published` on the imported coverage pins so Stephen can curate by
// EXCLUSION (delete/unpublish rejects in the PB admin) instead of publishing 250
// records by hand.
//
// Scope is strict: ONLY businesses with osmId set AND tier=free — i.e. the
// OSM-pull discovery drafts. Never touches owner-created/editorial records, never
// tier!=free, never leads/subscriptions/users. Idempotent.
//
//   node scripts/publish-drafts.mjs              # published=false -> true
//   node scripts/publish-drafts.mjs --unpublish  # published=true  -> false (undo)

import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const UNPUBLISH = process.argv.includes("--unpublish");
const TARGET = !UNPUBLISH; // desired published value

let token = "";
async function api(p, opts = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}
async function pbAll(collection) {
  const out = [];
  let page = 1;
  for (;;) {
    const data = await api(`/api/collections/${collection}/records?page=${page}&perPage=200`);
    out.push(...data.items);
    if (page >= data.totalPages || !data.items.length) break;
    page++;
  }
  return out;
}

async function main() {
  token = (await api("/api/collections/_superusers/auth-with-password", {
    method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).token;

  // Strict scope, filtered client-side for reliability: OSM drafts only.
  const targets = (await pbAll("businesses")).filter(
    (b) => b.osmId && b.tier === "free" && b.published !== TARGET
  );

  let flipped = 0;
  for (const b of targets) {
    await api(`/api/collections/businesses/records/${b.id}`, { method: "PATCH", body: JSON.stringify({ published: TARGET }) });
    if (++flipped % 50 === 0) console.log(`  …${flipped}/${targets.length}`);
  }
  console.log(`${UNPUBLISH ? "unpublished" : "published"} ${flipped} OSM discovery pins (tier=free, osmId set).`);
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
