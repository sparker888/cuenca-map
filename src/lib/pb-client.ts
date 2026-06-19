// Browser-side PocketBase SDK singleton for the authenticated owner portal.
// Auth state persists in localStorage (the SDK's default LocalAuthStore), so the
// owner stays logged in across page loads. All reads/writes go straight to
// PocketBase — collection rules are the security boundary (no server in between).
import PocketBase from "pocketbase";

export const pb = new PocketBase(import.meta.env.PUBLIC_POCKETBASE_URL);
