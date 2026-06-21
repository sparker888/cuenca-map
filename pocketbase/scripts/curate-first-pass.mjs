// First-pass curation: junk removal + high-confidence dupe resolution (task 12, step 2).
// ---------------------------------------------------------------------------
// Two bespoke fixes the prominence trim (rank-curated.mjs) can't express:
//
//   A. Delete the 7 "Hábitat anfibios" markers — amphibian-habitat points, not
//      landmarks. They score 3 (survive the landmark minScore=3 trim) so they
//      must be removed by name.
//   B. Resolve the 6 high-confidence NAME dupes from seed-dupe-report.json:
//      keep the hand-seeded record, delete the OSM draft. Turi exception: first
//      move the SEED into the landmark category, then delete its OSM draft.
//
// Scope: only curated osmId drafts (delete) + the named Turi seed (category PATCH).
// Never sellable categories, never leads/subscriptions/users. Idempotent — a draft
// already gone (e.g. removed by the trim) is skipped. Reversible: re-pull (task 09);
// the seed-dupe + ranked reports are the backstop.
//
//   node scripts/curate-first-pass.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CURATED = ["landmark", "outdoors", "market", "museum"];
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  let token = "";
  const api = async (p, opts = {}) => {
    const res = await fetch(`${BASE}${p}`, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) } });
    const text = await res.text(); const body = text ? JSON.parse(text) : {};
    if (!res.ok) { const err = new Error(`${opts.method || "GET"} ${p} -> ${res.status}`); err.status = res.status; throw err; }
    return body;
  };
  const get = async (id) => { try { return await api(`/api/collections/businesses/records/${id}`); } catch (e) { if (e.status === 404) return null; throw e; } };
  token = (await api("/api/collections/_superusers/auth-with-password", { method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }) })).token;

  const catKey = {}, keyId = {};
  for (const c of (await api("/api/collections/categories/records?perPage=200")).items) { catKey[c.id] = c.key; keyId[c.key] = c.id; }

  // Delete one curated osmId draft, re-asserting the guardrail. Idempotent.
  const deleteDraft = async (id, label) => {
    const rec = await get(id);
    if (!rec) { console.log(`  · ${label} — already gone (skip)`); return false; }
    if (rec.published || !rec.osmId || !CURATED.includes(catKey[rec.category])) {
      console.log(`  ! ${label} — failed guardrail (published=${rec.published} osmId=${!!rec.osmId} cat=${catKey[rec.category]}); skip`); return false;
    }
    await api(`/api/collections/businesses/records/${id}`, { method: "DELETE" });
    console.log(`  ✓ deleted ${label}`);
    return true;
  };

  // ---- A. Hábitat anfibios junk ----
  console.log("A. Hábitat anfibios markers:");
  let habDeleted = 0;
  for (let page = 1; ; page++) {
    const r = await api(`/api/collections/businesses/records?perPage=500&page=${page}&filter=${encodeURIComponent('published=false && osmId!=""')}`);
    for (const b of r.items) {
      if (norm(b.name) === "habitat anfibios" && CURATED.includes(catKey[b.category])) {
        if (await deleteDraft(b.id, `${b.name} (${b.id})`)) habDeleted++;
      }
    }
    if (page >= r.totalPages) break;
  }
  console.log(`  → ${habDeleted} deleted.`);

  // ---- B. NAME dupes: keep seed, delete OSM draft (Turi: move seed to landmark first) ----
  console.log("\nB. NAME dupes (keep seed, delete OSM draft):");
  const nameDupes = JSON.parse(fs.readFileSync(path.join(here, "..", "snapshots", "seed-dupe-report.json"), "utf8"))
    .matches.filter((m) => m.kind === "NAME");
  let moved = 0, dupeDeleted = 0;
  for (const m of nameDupes) {
    const isTuri = norm(m.seed.name) === "mirador de turi";
    if (isTuri) {
      const seed = await get(m.seed.id);
      if (seed && !seed.osmId && catKey[seed.category] !== "landmark") {
        await api(`/api/collections/businesses/records/${m.seed.id}`, { method: "PATCH", body: JSON.stringify({ category: keyId.landmark }) });
        console.log(`  ✓ moved seed "${seed.name}" (${m.seed.id}) → landmark`);
        moved++;
      } else {
        console.log(`  · Turi seed already landmark or unexpected (skip move)`);
      }
    }
    if (await deleteDraft(m.osmDraft.id, `OSM draft "${m.osmDraft.name}" (${m.osmDraft.id})`)) dupeDeleted++;
  }
  console.log(`  → ${moved} seed moved, ${dupeDeleted} OSM dupe drafts deleted.`);

  console.log(`\nfirst-pass: ${habDeleted} hábitat + ${dupeDeleted} dupe drafts deleted; ${moved} seed re-categorized.`);
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + (e.message || e)); process.exit(1); });
