// PocketBase access points.
// - BUILD_URL: used at build time by the static loaders (src/lib/content.ts).
//   Reads only PUBLIC/published data anonymously — no admin credentials, so this
//   is safe to run in CI/Netlify with just the URL.
// - PUBLIC_URL: shipped to the browser for live, unauthenticated reads
//   (events_specials) and create-only writes (leads).
export const PB_BUILD_URL =
  import.meta.env.POCKETBASE_URL || import.meta.env.PUBLIC_POCKETBASE_URL;

export const PB_PUBLIC_URL = import.meta.env.PUBLIC_POCKETBASE_URL;

interface ListParams {
  filter?: string;
  sort?: string;
  expand?: string;
  perPage?: number;
}

/** Fetch every record from a collection (paginated), build-time, anonymous. */
export async function pbList<T = any>(collection: string, params: ListParams = {}): Promise<T[]> {
  if (!PB_BUILD_URL) {
    throw new Error(
      "POCKETBASE_URL (or PUBLIC_POCKETBASE_URL) is not set — cannot load content at build time."
    );
  }
  const out: T[] = [];
  let page = 1;
  const perPage = params.perPage ?? 200;
  for (;;) {
    const qs = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (params.filter) qs.set("filter", params.filter);
    if (params.sort) qs.set("sort", params.sort);
    if (params.expand) qs.set("expand", params.expand);

    const url = `${PB_BUILD_URL}/api/collections/${collection}/records?${qs}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`PocketBase ${collection} fetch failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    out.push(...data.items);
    if (page >= data.totalPages || data.items.length === 0) break;
    page++;
  }
  return out;
}
