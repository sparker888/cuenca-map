/// <reference path="../pb_data/types.d.ts" />

// Owner field guard.
// ---------------------------------------------------------------------------
// The browser hits PocketBase directly, so collection rules are the perimeter.
// businesses.updateRule lets an owner PATCH their own record — but PocketBase
// base collections have no per-FIELD write rules, so without this an owner could
// upgrade their own tier or flip `published`. This hook blocks non-admins from
// changing protected fields; only superusers / role=admin may.
//
// JSVM note: handler runs in an isolated scope — everything is inlined.

onRecordUpdateRequest((e) => {
  const auth = e.auth;
  const isAdmin =
    !!auth && (auth.collection().name === "_superusers" || auth.get("role") === "admin");

  if (!isAdmin) {
    const PROTECTED = [
      "tier", "status", "category", "owner", "published",
      "slug", "rating", "ratingCount", "reviewSlug",
    ];
    const original = e.record.original();
    for (const f of PROTECTED) {
      if (JSON.stringify(e.record.get(f)) !== JSON.stringify(original.get(f))) {
        throw new ForbiddenError(`You are not allowed to change "${f}".`);
      }
    }
  }

  e.next();
}, "businesses");
