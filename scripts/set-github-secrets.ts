/**
 * Sets GitHub Actions secrets for the StudyMoon repo via the REST API.
 * Values are encrypted with libsodium (sealed box) as GitHub requires.
 * Run: npx tsx scripts/set-github-secrets.ts
 * Values come from the local .env (never printed).
 */
import sodium from "libsodium-wrappers";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = process.env.GH_REPO ?? "Kronos1027/StudyMoon";
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("GH_TOKEN env var is required");
  process.exit(1);
}

// Secrets to sync: name -> value source (from .env, mapped).
const ENV_FILE = path.join(process.cwd(), ".env");
const env: Record<string, string> = {};
for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const SECRETS: Record<string, string | undefined> = {
  SUPABASE_URL: env.SUPABASE_URL,
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
  SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
  DATABASE_URL: env.DATABASE_URL,
  GEMINI_API_KEY: env.GEMINI_API_KEY,
  GROQ_API_KEY: env.GROQ_API_KEY,
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  CRON_SECRET: env.CRON_SECRET,
  VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
};

async function main() {
  await sodium.ready;

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // 1. Fetch repo public key
  const pkRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/secrets/public-key`,
    { headers },
  );
  if (!pkRes.ok) {
    throw new Error(`public-key failed: ${pkRes.status} ${await pkRes.text()}`);
  }
  const { key, key_id } = (await pkRes.json()) as {
    key: string;
    key_id: string;
  };

  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);

  // 2. Push each non-empty secret
  for (const [name, value] of Object.entries(SECRETS)) {
    if (!value) {
      console.log(`skip ${name} (empty — fill later)`);
      continue;
    }
    const encrypted = sodium.crypto_box_seal(
      sodium.from_string(value),
      binKey,
    );
    const body = JSON.stringify({
      encrypted_value: sodium.to_base64(
        encrypted,
        sodium.base64_variants.ORIGINAL,
      ),
      key_id,
    });
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/secrets/${name}`,
      { method: "PUT", headers, body },
    );
    console.log(
      res.ok ? `set ${name}` : `FAILED ${name}: ${res.status} ${await res.text()}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
