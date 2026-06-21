// Coverage seed + prospect list — OSM/Overpass pull.
// ---------------------------------------------------------------------------
// Pulls Cuenca POIs from OpenStreetMap (ODbL, openly licensed — safe to persist
// and publish on our own map). Normalizes to our taxonomy, dedups by OSM id.
//
// Writes (committed):
//   - coverage-counts.{json,md}  — FULL comprehensive counts (backstop) + the
//     quality-ranked SELECTION counts.
//   - service-candidates.json    — services (dental/real-estate/visa-legal),
//     vetting list only, NOT imported.
//   - coverage-selected.json     — the curated discovery set chosen for import
//     (the import manifest / prospect subset).
//
// SELECTION (per the coverage decision): quality-rank by OSM completeness
// (maintained-tag richness) — Google rating/reviews would refine this but needs an
// API key (future). Then spread across neighborhood grid cells (round-robin) and
// take ~TARGETS per category. fast_food/food_court are counted (backstop) but
// excluded from the selection (low signal).
//
// With --import: upserts the SELECTED discovery into `businesses` as tier=free,
// published=false (draft), basic fields only, idempotent by osmId. Stephen reviews
// and publishes; nothing auto-goes-live. Services are never imported.
//
// Google Places omitted (key + terms forbid publishing on a competing map). OSM only.
//
//   node scripts/pull-coverage.mjs            # pull + write reports (no DB writes)
//   node scripts/pull-coverage.mjs --import   # also import the selected discovery drafts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");
const DO_IMPORT = process.argv.includes("--import");

const BBOX = "-2.965,-79.075,-2.845,-78.945"; // S,W,N,E — matches the map's maxBounds
const OVERPASS = "https://overpass-api.de/api/interpreter";

const DISCOVERY = {
  restaurant: "restaurants-cafes", cafe: "restaurants-cafes",
  fast_food: "restaurants-cafes", food_court: "restaurants-cafes", // counted but low-signal
  bar: "bars", pub: "bars", nightclub: "bars", biergarten: "bars",
};
const LOW_SIGNAL = new Set(["fast_food", "food_court"]);
const SERVICE = { dentist: "dental", estate_agent: "real-estate", lawyer: "visa-legal" };

// curated targets for the draft import (spread + quality)
const TARGETS = { "restaurants-cafes": 180, bars: 40, tours: 30 };
// grid cell ~0.02° (~2.2 km) for neighborhood spread
const CELL = 0.02;
// OSM tags that signal a real, maintained listing (completeness score)
const QUALITY = {
  website: 2, "contact:website": 2, phone: 2, "contact:phone": 2,
  opening_hours: 1, cuisine: 1, "addr:street": 1, "addr:housenumber": 1,
  email: 1, "contact:email": 1, stars: 1, wheelchair: 1, outdoor_seating: 1, description: 1,
};

function classify(t) {
  const a = t.amenity;
  if (a && DISCOVERY[a]) return { kind: "discovery", category: DISCOVERY[a], lowSignal: LOW_SIGNAL.has(a) };
  if (t.shop === "travel_agency") return { kind: "discovery", category: "tours", lowSignal: false };
  if (a === "dentist" || t.healthcare === "dentist") return { kind: "service", category: "dental" };
  if (t.office === "estate_agent") return { kind: "service", category: "real-estate" };
  if (t.office === "lawyer") return { kind: "service", category: "visa-legal" };
  return null;
}
const scoreTags = (t) => Object.entries(QUALITY).reduce((s, [k, w]) => (t[k] ? s + w : s), 0);
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
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(OVERPASS_Q),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const els = (await res.json()).elements;

  const discovery = [], service = [], seen = new Set();
  for (const e of els) {
    const t = e.tags || {};
    const name = (t.name || "").trim();
    if (!name) continue;
    const cls = classify(t);
    if (!cls) continue;
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const osmId = `${e.type}/${e.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const rec = {
      osmId, name, category: cls.category,
      address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ").trim(),
      lat: +(+lat).toFixed(7), lng: +(+lng).toFixed(7),
      phone: t.phone || t["contact:phone"] || "",
      website: t.website || t["contact:website"] || "",
      slug: slugify(name) ? `${slugify(name)}-${e.id}` : `osm-${e.type}-${e.id}`,
      score: scoreTags(t),
    };
    if (cls.kind === "discovery") { rec.lowSignal = !!cls.lowSignal; discovery.push(rec); }
    else service.push(rec);
  }
  return { discovery, service };
}

// quality-rank + neighborhood-spread (round-robin across grid cells) up to target
function selectSpread(records, target) {
  const cells = new Map();
  for (const r of records) {
    const key = `${Math.floor(r.lat / CELL)},${Math.floor(r.lng / CELL)}`;
    (cells.get(key) || cells.set(key, []).get(key)).push(r);
  }
  for (const arr of cells.values()) arr.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const cellArrs = [...cells.values()];
  const picked = [];
  let progress = true;
  while (picked.length < target && progress) {
    progress = false;
    for (const arr of cellArrs) {
      if (arr.length) { picked.push(arr.shift()); progress = true; if (picked.length >= target) break; }
    }
  }
  return picked;
}

function countBy(arr) { const c = {}; for (const r of arr) c[r.category] = (c[r.category] || 0) + 1; return c; }

function select(discovery) {
  const out = [];
  for (const [cat, target] of Object.entries(TARGETS)) {
    const pool = discovery.filter((r) => r.category === cat && !r.lowSignal);
    out.push(...selectSpread(pool, target));
  }
  out.sort((a, b) => a.category.localeCompare(b.category) || b.score - a.score || a.name.localeCompare(b.name));
  return out;
}

function writeReports(discovery, service, selected) {
  fs.mkdirSync(OUT, { recursive: true });
  const full = countBy(discovery), sel = countBy(selected), svc = countBy(service);
  const lowSignal = discovery.filter((r) => r.lowSignal).length;

  fs.writeFileSync(path.join(OUT, "coverage-counts.json"), JSON.stringify({
    source: "OpenStreetMap via Overpass (ODbL)", bbox: BBOX,
    discoveryFull: { byCategory: full, total: discovery.length, lowSignalExcludedFromSelection: lowSignal },
    selectedForImport: { byCategory: sel, total: selected.length, ranking: "OSM completeness + neighborhood spread", targets: TARGETS },
    serviceCandidates: { byCategory: svc, total: service.length },
  }, null, 2) + "\n");

  const rows = (o) => Object.entries(o).sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  fs.writeFileSync(path.join(OUT, "coverage-counts.md"), `# Cuenca coverage counts (OSM/Overpass, ODbL)

bbox \`${BBOX}\` (S,W,N,E). Ranking for the selection = OSM completeness (Google rating/reviews would
refine this — needs an API key). Neighborhood spread via ~2km grid cells, round-robin.

## Discovery — FULL comprehensive (backstop)
| Category | Count |
|---|---|
${rows(full)}
| **Total** | **${discovery.length}** |

(fast_food/food_court counted above but excluded from the selection: ${lowSignal})

## Selected for draft import (tier=free, published=false)
| Category | Count |
|---|---|
${rows(sel)}
| **Total** | **${selected.length}** |

## Service candidates (NOT published — Stephen vets)
| Category | Count |
|---|---|
${rows(svc)}
| **Total** | **${service.length}** |
`);

  const strip = ({ lowSignal, ...r }) => r;
  fs.writeFileSync(path.join(OUT, "coverage-selected.json"), JSON.stringify(selected.map(strip), null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "service-candidates.json"), JSON.stringify(service.map(strip), null, 2) + "\n");

  console.log("reports written.");
  console.log("  discovery full:", full, "→", discovery.length, `(low-signal ${lowSignal})`);
  console.log("  selected      :", sel, "→", selected.length);
  console.log("  services      :", svc, "→", service.length);
}

async function importDiscovery(selected) {
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

  let created = 0, updated = 0;
  for (const r of selected) {
    const data = { slug: r.slug, name: r.name, category: catId[r.category], lat: r.lat, lng: r.lng, address: r.address, tier: "free", published: false, osmId: r.osmId };
    const f = encodeURIComponent(`osmId="${r.osmId}"`);
    const existing = (await api(`/api/collections/businesses/records?perPage=1&filter=${f}`)).items[0];
    if (existing) { await api(`/api/collections/businesses/records/${existing.id}`, { method: "PATCH", body: JSON.stringify(data) }); updated++; }
    else { await api("/api/collections/businesses/records", { method: "POST", body: JSON.stringify(data) }); created++; }
    if ((created + updated) % 50 === 0) console.log(`  …${created + updated}/${selected.length}`);
  }
  console.log(`import: ${created} created, ${updated} updated (drafts, published=false)`);
}

async function main() {
  console.log("pulling OSM/Overpass…");
  const { discovery, service } = await pullOSM();
  const selected = select(discovery);
  writeReports(discovery, service, selected);
  if (DO_IMPORT) { console.log("\nimporting selected discovery as drafts…"); await importDiscovery(selected); }
  else console.log("\n(reports only — re-run with --import to load the selected discovery drafts)");
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
