// Client-side live specials/events. Fetched at runtime from the PUBLIC PocketBase
// URL (no auth, public read limited to active=true), so specials appear/disappear
// WITHOUT a site rebuild. Filtered by the business's slug via the relation.
const PB = import.meta.env.PUBLIC_POCKETBASE_URL;

export interface Special {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchActiveSpecials(businessSlug: string): Promise<Special[]> {
  if (!PB || !businessSlug) return [];
  const filter = encodeURIComponent(`business.slug="${businessSlug}" && active=true`);
  try {
    const res = await fetch(
      `${PB}/api/collections/events_specials/records?perPage=50&sort=-created&filter=${filter}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items as any[]).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description || undefined,
      startDate: s.startDate || undefined,
      endDate: s.endDate || undefined,
    }));
  } catch {
    return [];
  }
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** "Through May 3", "From Apr 1", "Apr 1 – May 3", or "" */
export function specialDateLabel(s: Special): string {
  if (s.startDate && s.endDate) return `${fmt(s.startDate)} – ${fmt(s.endDate)}`;
  if (s.endDate) return `Through ${fmt(s.endDate)}`;
  if (s.startDate) return `From ${fmt(s.startDate)}`;
  return "";
}
