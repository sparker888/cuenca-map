// One-shot, idempotent collection builder for the Cuenca Maps PocketBase.
// Creates/updates collections via the superuser REST API, then you snapshot the
// result into a committed pb_migrations file. Re-runnable: existing collections
// are updated in place, not duplicated.
//
// Usage: node setup-collections.mjs
//   Reads POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD from
//   the repo-root .env (see _env.mjs). No secrets are hardcoded.

import { PB_URL as BASE, PB_ADMIN_EMAIL as EMAIL, PB_ADMIN_PASSWORD as PASSWORD } from "./_env.mjs";

const ILLOS = ["dome", "facade", "market", "terrace", "river"];

let token = "";
async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} -> ${res.status}\n${JSON.stringify(body, null, 2)}`);
  }
  return body;
}

async function auth() {
  const r = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  });
  token = r.token;
}

const cache = {};
async function getCollection(name) {
  if (cache[name]) return cache[name];
  try {
    const c = await api(`/api/collections/${name}`);
    cache[name] = c;
    return c;
  } catch {
    return null;
  }
}

// Create the collection if missing, else update its fields/rules in place.
async function upsert(def) {
  const existing = await getCollection(def.name);
  if (existing) {
    // Preserve system fields already present; merge in our non-system fields.
    const systemFields = existing.fields.filter((f) => f.system);
    const ours = def.fields.filter((f) => !f.system);
    const merged = [...systemFields];
    for (const f of ours) {
      const idx = merged.findIndex((m) => m.name === f.name);
      if (idx >= 0) merged[idx] = { ...merged[idx], ...f };
      else merged.push(f);
    }
    const payload = { ...def, fields: merged };
    const updated = await api(`/api/collections/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    cache[def.name] = updated;
    console.log(`updated  ${def.name} (${updated.id})`);
    return updated;
  }
  const created = await api(`/api/collections`, {
    method: "POST",
    body: JSON.stringify(def),
  });
  cache[def.name] = created;
  console.log(`created  ${def.name} (${created.id})`);
  return created;
}

const txt = (name, o = {}) => ({ name, type: "text", required: false, ...o });
const num = (name, o = {}) => ({ name, type: "number", required: false, ...o });
const bool = (name, o = {}) => ({ name, type: "bool", required: false, ...o });
const json = (name, o = {}) => ({ name, type: "json", maxSize: 2000000, ...o });
const url = (name, o = {}) => ({ name, type: "url", required: false, ...o });
const date = (name, o = {}) => ({ name, type: "date", ...o });
const sel = (name, values, o = {}) => ({ name, type: "select", maxSelect: 1, values, ...o });
const rel = (name, collectionId, o = {}) => ({
  name, type: "relation", collectionId, maxSelect: 1, minSelect: 0, cascadeDelete: false, ...o,
});
const created = () => ({ name: "created", type: "autodate", onCreate: true, onUpdate: false });
const updated = () => ({ name: "updated", type: "autodate", onCreate: true, onUpdate: true });

async function main() {
  await auth();
  console.log("authenticated as superuser\n");

  // 1) categories — public read, admin-only write
  const categories = await upsert({
    name: "categories",
    type: "base",
    listRule: "", viewRule: "",
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    fields: [
      txt("key", { required: true, presentable: true }),
      txt("label", { required: true }),
      txt("color"),
      // sellable = a paid business category (carries a cap, shown on
      // /list-your-business). false = free curated editorial/tourist category.
      bool("sellable"),
      num("cap", { onlyInt: true, min: 0 }),
      num("order", { onlyInt: true }),
      created(), updated(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_categories_key ON categories (key)"],
  });

  // 2) users (auth, already exists) — add role
  await upsert({
    name: "users",
    type: "auth",
    fields: [ sel("role", ["admin", "owner"], { required: false }) ],
  });

  // 3) businesses — public sees published; owners/admin see + edit their own
  const businesses = await upsert({
    name: "businesses",
    type: "base",
    listRule: 'published = true || owner = @request.auth.id || @request.auth.role = "admin"',
    viewRule: 'published = true || owner = @request.auth.id || @request.auth.role = "admin"',
    createRule: '@request.auth.role = "admin"',
    updateRule: 'owner = @request.auth.id || @request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    fields: [
      txt("slug", { required: true, presentable: true }),
      txt("name", { required: true, presentable: true }),
      rel("category", categories.id, { required: true }),
      sel("tier", ["free", "enhanced", "premium"], { required: true }),
      num("lat", { required: true }),
      num("lng", { required: true }),
      txt("address"),
      num("rating"),
      num("ratingCount", { onlyInt: true }),
      txt("tagline"),
      txt("description", { max: 0 }),
      sel("illo", ILLOS),
      json("hours", { maxSize: 100000 }),
      txt("phone"),
      txt("whatsapp"), // click-to-chat number (task 03); owner-editable
      url("website"),
      txt("reviewSlug"),
      bool("published"),
      rel("owner", "_pb_users_auth_", {}),
      // Premium-only menu PDF, owner-uploaded via the portal.
      { name: "menuPdf", type: "file", maxSelect: 1, maxSize: 10485760, mimeTypes: ["application/pdf"] },
      created(), updated(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_businesses_slug ON businesses (slug)"],
  });

  // 4) reviews — public sees published; admin writes
  const reviews = await upsert({
    name: "reviews",
    type: "base",
    // Published reviews are fully public. `comingSoon` exposes a teaser-only record
    // (no body) as a "coming soon" card. Records with neither flag are private drafts.
    listRule: 'published = true || comingSoon = true',
    viewRule: 'published = true || comingSoon = true',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    fields: [
      txt("slug", { required: true, presentable: true }),
      rel("business", businesses.id, {}),
      bool("published"),
      bool("comingSoon"),
      txt("name", { required: true, presentable: true }),
      txt("category"),
      num("rating"),
      sel("cardIllo", ILLOS),
      txt("dek", { max: 0 }),
      txt("dekEs", { max: 0 }),
      txt("title"),
      txt("eyebrow"),
      txt("lede", { max: 0 }),
      txt("author"),
      txt("authorInitial"),
      txt("date"),
      txt("readTime"),
      txt("ratingLabel"),
      sel("leadIllo", ILLOS),
      txt("leadCaption", { max: 0 }),
      json("body", { maxSize: 2000000 }),
      json("essentials", { maxSize: 200000 }),
      created(), updated(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_reviews_slug ON reviews (slug)"],
  });

  // 5) media — public read, admin write
  await upsert({
    name: "media",
    type: "base",
    listRule: "", viewRule: "",
    createRule: '@request.auth.role = "admin" || business.owner = @request.auth.id',
    updateRule: '@request.auth.role = "admin" || business.owner = @request.auth.id',
    deleteRule: '@request.auth.role = "admin" || business.owner = @request.auth.id',
    fields: [
      rel("business", businesses.id, { required: true }),
      { name: "image", type: "file", maxSelect: 1, maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
      txt("alt"),
      num("order", { onlyInt: true }),
      created(), updated(),
    ],
  });

  // 6) events_specials — public sees active; owner/admin also see their own
  // (incl. inactive, for the portal editor). NOTE: must NOT trigger rebuilds.
  await upsert({
    name: "events_specials",
    type: "base",
    listRule: 'active = true || business.owner = @request.auth.id || @request.auth.role = "admin"',
    viewRule: 'active = true || business.owner = @request.auth.id || @request.auth.role = "admin"',
    createRule: 'business.owner = @request.auth.id || @request.auth.role = "admin"',
    updateRule: 'business.owner = @request.auth.id || @request.auth.role = "admin"',
    deleteRule: 'business.owner = @request.auth.id || @request.auth.role = "admin"',
    fields: [
      rel("business", businesses.id, { required: true }),
      txt("title", { required: true }),
      txt("description", { max: 0 }),
      bool("active"),
      date("startDate"),
      date("endDate"),
      created(), updated(),
    ],
  });

  // 7) leads — public CREATE only, never publicly readable
  await upsert({
    name: "leads",
    type: "base",
    listRule: null, viewRule: null,
    createRule: "",
    updateRule: null, deleteRule: null,
    fields: [
      txt("name", { required: true }),
      { name: "email", type: "email", required: true },
      txt("message", { max: 0 }),
      rel("business", businesses.id, {}),
      rel("category", categories.id, {}),
      txt("source"),
      created(), updated(),
    ],
  });

  // 8) subscriptions — owner reads own; admin/server writes
  await upsert({
    name: "subscriptions",
    type: "base",
    listRule: 'owner = @request.auth.id || @request.auth.role = "admin"',
    viewRule: 'owner = @request.auth.id || @request.auth.role = "admin"',
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel("owner", "_pb_users_auth_", { required: true }),
      rel("business", businesses.id, {}),
      sel("tier", ["free", "enhanced", "premium"]),
      sel("status", ["active", "canceled", "past_due", "trialing"]),
      txt("provider"),
      txt("externalId"),
      date("currentPeriodEnd"),
      created(), updated(),
    ],
  });

  console.log("\n✓ all collections in place");
}

main().catch((e) => { console.error("\n✗ FAILED:\n" + e.message); process.exit(1); });
