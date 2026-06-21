// Rank curated drafts by prominence — curation aid ("keep notable, cull the smallest").
// ---------------------------------------------------------------------------
// The curated pull (task 09) imported 533 drafts — more than a clean map wants.
// This scores each curated draft by OSM prominence signals so the smallest sort
// to the bottom, and (only with --trim) deletes the long tail. Deletion is fully
// reversible: re-pullable via task 09, and the committed report is the backstop.
//
// Re-queries Overpass by osmId for tags + geometry (the pull stored basic fields
// only). Scoring per category:
//   - outdoors : polygon AREA (m²) dominates; node-only/tiny sink. +wiki, +attraction.
//   - landmark : signal sum — wiki, tourism=attraction, significant historic,
//                place_of_worship, place=square, man_made=tower.
//   - market   : marketplace > mall; +wiki.
//   - museum   : museum/gallery > arts_centre/theatre; +wiki.
//
// Writes (committed): snapshots/curated-ranked.{json,md}  (ranked per category).
//
// Scope: STRICTLY curated (landmark/outdoors/market/museum), published=false,
// osmId drafts. Never published/owner/editorial records, never sellable categories.
//
//   node scripts/rank-curated.mjs                  # report only (default, no writes)
//   node scripts/rank-curated.mjs --trim keep=40   # keep top 40 PER category, delete rest
//   node scripts/rank-curated.mjs --trim minScore=3        # delete below score 3 (all cats)
//   node scripts/rank-curated.mjs --trim minArea=2000      # outdoors: delete parks < 2000 m²

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "snapshots");
const OVERPASS = "https://overpass-api.de/api/interpreter";
const CURATED = ["landmark", "outdoors", "market", "museum"];

// --trim <spec>  where spec is keep=N | minScore=X | minArea=X
const trimIdx = process.argv.indexOf("--trim");
const TRIM = trimIdx !== -1 ? (process.argv[trimIdx + 1] || "") : null;
const trimSpec = TRIM ? Object.fromEntries([TRIM.split("=").map((s) => s.trim())]) : {};

// --category <key>  restrict ranking + trim to ONE curated category (thresholds differ per category).
const catIdx = process.argv.indexOf("--category");
const CATEGORY = catIdx !== -1 ? process.argv[catIdx + 1] : null;
if (CATEGORY && !CURATED.includes(CATEGORY)) throw new Error(`--category must be one of ${CURATED.join("|")}`);

// --protect "Name 1,Name 2"  exempt these names from deletion (e.g. node-mapped notables an area cut would drop).
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const protIdx = process.argv.indexOf("--protect");
const PROTECT = new Set(protIdx !== -1 ? (process.argv[protIdx + 1] || "").split(",").map((s) => norm(s)).filter(Boolean) : []);

function polyAreaM2(geom) {
  if (!geom || geom.length < 3) return 0;
  const lat0 = (geom[0].lat * Math.PI) / 180;
  const mLat = 110540, mLng = 111320 * Math.cos(lat0);
  let a = 0;
  for (let i = 0; i < geom.length; i++) {
    const p = geom[i], q = geom[(i + 1) % geom.length];
    a += p.lon * mLng * (q.lat * mLat) - q.lon * mLng * (p.lat * mLat);
  }
  return Math.round(Math.abs(a) / 2);
}

const SIGNIFICANT_HISTORIC = new Set(["monument", "memorial", "church", "castle", "cathedral", "ruins", "archaeological_site"]);

function scoreRecord(cat, t, areaM2) {
  const wiki = !!(t.wikidata || t.wikipedia);
  const s = { wiki, area_m2: areaM2 };
  let score = 0;
  if (cat === "outdoors") {
    // area dominates; wiki ~= a sizeable park; a bare viewpoint/node sinks.
    score = areaM2 + (wiki ? 20000 : 0) + (t.tourism === "viewpoint" ? 5000 : 0);
    s.viewpoint = t.tourism === "viewpoint";
  } else if (cat === "landmark") {
    const histSig = SIGNIFICANT_HISTORIC.has(t.historic);
    score = 1 + (wiki ? 3 : 0) + (t.tourism === "attraction" ? 2 : 0) +
      (histSig ? 2 : 0) + (t.amenity === "place_of_worship" ? 1 : 0) +
      (t.place === "square" ? 1 : 0) + (t.man_made === "tower" ? 1 : 0) +
      (t.tourism === "viewpoint" ? 1 : 0);
    Object.assign(s, { attraction: t.tourism === "attraction", historic: t.historic || null,
      worship: t.amenity === "place_of_worship", square: t.place === "square" });
  } else if (cat === "market") {
    score = 1 + (wiki ? 2 : 0) + (t.amenity === "marketplace" ? 2 : t.shop === "mall" ? 0 : 1);
    s.kind = t.amenity === "marketplace" ? "marketplace" : t.shop === "mall" ? "mall" : "other";
  } else if (cat === "museum") {
    const core = t.tourism === "museum" || t.tourism === "gallery";
    score = 1 + (wiki ? 2 : 0) + (core ? 2 : 1);
    s.kind = core ? (t.tourism) : (t.amenity || "other");
  }
  return { score, signals: s };
}

async function overpassByIds(osmIds) {
  const byType = { node: [], way: [], relation: [] };
  for (const id of osmIds) { const [type, num] = id.split("/"); if (byType[type]) byType[type].push(num); }
  const parts = Object.entries(byType).filter(([, ids]) => ids.length)
    .map(([type, ids]) => `${type}(id:${ids.join(",")});`).join("\n  ");
  const q = `[out:json][timeout:300];(\n  ${parts}\n);out tags geom;`;
  const res = await fetch(OVERPASS, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const map = new Map();
  for (const e of (await res.json()).elements) {
    const area = e.type === "way" ? polyAreaM2(e.geometry)
      : e.type === "relation" && e.bounds ? polyAreaM2([
          { lat: e.bounds.minlat, lon: e.bounds.minlon }, { lat: e.bounds.minlat, lon: e.bounds.maxlon },
          { lat: e.bounds.maxlat, lon: e.bounds.maxlon }, { lat: e.bounds.maxlat, lon: e.bounds.minlon }]) : 0;
    map.set(`${e.type}/${e.id}`, { tags: e.tags || {}, area });
  }
  return map;
}

async function main() {
  let token = "";
  const api = async (p, opts = {}) => {
    const res = await fetch(`${BASE}${p}`, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) } });
    const text = await res.text(); const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  token = (await api("/api/collections/_superusers/auth-with-password", { method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }) })).token;

  const catKey = {}, keyId = {};
  for (const c of (await api("/api/collections/categories/records?perPage=200")).items) { catKey[c.id] = c.key; keyId[c.key] = c.id; }

  // STRICTLY curated, published=false, osmId drafts.
  const drafts = [];
  for (let page = 1; ; page++) {
    const r = await api(`/api/collections/businesses/records?perPage=500&page=${page}&filter=${encodeURIComponent('published=false && osmId!=""')}`);
    drafts.push(...r.items.filter((b) => CURATED.includes(catKey[b.category]) && (!CATEGORY || catKey[b.category] === CATEGORY)));
    if (page >= r.totalPages) break;
  }
  console.log(`curated drafts to rank: ${drafts.length}${CATEGORY ? ` (category=${CATEGORY})` : ""}`);

  console.log("re-querying Overpass by osmId for tags + geometry…");
  const osm = await overpassByIds(drafts.map((d) => d.osmId));

  const ranked = {};
  for (const key of CURATED) ranked[key] = [];
  for (const d of drafts) {
    const cat = catKey[d.category];
    const o = osm.get(d.osmId) || { tags: {}, area: 0 };
    const { score, signals } = scoreRecord(cat, o.tags, o.area);
    ranked[cat].push({ id: d.id, name: d.name, osmId: d.osmId, score, ...signals });
  }
  for (const key of CURATED) ranked[key].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  // ---- report ----
  // Only a full report-only run (re)writes the committed backstop. A --trim or
  // --category run is a mutation/partial view and must not clobber it.
  const writeReport = !TRIM && !CATEGORY;
  if (!writeReport) console.log("(skipping report write — backstop from the full report-only run is preserved)");
  if (writeReport) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "curated-ranked.json"), JSON.stringify({
    note: "Prominence ranking of curated published=false osmId drafts. Highest = most notable; trim the tail.",
    scoring: "outdoors=area_m2(+wiki+viewpoint); landmark/market/museum=signal sum (see rank-curated.mjs)",
    counts: Object.fromEntries(CURATED.map((k) => [k, ranked[k].length])),
    ranked,
  }, null, 2) + "\n");

  const section = (key) => {
    const rows = ranked[key].map((r, i) => {
      const extra = key === "outdoors"
        ? `${r.area_m2.toLocaleString()} m²${r.viewpoint ? " · viewpoint" : ""}${r.wiki ? " · wiki" : ""}`
        : Object.entries(r).filter(([k, v]) => !["id", "name", "osmId", "score", "area_m2"].includes(k) && v && v !== "other")
            .map(([k, v]) => (v === true ? k : `${k}=${v}`)).join(" · ");
      return `| ${i + 1} | ${r.score} | ${r.name} | ${extra} | \`${r.id}\` |`;
    }).join("\n");
    return `## ${key} (${ranked[key].length})\n\n| # | Score | Name | Signals | id |\n|---|---|---|---|---|\n${rows}\n`;
  };
  fs.writeFileSync(path.join(OUT, "curated-ranked.md"), `# Curated drafts ranked by prominence

Highest score = most notable. The smallest/least significant sort to the bottom — trim that tail with
\`node scripts/rank-curated.mjs --trim keep=N\` (or \`minScore=X\` / \`minArea=X\`). Reversible: re-pull via
task 09; this report is the backstop. outdoors is ranked by polygon area; the rest by tag signal sum.

${CURATED.map(section).join("\n")}`);

  console.log("report written: snapshots/curated-ranked.{json,md}");
  }
  for (const key of CURATED) {
    const arr = ranked[key];
    if (!arr.length) continue;
    const tail = arr.slice(-3).map((r) => `${r.name}(${r.score})`).join(", ");
    console.log(`  ${key.padEnd(10)} ${arr.length} — bottom: ${tail}`);
  }

  // ---- optional trim ----
  if (!TRIM) { console.log("\n(report only — pass --trim keep=N | minScore=X | minArea=X to delete the tail)"); return; }

  let toDelete = [];
  if ("keep" in trimSpec) {
    const N = +trimSpec.keep;
    for (const key of CURATED) toDelete.push(...ranked[key].slice(N));
    console.log(`\n--trim keep=${N}: deleting everything below top ${N} per category.`);
  } else if ("minScore" in trimSpec) {
    const X = +trimSpec.minScore;
    for (const key of CURATED) toDelete.push(...ranked[key].filter((r) => r.score < X));
    console.log(`\n--trim minScore=${X}: deleting curated drafts scoring < ${X}.`);
  } else if ("minArea" in trimSpec) {
    const X = +trimSpec.minArea;
    toDelete.push(...ranked.outdoors.filter((r) => r.area_m2 < X));
    console.log(`\n--trim minArea=${X}: deleting outdoors parks < ${X} m² (other categories untouched).`);
  } else {
    throw new Error(`unrecognized --trim spec "${TRIM}". Use keep=N | minScore=X | minArea=X.`);
  }

  if (PROTECT.size) {
    const before = toDelete.length;
    toDelete = toDelete.filter((r) => !PROTECT.has(norm(r.name)));
    console.log(`--protect: exempted ${before - toDelete.length} record(s) from deletion (${[...PROTECT].join(", ")}).`);
  }

  if (!toDelete.length) { console.log("nothing matched the trim — no deletions."); return; }
  console.log(`deleting ${toDelete.length} drafts (reversible via task 09 re-pull)…`);
  let deleted = 0;
  for (const r of toDelete) {
    // re-assert guardrails per record before deleting: must be curated, unpublished, osmId draft.
    const rec = await api(`/api/collections/businesses/records/${r.id}`);
    if (rec.published || !rec.osmId || !CURATED.includes(catKey[rec.category])) {
      console.log(`  ! skip ${r.name} (${r.id}) — failed guardrail recheck`); continue;
    }
    await api(`/api/collections/businesses/records/${r.id}`, { method: "DELETE" });
    deleted++;
    if (deleted % 25 === 0) console.log(`  …${deleted}/${toDelete.length}`);
  }
  console.log(`trim: ${deleted} deleted.`);
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
