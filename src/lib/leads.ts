// Client-side lead capture. The `leads` collection is create-only for the public
// (no read), so the browser can submit a waitlist/contact entry but never list them.
const PB = import.meta.env.PUBLIC_POCKETBASE_URL;

export interface LeadInput {
  name: string;
  email: string;
  message?: string;
  business?: string; // category/business relation record id (optional)
  category?: string; // category relation record id (optional)
  source?: string; // where the lead came from, e.g. "waitlist" | "about-cta"
}

// `turnstileToken` (Cloudflare widget response) is sent as a header and verified
// server-side in a PocketBase hook before the lead is accepted.
export async function createLead(input: LeadInput, turnstileToken?: string): Promise<boolean> {
  if (!PB) return false;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (turnstileToken) headers["X-Turnstile-Token"] = turnstileToken;
    const res = await fetch(`${PB}/api/collections/leads/records`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}
