/// <reference path="../pb_data/types.d.ts" />

// Record-sale route — the one privileged, atomic sale operation.
// ---------------------------------------------------------------------------
// The browser hits PocketBase directly and the JS SDK can't do a clean
// multi-collection transaction, so recording a sale (which touches businesses +
// users + subscriptions at once) happens here, server-side, as ONE operation.
//
// Auth: a real logged-in user with role ∈ {admin, sales} (or a superuser). Role
// is enforced HERE, server-side — never trusted from the client. Owners/anon get
// 403. This route is the ONLY sanctioned path that changes a business's tier /
// creates an owner account / writes a subscription; owner-guard.pb.js still blocks
// any direct protected-field PATCH by non-admins.
//
// Atomicity: everything runs inside $app.runInTransaction — a mid-flow failure
// leaves NO half-written state (no tier without a subscription, no orphan owner).
//
// JSVM note: the handler runs in its OWN isolated scope and can't see
// module-level helpers, so every helper is defined INSIDE the handler.

routerAdd("POST", "/api/cuenca/record-sale", (e) => {
  // ---- auth + role gate (server-side, not UI) --------------------------------
  const auth = e.auth;
  if (!auth) throw new UnauthorizedError("Sign in required.");
  const isSuper = auth.collection().name === "_superusers";
  const role = isSuper ? "admin" : auth.get("role");
  if (!isSuper && role !== "admin" && role !== "sales") {
    throw new ForbiddenError("Only sales or admin can record a sale.");
  }

  // ---- inlined helpers (isolated scope) --------------------------------------
  const slugify = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "listing";
  const reqStr = (v, field) => {
    const s = (v === undefined || v === null) ? "" : String(v).trim();
    if (!s) throw new BadRequestError(`Missing required field: ${field}.`);
    return s;
  };
  const num = (v, field) => {
    const n = Number(v);
    if (!isFinite(n)) throw new BadRequestError(`Invalid number for: ${field}.`);
    return n;
  };
  const findOrNull = (fn) => { try { return fn(); } catch (_) { return null; } };

  const d = e.requestInfo().body || {};

  // sale fields (shared by both paths)
  const tier = reqStr(d.tier, "tier");
  if (tier !== "enhanced" && tier !== "premium") {
    throw new BadRequestError('tier must be "enhanced" or "premium" for a sale.');
  }
  const ownerEmail = reqStr(d.ownerEmail, "ownerEmail").toLowerCase();
  const ownerName = (d.ownerName ? String(d.ownerName).trim() : "");

  // ---- one atomic transaction ------------------------------------------------
  let out = {};
  $app.runInTransaction((txApp) => {
    // 1) business: upgrade an existing listing OR create a brand-new one.
    let biz;
    if (d.businessId) {
      biz = findOrNull(() => txApp.findRecordById("businesses", String(d.businessId)));
      if (!biz) throw new BadRequestError("Business not found.");
      const cur = biz.get("tier");
      if (cur === "enhanced" || cur === "premium") {
        throw new BadRequestError(`"${biz.get("name")}" is already on a paid tier (${cur}).`);
      }
      biz.set("tier", tier);
    } else {
      const name = reqStr(d.name, "name");
      const categoryRef = reqStr(d.category, "category");
      const lat = num(d.lat, "lat");
      const lng = num(d.lng, "lng");
      // category may be a record id or a category key — resolve either.
      let cat = findOrNull(() => txApp.findRecordById("categories", categoryRef));
      if (!cat) cat = findOrNull(() => txApp.findFirstRecordByFilter("categories", "key = {:k}", { k: categoryRef }));
      if (!cat) throw new BadRequestError(`Unknown category: ${categoryRef}.`);

      // unique slug: base, with a short random suffix on collision.
      let slug = slugify(name);
      if (findOrNull(() => txApp.findFirstRecordByFilter("businesses", "slug = {:s}", { s: slug }))) {
        slug = `${slug}-${$security.randomStringWithAlphabet(4, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
      }

      const coll = txApp.findCollectionByNameOrId("businesses");
      biz = new Record(coll);
      biz.set("slug", slug);
      biz.set("name", name);
      biz.set("category", cat.id);
      biz.set("tier", tier);
      biz.set("lat", lat);
      biz.set("lng", lng);
      if (d.address) biz.set("address", String(d.address));
      biz.set("published", true); // a paid service listing is live immediately
    }

    // 2) owner user: link an existing account or mint a new role=owner one.
    let owner = findOrNull(() => txApp.findFirstRecordByFilter("users", "email = {:em}", { em: ownerEmail }));
    let tempPassword = null;
    if (!owner) {
      const ucoll = txApp.findCollectionByNameOrId("users");
      owner = new Record(ucoll);
      owner.set("email", ownerEmail);
      if (ownerName) owner.set("name", ownerName);
      owner.set("role", "owner");
      owner.set("verified", true);
      tempPassword = $security.randomString(14);
      owner.setPassword(tempPassword);
      txApp.save(owner);
    } else if (ownerName && !owner.get("name")) {
      owner.set("name", ownerName);
      txApp.save(owner);
    }

    // link owner to the business and persist the business
    biz.set("owner", owner.id);
    txApp.save(biz);

    // 3) subscription row (active)
    const scoll = txApp.findCollectionByNameOrId("subscriptions");
    const sub = new Record(scoll);
    sub.set("owner", owner.id);
    sub.set("business", biz.id);
    sub.set("tier", tier);
    if (d.period) sub.set("period", String(d.period));
    if (d.amount !== undefined && d.amount !== null && d.amount !== "") sub.set("amount", num(d.amount, "amount"));
    sub.set("currency", d.currency ? String(d.currency) : "USD");
    if (d.method) sub.set("method", String(d.method));
    if (d.paid_through) sub.set("paid_through", String(d.paid_through));
    sub.set("status", "active");
    if (d.notes) sub.set("notes", String(d.notes));
    txApp.save(sub);

    out = {
      business: { id: biz.id, name: biz.get("name"), slug: biz.get("slug"), tier: biz.get("tier"), published: biz.get("published") },
      owner: { id: owner.id, email: owner.get("email"), created: !!tempPassword },
      subscription: { id: sub.id, status: sub.get("status"), paid_through: sub.get("paid_through") },
      tempPassword, // present ONLY when a new owner account was minted (relay once)
    };
  });

  // Tier/listing changed → the static site must rebuild. After-update hooks fire
  // on dao saves, but we also ping the dirty flag directly so the once-a-minute
  // rebuild cron (rebuild.pb.js) drains it regardless of hook ordering.
  $app.store().set("netlifyRebuildDirty", true);

  return e.json(200, out);
});
