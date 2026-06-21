// Coverage seed + prospect list — OSM/Overpass pull.
// ---------------------------------------------------------------------------
// Pulls Cuenca POIs from OpenStreetMap (ODbL, openly licensed — safe to persist
// and publish on our own map). Normalizes to our taxonomy, dedups by OSM id.
//
// THREE classes:
//   - capped discovery (restaurants-cafes / bars / tours): quality-ranked by OSM
//     completeness + neighborhood spread, take ~TARGETS each (sellable categories).
//   - curated tourist (landmark / outdoors / market / museum): COMPREHENSIVE — take
//     all named results (sellable=false / cap=0, never sold, light curate-by-exclusion).
//   - services (dental / real-estate / visa-legal): vetting list only, NOT imported.
//
// Writes (committed):
//   - coverage-counts.{json,md}     full backstop + selection + curated + service counts
//   - coverage-selected.json        capped discovery import manifest
//   - coverage-curated.json         curated tourist import manifest
//   - service-candidates.json       services vetting list
//
// With --import: upserts capped-selection + curated into `businesses` as tier=free
// drafts, idempotent by osmId. SAFE-UPDATE: published/slug/tier are set on CREATE
// only — re-running never disturbs already-published or human-curated pins.
//
// Google Places omitted (needs key; terms forbid publishing on a competing map). OSM only.
//
//   node scripts/pull-coverage.mjs            # pull + write reports (no DB writes)
//   node scripts/pull-coverage.mjs --import   # also import drafts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");
const DO_IMPORT = process.argv.includes("--import");

const BBOX = "-2.965,-79.075,-2.845,-78.945"; // S,W,N,E — matches the map's maxBounds
const OVERPASS = "https://overpass-api.de/api/interpreter";

const FOOD = { restaurant: "restaurants-cafes", cafe: "restaurants-cafes", fast_food: "restaurants-cafes", food_court: "restaurants-cafes" };
const NIGHT = { bar: "bars", pub: "bars", nightclub: "bars", biergarten: "bars" };
const LOW_SIGNAL = new Set(["fast_food", "food_court"]);
const CAPPED = new Set(["restaurants-cafes", "bars", "tours"]);
const CURATED = new Set(["landmark", "outdoors", "market", "museum"]);

// curated targets for the capped import (spread + quality)
const TARGETS = { "restaurants-cafes": 180, bars: 40, tours: 30 };
const CELL = 0.02; // ~2.2km grid for neighborhood spread
const QUALITY = {
  website: 2, "contact:website": 2, phone: 2, "contact:phone": 2,
  opening_hours: 1, cuisine: 1, "addr:street": 1, "addr:housenumber": 1,
  email: 1, "contact:email": 1, stars: 1, wheelchair: 1, outdoor_seating: 1, description: 1,
};

// Returns { kind: "discovery"|"curated"|"service", category, lowSignal? } or null.
function classify(t) {
  const a = t.amenity;
  if (a && FOOD[a]) return { kind: "discovery", category: FOOD[a], lowSignal: LOW_SIGNAL.has(a) };
  if (a && NIGHT[a]) return { kind: "discovery", category: NIGHT[a], lowSignal: false };
  if (t.shop === "travel_agency") return { kind: "discovery", category: "tours", lowSignal: false };
  // services
  if (a === "dentist" || t.healthcare === "dentist") return { kind: "service", category: "dental" };
  if (t.office === "estate_agent") return { kind: "service", category: "real-estate" };
  if (t.office === "lawyer") return { kind: "service", category: "visa-legal" };
  // curated tourist (order: museum, market, viewpoint→landmark, outdoors, other landmark)
  if (t.tourism === "museum" || t.tourism === "gallery" || a === "arts_centre" || a === "theatre") return { kind: "curated", category: "museum" };
  if (a === "marketplace" || t.shop === "mall") return { kind: "curated", category: "market" };
  if (t.tourism === "viewpoint") return { kind: "curated", category: "landmark" }; // miradores (e.g. Turi)
  if (t.leisure === "park" || t.leisure === "garden" || t.natural === "peak") return { kind: "curated", category: "outdoors" };
  if (t.tourism === "attraction" || ["monument", "memorial", "church", "castle"].includes(t.historic) ||
      a === "place_of_worship" || t.place === "square" || t.man_made === "tower")
    return { kind: "curated", category: "landmark" };
  return null;
}
const scoreTags = (t) => Object.entries(QUALITY).reduce((s, [k, w]) => (t[k] ? s + w : s), 0);
const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

const OVERPASS_Q = `[out:json][timeout:180];(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|nightclub|biergarten|dentist|place_of_worship|marketplace|arts_centre|theatre)$"](${BBOX});
  nwr["shop"~"^(travel_agency|mall)$"](${BBOX});
  nwr["healthcare"="dentist"](${BBOX});
  nwr["office"~"^(estate_agent|lawyer)$"](${BBOX});
  nwr["tourism"~"^(attraction|viewpoint|museum|gallery)$"](${BBOX});
  nwr["historic"~"^(monument|memorial|church|castle)$"](${BBOX});
  nwr["leisure"~"^(park|garden)$"](${BBOX});
  nwr["natural"="peak"](${BBOX});
  nwr["place"="square"](${BBOX});
  nwr["man_made"="tower"](${BBOX});
);out tags center;`;

async function pullOSM() {
  const res = await fetch(OVERPASS, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(OVERPASS_Q),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const els = (await res.json()).elements;

  const discovery = [], curated = [], service = [], seen = new Set();
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
    else if (cls.kind === "curated") curated.push(rec);
    else service.push(rec);
  }
  const bySlug = (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  curated.sort(bySlug); service.sort(bySlug);
  return { discovery, curated, service };
}

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
    for (const arr of cellArrs) { if (arr.length) { picked.push(arr.shift()); progress = true; if (picked.length >= target) break; } }
  }
  return picked;
}
function selectCapped(discovery) {
  const out = [];
  for (const [cat, target] of Object.entries(TARGETS)) {
    out.push(...selectSpread(discovery.filter((r) => r.category === cat && !r.lowSignal), target));
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || b.score - a.score || a.name.localeCompare(b.name));
}
const countBy = (arr) => arr.reduce((c, r) => ((c[r.category] = (c[r.category] || 0) + 1), c), {});

function writeReports(discovery, curated, service, selected) {
  fs.mkdirSync(OUT, { recursive: true });
  const full = countBy(discovery), sel = countBy(selected), cur = countBy(curated), svc = countBy(service);
  const lowSignal = discovery.filter((r) => r.lowSignal).length;

  fs.writeFileSync(path.join(OUT, "coverage-counts.json"), JSON.stringify({
    source: "OpenStreetMap via Overpass (ODbL)", bbox: BBOX,
    discoveryFull: { byCategory: full, total: discovery.length, lowSignalExcludedFromSelection: lowSignal },
    selectedForImport: { byCategory: sel, total: selected.length, ranking: "OSM completeness + neighborhood spread", targets: TARGETS },
    curatedComprehensive: { byCategory: cur, total: curated.length, note: "imported in full (sellable=false / uncapped)" },
    serviceCandidates: { byCategory: svc, total: service.length },
  }, null, 2) + "\n");

  const rows = (o) => Object.entries(o).sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  fs.writeFileSync(path.join(OUT, "coverage-counts.md"), `# Cuenca coverage counts (OSM/Overpass, ODbL)

bbox \`${BBOX}\` (S,W,N,E). Sellable discovery is quality-ranked + spread-capped; curated tourist
categories are imported comprehensively. Ranking signal = OSM completeness (Google rating/reviews would
refine — needs an API key).

## Sellable discovery — FULL comprehensive (backstop)
| Category | Count |
|---|---|
${rows(full)}
| **Total** | **${discovery.length}** |

(fast_food/food_court counted above but excluded from the selection: ${lowSignal})

## Sellable discovery — selected for draft import
| Category | Count |
|---|---|
${rows(sel)}
| **Total** | **${selected.length}** |

## Curated tourist — imported comprehensively (sellable=false, uncapped)
| Category | Count |
|---|---|
${rows(cur)}
| **Total** | **${curated.length}** |

## Service candidates (NOT published — Stephen vets)
| Category | Count |
|---|---|
${rows(svc)}
| **Total** | **${service.length}** |
`);

  const strip = ({ lowSignal, ...r }) => r;
  fs.writeFileSync(path.join(OUT, "coverage-selected.json"), JSON.stringify(selected.map(strip), null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "coverage-curated.json"), JSON.stringify(curated.map(strip), null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "service-candidates.json"), JSON.stringify(service.map(strip), null, 2) + "\n");

  console.log("reports written.");
  console.log("  discovery full:", full, "→", discovery.length, `(low-signal ${lowSignal})`);
  console.log("  selected      :", sel, "→", selected.length);
  console.log("  curated       :", cur, "→", curated.length);
  console.log("  services      :", svc, "→", service.length);
}

async function importDrafts(records) {
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
  for (const r of records) {
    const cat = catId[r.category];
    if (!cat) { skipped++; continue; }
    const f = encodeURIComponent(`osmId="${r.osmId}"`);
    const existing = (await api(`/api/collections/businesses/records?perPage=1&filter=${f}`)).items[0];
    if (existing) {
      // SAFE-UPDATE: refresh basic OSM facts only; never touch published/slug/tier.
      await api(`/api/collections/businesses/records/${existing.id}`, { method: "PATCH", body: JSON.stringify({ name: r.name, category: cat, lat: r.lat, lng: r.lng, address: r.address }) });
      updated++;
    } else {
      await api("/api/collections/businesses/records", { method: "POST", body: JSON.stringify({ slug: r.slug, name: r.name, category: cat, lat: r.lat, lng: r.lng, address: r.address, tier: "free", published: false, osmId: r.osmId }) });
      created++;
    }
    if ((created + updated) % 50 === 0) console.log(`  …${created + updated}/${records.length}`);
  }
  console.log(`import: ${created} created, ${updated} updated, ${skipped} skipped (new pins published=false).`);
}

async function main() {
  console.log("pulling OSM/Overpass…");
  const { discovery, curated, service } = await pullOSM();
  const selected = selectCapped(discovery);
  writeReports(discovery, curated, service, selected);
  if (DO_IMPORT) { console.log("\nimporting drafts (capped selection + curated)…"); await importDrafts([...selected, ...curated]); }
  else console.log("\n(reports only — re-run with --import to load drafts)");
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
