// Editorial content snapshot — IMPORT / RESTORE.
// ---------------------------------------------------------------------------
// Reads pocketbase/snapshots/*.json and upserts into a PocketBase, idempotently,
// in dependency order (categories -> businesses -> reviews) so relations resolve.
// Matches existing records by id then by slug/key; creates new records preserving
// the snapshot id. Relations are re-linked by stable key (categoryKey/businessSlug)
// against the TARGET db, so ids never need to match across instances.
//
// owner + menuPdf are intentionally absent from the snapshot — ownership is
// re-assigned by admin, media is restored from S3. Run after `migrate` on a fresh
// instance (schema first), or any time to sync editorial content.
//
//   node scripts/import-snapshot.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SNAP = path.join(here, "..", "snapshots");

let token = "";
async function api(p, opts = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status}\n${JSON.stringify(body)}`);
  return body;
}
async function pbList(collection, params = {}) {
  const out = [];
  let page = 1;
  for (;;) {
    const qs = new URLSearchParams({ page: String(page), perPage: "200", ...params });
    const data = await api(`/api/collections/${collection}/records?${qs}`);
    out.push(...data.items);
    if (page >= data.totalPages || !data.items.length) break;
    page++;
  }
  return out;
}
const read = (name) => JSON.parse(fs.readFileSync(path.join(SNAP, `${name}.json`), "utf8"));

// Upsert: match existing by id, else by `matchField`; create preserving id.
async function upsert(collection, data, matchField, matchValue) {
  let existing = null;
  try { existing = await api(`/api/collections/${collection}/records/${data.id}`); } catch {}
  if (!existing && matchValue != null) {
    const f = encodeURIComponent(`${matchField}="${matchValue}"`);
    existing = (await api(`/api/collections/${collection}/records?perPage=1&filter=${f}`)).items[0] || null;
  }
  if (existing) {
    await api(`/api/collections/${collection}/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) });
    return { id: existing.id, action: "updated" };
  }
  const created = await api(`/api/collections/${collection}/records`, { method: "POST", body: JSON.stringify(data) });
  return { id: created.id, action: "created" };
}

async function main() {
  token = (await api("/api/collections/_superusers/auth-with-password", {
    method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).token;

  const categories = read("categories");
  const businesses = read("businesses");
  const reviews = read("reviews");
  const tally = (a) => `${a.filter((x) => x === "created").length} created, ${a.filter((x) => x === "updated").length} updated`;

  // 1) categories (match by key)
  const catActs = [];
  for (const c of categories) {
    const r = await upsert("categories", c, "key", c.key);
    catActs.push(r.action);
  }
  console.log("categories:", tally(catActs));

  // map category key -> target id (re-link businesses)
  const catId = {};
  for (const c of await pbList("categories")) catId[c.key] = c.id;

  // 2) businesses (match by slug; re-link category by key)
  const bizActs = [];
  for (const b of businesses) {
    const { categoryKey, ...rest } = b;
    const data = { ...rest, category: catId[categoryKey] || "" };
    const r = await upsert("businesses", data, "slug", b.slug);
    bizActs.push(r.action);
  }
  console.log("businesses:", tally(bizActs));

  // map business slug -> target id (re-link reviews)
  const bizId = {};
  for (const b of await pbList("businesses")) bizId[b.slug] = b.id;

  // 3) reviews (match by slug; re-link business by slug)
  const revActs = [];
  for (const r of reviews) {
    const { businessSlug, ...rest } = r;
    const data = { ...rest, business: bizId[businessSlug] || "" };
    const res = await upsert("reviews", data, "slug", r.slug);
    revActs.push(res.action);
  }
  console.log("reviews:", tally(revActs));

  console.log("\n✓ snapshot imported (relations re-linked by key)");
}

main().catch((e) => { console.error("\n✗ IMPORT FAILED:\n" + e.message); process.exit(1); });
