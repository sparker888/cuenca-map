/// <reference path="../pb_data/types.d.ts" />

// Netlify rebuild trigger.
// ---------------------------------------------------------------------------
// When STATIC-affecting content changes (businesses, reviews, categories, media)
// we ping the Netlify build hook so the statically-generated site regenerates.
//
// Debounced: each change sets a "dirty" flag; a once-a-minute cron drains it and
// fires at most one build per minute, so a burst of admin edits = one rebuild.
//
// events_specials is intentionally NOT wired here — specials are fetched live on
// the client, so they must never trigger a rebuild. leads/subscriptions/users
// are backend-only and also excluded.
//
// IMPORTANT (PocketBase JSVM): each handler runs in its OWN isolated scope and
// CANNOT see module-level consts/functions — so every value is inlined literally.
//
// Set the build hook URL as a server-side secret (never client-exposed):
//   flyctl secrets set NETLIFY_BUILD_HOOK_URL=https://api.netlify.com/build_hooks/XXXX --app cuenca-map-production
// Until it's set, the cron logs and no-ops (safe before the site is on Netlify).

// --- mark dirty on static-affecting writes -------------------------------------
onRecordAfterCreateSuccess((e) => { $app.store().set("netlifyRebuildDirty", true); e.next(); }, "businesses", "reviews", "categories", "media");
onRecordAfterUpdateSuccess((e) => { $app.store().set("netlifyRebuildDirty", true); e.next(); }, "businesses", "reviews", "categories", "media");
onRecordAfterDeleteSuccess((e) => { $app.store().set("netlifyRebuildDirty", true); e.next(); }, "businesses", "reviews", "categories", "media");

// --- drain the flag once a minute ----------------------------------------------
cronAdd("netlify-rebuild", "* * * * *", () => {
  if (!$app.store().get("netlifyRebuildDirty")) return;

  const url = $os.getenv("NETLIFY_BUILD_HOOK_URL");
  if (!url) {
    // No hook configured yet (site not on Netlify). Log once and clear, so we
    // don't warn every minute. Set the secret to enable real rebuilds.
    $app.store().set("netlifyRebuildDirty", false);
    $app.logger().warn("[rebuild] content changed but NETLIFY_BUILD_HOOK_URL is unset — skipping");
    return;
  }

  try {
    $http.send({ url: url, method: "POST", timeout: 20 });
    $app.store().set("netlifyRebuildDirty", false);
    $app.logger().info("[rebuild] triggered Netlify build hook");
  } catch (err) {
    // Leave the flag set so the next tick retries.
    $app.logger().error("[rebuild] Netlify build hook failed: " + err);
  }
});
