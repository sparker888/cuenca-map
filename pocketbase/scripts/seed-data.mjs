// Seeds the live Cuenca Maps PocketBase from the repo's authoritative TS data
// (src/data/places.ts, src/data/reviews.ts). Idempotent: upserts by slug, so
// re-running updates records in place rather than duplicating.
//
// Usage: node scripts/seed-data.mjs   (run from the pocketbase/ dir)

import esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

// Per-category total listing slots (powers "X of N slots remaining").
// Placeholder business numbers — adjust freely in the admin UI later.
const CATEGORY_CAPS = { landmark: 8, market: 6, museum: 6, outdoors: 8, food: 12 };
const CATEGORY_ORDER = { landmark: 1, market: 2, museum: 3, outdoors: 4, food: 5 };

async function loadTs(relPath, names) {
  const result = await esbuild.build({
    entryPoints: [path.join(repoRoot, relPath)],
    bundle: true, format: "esm", write: false, platform: "node", logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  const mod = await import("data:text/javascript," + encodeURIComponent(code));
  return names.reduce((acc, n) => ((acc[n] = mod[n]), acc), {});
}

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

async function findBySlug(coll, slug) {
  const r = await api(`/api/collections/${coll}/records?perPage=1&filter=${encodeURIComponent(`slug="${slug}"`)}`);
  return r.items[0] || null;
}

async function upsertBySlug(coll, slug, data) {
  const existing = await findBySlug(coll, slug);
  if (existing) {
    const u = await api(`/api/collections/${coll}/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) });
    return { rec: u, action: "updated" };
  }
  const c = await api(`/api/collections/${coll}/records`, { method: "POST", body: JSON.stringify(data) });
  return { rec: c, action: "created" };
}

async function main() {
  const { places, categoryMeta } = await loadTs("src/data/places.ts", ["places", "categoryMeta"]);
  const { reviews } = await loadTs("src/data/reviews.ts", ["reviews"]);
  console.log(`loaded ${places.length} places, ${reviews.length} reviews\n`);

  token = (await api("/api/collections/_superusers/auth-with-password", {
    method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).token;

  // Clean up the connectivity-test lead if present
  try {
    const leads = await api(`/api/collections/leads/records?perPage=50&filter=${encodeURIComponent('name="Connectivity Test"')}`);
    for (const l of leads.items) await api(`/api/collections/leads/records/${l.id}`, { method: "DELETE" });
    if (leads.items.length) console.log(`removed ${leads.items.length} test lead(s)\n`);
  } catch {}

  // 1) categories (keyed by category key); collect id map for relations
  const catId = {};
  for (const [key, meta] of Object.entries(categoryMeta)) {
    const existing = (await api(`/api/collections/categories/records?perPage=1&filter=${encodeURIComponent(`key="${key}"`)}`)).items[0] || null;
    const data = { key, label: meta.label, color: meta.color, cap: CATEGORY_CAPS[key] ?? 0, order: CATEGORY_ORDER[key] ?? 0 };
    let rec;
    if (existing) rec = await api(`/api/collections/categories/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) });
    else rec = await api(`/api/collections/categories/records`, { method: "POST", body: JSON.stringify(data) });
    catId[key] = rec.id;
    console.log(`  category ${key} -> ${rec.id}`);
  }

  // 2) businesses (slug = place.id). Seeded data is live, so published = true.
  const bizId = {}; // place.id -> business record id
  let bc = { created: 0, updated: 0 };
  for (const p of places) {
    const data = {
      slug: p.id, name: p.name, category: catId[p.category], tier: p.tier,
      lat: p.lat, lng: p.lng, address: p.address ?? "", rating: p.rating ?? null,
      ratingCount: p.ratingCount ?? null, tagline: p.tagline ?? "", description: p.description ?? "",
      illo: p.illo ?? "", hours: p.hours ?? [], phone: p.phone ?? "", website: p.website ?? "",
      reviewSlug: p.reviewSlug ?? "", published: true,
    };
    const { rec, action } = await upsertBySlug("businesses", p.id, data);
    bizId[p.id] = rec.id; bc[action]++;
  }
  console.log(`\n  businesses: ${bc.created} created, ${bc.updated} updated`);

  // 3) reviews (slug). business relation resolved via placeId.
  let rcount = { created: 0, updated: 0 };
  for (const rv of reviews) {
    const data = {
      slug: rv.slug, business: bizId[rv.placeId] ?? "", published: !!rv.published,
      // In the source data, an unpublished review is a teaser ("coming soon" card).
      comingSoon: !rv.published,
      name: rv.name, category: rv.category ?? "", rating: rv.rating ?? null,
      cardIllo: rv.cardIllo ?? "", dek: rv.dek ?? "", dekEs: rv.dekEs ?? "",
      title: rv.title ?? "", eyebrow: rv.eyebrow ?? "", lede: rv.lede ?? "",
      author: rv.author ?? "", authorInitial: rv.authorInitial ?? "", date: rv.date ?? "",
      readTime: rv.readTime ?? "", ratingLabel: rv.ratingLabel ?? "",
      leadIllo: rv.leadIllo ?? "", leadCaption: rv.leadCaption ?? "",
      body: rv.body ?? [], essentials: rv.essentials ?? null,
    };
    const { action } = await upsertBySlug("reviews", rv.slug, data);
    rcount[action]++;
  }
  console.log(`  reviews: ${rcount.created} created, ${rcount.updated} updated`);

  console.log("\n✓ seed complete");
}

main().catch((e) => { console.error("\n✗ SEED FAILED:\n" + e.message); process.exit(1); });
