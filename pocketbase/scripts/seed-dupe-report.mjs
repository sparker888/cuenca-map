// Seed vs OSM duplicate report — curation aid.
// ---------------------------------------------------------------------------
// The original ~20 hand-seeded places have no `osmId`, so they never deduped
// against the OSM discovery drafts. This finds the overlaps so Stephen can
// resolve each by hand (keep the curated original, delete the OSM dupe, or merge).
//
// Flags two kinds of overlap between a published no-osmId record (the "seed")
// and an osmId-bearing record (the "OSM draft"):
//   - NAME   : normalized names match (case/space/accent-insensitive)
//   - GEO    : within ~300 m and names are similar-ish (not exact) — a likely
//              same-place pair the name normalization missed.
//
// Writes (committed): snapshots/seed-dupe-report.{json,md}
// STRICTLY READ-ONLY — modifies/deletes nothing.
//
//   node scripts/seed-dupe-report.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");
const GEO_M = 300; // metres — close-match threshold for differing names

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();

// haversine, metres
function distM(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

async function main() {
  let token = "";
  const api = async (p) => {
    const res = await fetch(`${BASE}${p}`, { headers: token ? { Authorization: token } : {} });
    const text = await res.text(); const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`GET ${p} -> ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  token = (await (await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })).json()).token;

  const catKey = {};
  for (const c of (await api("/api/collections/categories/records?perPage=200")).items) catKey[c.id] = c.key;

  // pull all businesses (paginate)
  const all = [];
  for (let page = 1; ; page++) {
    const r = await api(`/api/collections/businesses/records?perPage=500&page=${page}`);
    all.push(...r.items);
    if (page >= r.totalPages) break;
  }

  const seeds = all.filter((b) => b.published && !b.osmId && b.lat != null && b.lng != null);
  const osm = all.filter((b) => b.osmId && b.lat != null && b.lng != null);
  const view = (b) => ({
    id: b.id, name: b.name, category: catKey[b.category] || b.category,
    published: !!b.published, slug: b.slug, lat: b.lat, lng: b.lng,
  });

  const matches = [];
  for (const s of seeds) {
    const sn = norm(s.name);
    for (const o of osm) {
      const on = norm(o.name);
      const d = distM(s, o);
      let kind = null;
      if (sn && sn === on) kind = "NAME";
      else if (d <= GEO_M && (sn.includes(on) || on.includes(sn) ||
               sn.split(" ")[0] === on.split(" ")[0])) kind = "GEO";
      if (!kind) continue;
      matches.push({ kind, distanceM: d, seed: view(s), osmDraft: { ...view(o), osmId: o.osmId } });
    }
  }
  matches.sort((a, b) => (a.kind === b.kind ? a.distanceM - b.distanceM : a.kind.localeCompare(b.kind)));

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "seed-dupe-report.json"), JSON.stringify({
    generated: { seedsScanned: seeds.length, osmRecordsScanned: osm.length, geoThresholdM: GEO_M },
    note: "Read-only. Each pair: a published no-osmId seed overlapping an osmId record. Resolve by hand.",
    matches,
  }, null, 2) + "\n");

  const md = matches.map((m) =>
    `| ${m.kind} | ${m.distanceM} m | ${m.seed.name} | ${m.seed.category} \`${m.seed.id}\` | ` +
    `${m.osmDraft.name} | ${m.osmDraft.category} (pub=${m.osmDraft.published}) \`${m.osmDraft.id}\` |`
  ).join("\n");
  fs.writeFileSync(path.join(OUT, "seed-dupe-report.md"), `# Seed vs OSM duplicate report (curation aid)

Read-only. ${matches.length} overlap(s) between published hand-seeded records (no \`osmId\`) and
OSM-imported records. **NAME** = normalized names match exactly. **GEO** = within ${GEO_M} m with a
similar name. Resolve each by hand — usually keep the curated seed, delete the OSM draft, or merge.

Scanned ${seeds.length} published no-osmId seeds against ${osm.length} osmId records.

| Match | Dist | Seed (keep?) | Seed cat \`id\` | OSM record | OSM cat \`id\` |
|---|---|---|---|---|---|
${md || "| — | — | _no overlaps found_ | | | |"}
`);

  console.log(`seed-dupe-report: ${matches.length} overlap(s) (${seeds.length} seeds × ${osm.length} osm records).`);
  for (const m of matches) console.log(`  [${m.kind} ${m.distanceM}m] ${m.seed.name} (${m.seed.category}) ⇄ ${m.osmDraft.name} (${m.osmDraft.category})`);
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
