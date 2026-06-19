// Loads the repo-root .env (git-ignored) into process.env so the setup/seed
// scripts get POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD
// without any secrets being hardcoded in committed source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../../.env");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

export const PB_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL;
export const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
export const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
  throw new Error(
    "Missing POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD. " +
      "Set them in the repo-root .env or the environment before running this script."
  );
}
