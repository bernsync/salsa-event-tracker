import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const OUTPUT_DIR = path.join(ROOT, "private-data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "supabase-private-data.json");

async function loadLocalEnv() {
  try {
    const text = await fs.readFile(ENV_PATH, "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separator = trimmed.indexOf("=");
      if (separator === -1) return;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function loadSupabaseConfig() {
  const configText = await fs.readFile(path.join(ROOT, "web", "supabase-config.js"), "utf8");
  const url = configText.match(/url:\s*"([^"]+)"/)?.[1];
  const publishableKey = configText.match(/publishableKey:\s*"([^"]+)"/)?.[1];
  if (!url || !publishableKey) {
    throw new Error("Could not read Supabase URL and publishable key from web/supabase-config.js.");
  }
  return { url, publishableKey };
}

async function supabaseRequest(url, pathName, publishableKey, accessToken) {
  const response = await fetch(`${url}/rest/v1/${pathName}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${pathName} returned ${response.status}${text ? `: ${text}` : ""}`);
  }
  return response.json();
}

async function signIn(url, publishableKey, email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.msg || payload.message || `Sign in returned ${response.status}`);
  }
  return response.json();
}

await loadLocalEnv();

const email = process.env.SUPABASE_HELPER_EMAIL;
const password = process.env.SUPABASE_HELPER_PASSWORD;

if (!email || !password) {
  throw new Error("Set SUPABASE_HELPER_EMAIL and SUPABASE_HELPER_PASSWORD in .env.local or your shell environment.");
}

const { url, publishableKey } = await loadSupabaseConfig();
const session = await signIn(url, publishableKey, email, password);
const accessToken = session.access_token;

const [roles, trips, reviews] = await Promise.all([
  supabaseRequest(url, "app_user_roles?select=*&order=created_at.asc", publishableKey, accessToken),
  supabaseRequest(
    url,
    "personal_trips?select=*,personal_trip_places(*),personal_pto_days(*)&order=start_date.asc",
    publishableKey,
    accessToken
  ),
  supabaseRequest(url, "reviews?select=*&order=reviewed_at.desc", publishableKey, accessToken)
]);

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.writeFile(
  OUTPUT_PATH,
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      email,
      roles,
      personal_trips: trips,
      reviews
    },
    null,
    2
  )
);

console.log(`Exported ${trips.length} trips and ${reviews.length} reviews to ${path.relative(ROOT, OUTPUT_PATH)}`);
