// Coverage seed + prospect list — OSM/Overpass pull.
// ---------------------------------------------------------------------------
// Pulls Cuenca POIs from OpenStreetMap (ODbL, openly licensed — safe to persist
// and publish on our own map). Normalizes to our taxonomy, dedups by OSM id, and
// writes:
//   - pocketbase/snapshots/coverage-counts.{json,md}  (per-category counts)
//   - pocketbase/snapshots/service-candidates.json    (services — vetting list, NOT imported)
//
// With --import: upserts DISCOVERY records (restaurants-cafes / bars / tours) into
// `businesses` as tier=free, published=false (draft), basic fields only, idempotent
// by osmId. Stephen reviews and flips `published`; nothing auto-goes-live.
//
// Google Places is intentionally NOT used: it needs an API key and its terms
// forbid persisting/publishing Places content on a competing map. OSM only.
//
//   node scripts/pull-coverage.mjs            # pull + write reports (no DB writes)
//   node scripts/pull-coverage.mjs --import   # also import discovery drafts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");
const DO_IMPORT = process.argv.includes("--import");

// S,W,N,E — matches the map's maxBounds so we only pull within the product area.
const BBOX = "-2.965,-79.075,-2.845,-78.945";
const OVERPASS = "https://overpass-api.de/api/interpreter";

// amenity/shop value -> our category
const DISCOVERY = {
  restaurant: "restaurants-cafes", cafe: "restaurants-cafes", fast_food: "restaurants-cafes", food_court: "restaurants-cafes",
  bar: "bars", pub: "bars", nightclub: "bars", biergarten: "bars",
};
const SERVICE = { dentist: "dental", estate_agent: "real-estate", lawyer: "visa-legal" };

function classify(t) {
  const a = t.amenity;
  if (a && DISCOVERY[a]) return { kind: "discovery", category: DISCOVERY[a] };
  if (t.shop === "travel_agency") return { kind: "discovery", category: "tours" };
  if (a === "dentist" || t.healthcare === "dentist") return { kind: "service", category: "dental" };
  if (t.office === "estate_agent") return { kind: "service", category: "real-estate" };
  if (t.office === "lawyer") return { kind: "service", category: "visa-legal" };
  return null;
}

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

const OVERPASS_Q = `[out:json][timeout:120];(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|nightclub|biergarten|dentist)$"](${BBOX});
  nwr["shop"="travel_agency"](${BBOX});
  nwr["healthcare"="dentist"](${BBOX});
  nwr["office"~"^(estate_agent|lawyer)$"](${BBOX});
);out tags center;`;

async function pullOSM() {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(OVERPASS_Q),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const els = (await res.json()).elements;

  const discovery = [], service = [];
  const seen = new Set();
  for (const e of els) {
    const t = e.tags || {};
    const name = (t.name || "").trim();
    if (!name) continue; // need a name to be a usable pin/prospect
    const cls = classify(t);
    if (!cls) continue;
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const osmId = `${e.type}/${e.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const address = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ").trim();
    const rec = {
      osmId, name, category: cls.category, address,
      lat: +(+lat).toFixed(7), lng: +(+lng).toFixed(7),
      phone: t.phone || t["contact:phone"] || "",
      website: t.website || t["contact:website"] || "",
      slug: slugify(name) ? `${slugify(name)}-${e.id}` : `osm-${e.type}-${e.id}`,
    };
    (cls.kind === "discovery" ? discovery : service).push(rec);
  }
  discovery.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  service.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { discovery, service };
}

function countBy(arr) {
  const c = {};
  for (const r of arr) c[r.category] = (c[r.category] || 0) + 1;
  return c;
}

function writeReports({ discovery, service }) {
  fs.mkdirSync(OUT, { recursive: true });
  const dCounts = countBy(discovery), sCounts = countBy(service);
  const counts = {
    source: "OpenStreetMap via Overpass (ODbL)",
    bbox: BBOX,
    discovery: { byCategory: dCounts, total: discovery.length },
    serviceCandidates: { byCategory: sCounts, total: service.length },
  };
  fs.writeFileSync(path.join(OUT, "coverage-counts.json"), JSON.stringify(counts, null, 2) + "\n");

  const row = (o) => Object.entries(o).sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  const md = `# Cuenca coverage counts (OSM/Overpass, ODbL)

bbox \`${BBOX}\` (S,W,N,E). Discovery = published-as-draft free pins; services = vetting candidates only.

## Discovery (import as draft free pins)
| Category | Count |
|---|---|
${row(dCounts)}
| **Total** | **${discovery.length}** |

## Service candidates (NOT published — Stephen vets)
| Category | Count |
|---|---|
${row(sCounts)}
| **Total** | **${service.length}** |
`;
  fs.writeFileSync(path.join(OUT, "coverage-counts.md"), md);

  // service candidates keep contact info for vetting (OSM-licensed, no PII)
  fs.writeFileSync(path.join(OUT, "service-candidates.json"), JSON.stringify(service, null, 2) + "\n");

  console.log("wrote coverage-counts.json / .md, service-candidates.json");
  console.log("  discovery:", dCounts, "→ total", discovery.length);
  console.log("  services :", sCounts, "→ total", service.length);
}

async function importDiscovery(discovery) {
  const { PB_URL: BASE, PB_ADMIN_EMAIL: EMAIL, PB_ADMIN_PASSWORD: PASSWORD } = await import("./_env.mjs");
  let token = "";
  const api = async (p, opts = {}) => {
    const res = await fetch(`${BASE}${p}`, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) } });
    const text = await res.text(); const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  token = (await api("/api/collections/_superusers/auth-with-password", { method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }) })).token;
  const catId = {};
  for (const c of (await api("/api/collections/categories/records?perPage=200")).items) catId[c.key] = c.id;

  let created = 0, updated = 0, skipped = 0;
  for (const r of discovery) {
    const cat = catId[r.category];
    if (!cat) { skipped++; continue; }
    // basic fields only (free pins are basic) — phone/website kept out of the record
    const data = { slug: r.slug, name: r.name, category: cat, lat: r.lat, lng: r.lng, address: r.address, tier: "free", published: false, osmId: r.osmId };
    const f = encodeURIComponent(`osmId="${r.osmId}"`);
    const existing = (await api(`/api/collections/businesses/records?perPage=1&filter=${f}`)).items[0];
    if (existing) { await api(`/api/collections/businesses/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) }); updated++; }
    else { await api("/api/collections/businesses/records", { method: "POST", body: JSON.stringify(data) }); created++; }
    if ((created + updated) % 100 === 0) console.log(`  …${created + updated} imported`);
  }
  console.log(`import: ${created} created, ${updated} updated, ${skipped} skipped (drafts, published=false)`);
}

async function main() {
  console.log("pulling OSM/Overpass…");
  const data = await pullOSM();
  writeReports(data);
  if (DO_IMPORT) {
    console.log("\nimporting discovery as drafts…");
    await importDiscovery(data.discovery);
  } else {
    console.log("\n(reports only — re-run with --import to load discovery drafts)");
  }
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
