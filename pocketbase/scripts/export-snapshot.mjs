// Editorial content snapshot — EXPORT.
// ---------------------------------------------------------------------------
// Git-tracked, diff-able copy of the hard-to-recreate editorial content
// (businesses, reviews, categories — INCLUDING drafts). Secondary to the S3
// scheduled backups (which protect everything incl. media binaries); this is the
// version-controlled text/data copy with a repo-only restore path.
//
// SCOPE — strictly editorial. NEVER exports leads / subscriptions / users
// (customer PII, payment status, password hashes). Omits businesses.owner (points
// at users; re-assigned by admin on restore) and businesses.menuPdf (a media
// binary, covered by S3). Illustration NAMES are plain strings and travel fine.
//
// Relations are stored by STABLE KEY (categoryKey, businessSlug) plus the id, so a
// restore re-links them without orphaning. Records are sorted and keys emitted in
// a fixed order so git diffs stay clean.
//
//   node scripts/export-snapshot.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");

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

// Keep only allowlisted keys, in the given order; drop "", null, undefined, [].
// (false and 0 are kept — published:false and cap:0 are meaningful.)
function pick(obj, keys) {
  const o = {};
  for (const k of keys) {
    const v = obj[k];
    if (v === "" || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    o[k] = v;
  }
  return o;
}

const CATEGORY_KEYS = ["id", "key", "label", "color", "sellable", "cap", "order"];
const BUSINESS_KEYS = [
  "id", "slug", "name", "categoryKey", "tier", "lat", "lng", "address",
  "rating", "ratingCount", "priceTier", "tagline", "description", "illo",
  "hours", "phone", "whatsapp", "website", "reviewSlug", "published",
]; // NOTE: deliberately excludes owner + menuPdf
const REVIEW_KEYS = [
  "id", "slug", "businessSlug", "published", "comingSoon", "name", "category",
  "rating", "cardIllo", "dek", "dekEs", "title", "eyebrow", "lede", "author",
  "authorInitial", "date", "readTime", "ratingLabel", "leadIllo", "leadCaption",
  "body", "essentials",
];

function writeSnapshot(name, records) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(records, null, 2) + "\n");
  console.log(`  ${name}.json — ${records.length} records`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  token = (await api("/api/collections/_superusers/auth-with-password", {
    method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).token;
  console.log("authenticated as admin; exporting editorial content (drafts included)\n");

  const categories = (await pbList("categories", { sort: "order,key" })).map((c) => pick(c, CATEGORY_KEYS));

  const businesses = (await pbList("businesses", { sort: "slug", expand: "category" }))
    .filter((b) => !b.osmId) // OSM-pull discovery drafts are reproducible via pull-coverage.mjs
    .map((b) => pick({ ...b, categoryKey: b.expand?.category?.key }, BUSINESS_KEYS))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const reviews = (await pbList("reviews", { sort: "slug", expand: "business" }))
    .map((r) => pick({ ...r, businessSlug: r.expand?.business?.slug }, REVIEW_KEYS))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  writeSnapshot("categories", categories);
  writeSnapshot("businesses", businesses);
  writeSnapshot("reviews", reviews);

  // Safety net: fail loudly if anything PII-ish slipped in.
  const blob = JSON.stringify({ categories, businesses, reviews });
  for (const bad of ["owner", "menuPdf", "passwordHash", "tokenKey", "@request"]) {
    if (blob.includes(`"${bad}"`)) throw new Error(`SNAPSHOT LEAK: found "${bad}" in export — aborting.`);
  }
  console.log("\n✓ snapshot written (no owner/menuPdf/PII)");
}

main().catch((e) => { console.error("\n✗ EXPORT FAILED:\n" + e.message); process.exit(1); });
