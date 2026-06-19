// Reproducible category model for Cuenca Maps.
// ---------------------------------------------------------------------------
// Two kinds of categories:
//   - sellable=false : free curated editorial/tourist categories. They power the
//     map's browsing and are NEVER capped or sold.
//   - sellable=true  : paid business categories. They carry a cap and appear as
//     purchasable slots on /list-your-business.
//
// Idempotent: upserts by `key`. The restaurants-cafes entry renames the old
// "food" category IN PLACE (preserves the record id) so existing food businesses
// stay linked to it — no re-pointing needed. Safe to re-run.
//
// Run AFTER setup-collections.mjs (which adds the `sellable` field).
//   node scripts/seed-categories.mjs

import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const CATEGORIES = [
  // Curated / tourist — kept, uncapped, not sold.
  { key: "landmark", label: "Landmarks & plazas", color: "#1e5fa8", sellable: false, cap: 0, order: 1 },
  { key: "market", label: "Markets", color: "#c0533b", sellable: false, cap: 0, order: 2 },
  { key: "museum", label: "Museums & culture", color: "#c2922f", sellable: false, cap: 0, order: 3 },
  { key: "outdoors", label: "Parks & views", color: "#4e7a52", sellable: false, cap: 0, order: 4 },
  // Paid business categories — capped, sold on /list-your-business.
  { key: "restaurants-cafes", label: "Restaurants & cafés", color: "#8c3f5e", sellable: true, cap: 12, order: 5, renameFrom: "food" },
  { key: "dental", label: "Dental", color: "#2f8f9d", sellable: true, cap: 3, order: 6 },
  { key: "real-estate", label: "Real estate", color: "#5b6b8c", sellable: true, cap: 3, order: 7 },
  { key: "visa-legal", label: "Visa & legal", color: "#7a5cad", sellable: true, cap: 3, order: 8 },
  { key: "tours", label: "Tours", color: "#d98324", sellable: true, cap: 4, order: 9 },
  { key: "bars", label: "Bars", color: "#b5476a", sellable: true, cap: 3, order: 10 },
];

let token = "";
async function api(p, opts = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status}\n${JSON.stringify(body, null, 2)}`);
  return body;
}

async function findByKey(key) {
  const r = await api(`/api/collections/categories/records?perPage=1&filter=${encodeURIComponent(`key="${key}"`)}`);
  return r.items[0] || null;
}

async function main() {
  token = (await api("/api/collections/_superusers/auth-with-password", {
    method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).token;

  for (const c of CATEGORIES) {
    const data = { key: c.key, label: c.label, color: c.color, sellable: c.sellable, cap: c.cap, order: c.order };
    let existing = await findByKey(c.key);
    if (!existing && c.renameFrom) existing = await findByKey(c.renameFrom);

    if (existing) {
      const u = await api(`/api/collections/categories/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) });
      const renamed = existing.key !== c.key ? ` (renamed from "${existing.key}")` : "";
      console.log(`updated  ${c.key} sellable=${c.sellable} cap=${c.cap}${renamed}`);
    } else {
      await api(`/api/collections/categories/records`, { method: "POST", body: JSON.stringify(data) });
      console.log(`created  ${c.key} sellable=${c.sellable} cap=${c.cap}`);
    }
  }

  console.log("\n✓ category model in place");
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
