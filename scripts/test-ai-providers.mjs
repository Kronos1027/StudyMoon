/**
 * Live probe of the AI providers configured in .env.
 * Tests each endpoint with a tiny prompt and reports availability
 * (the sandbox has had geo-block issues with Gemini/Groq — HK egress).
 * Usage: node scripts/test-ai-providers.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const env = {};
for (const line of readFileSync(path.join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const TIMEOUT_MS = 20_000;

async function fetchJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.status, ok: res.ok, json, text: text.slice(0, 400) };
  } finally {
    clearTimeout(t);
  }
}

function extractContent(body) {
  try {
    return body?.choices?.[0]?.message?.content ?? body?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch { return null; }
}

const results = [];

// --- 1. Gemini (Google AI Studio) ---
async function testGemini() {
  const key = env.GEMINI_API_KEY;
  if (!key) return { name: "Gemini", status: "SKIPPED (no key)" };
  // 1a. list models (cheap, tells us what the key can reach)
  const lm = await fetchJSON(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
  );
  if (!lm.ok) {
    return { name: "Gemini", status: `FAIL list-models ${lm.status}`, detail: lm.text };
  }
  const models = (lm.json?.models ?? []).map((m) => m.name?.replace("models/", "")).filter(Boolean);
  const flashModels = models.filter((m) => m.includes("flash"));
  // 1b. quick generation with the configured model
  const model = env.GEMINI_MODEL || "gemini-2.0-flash";
  const gen = await fetchJSON(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Responda apenas: OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    },
  );
  const content = extractContent(gen.json);
  return {
    name: "Gemini",
    status: gen.ok ? "OK" : `FAIL ${gen.status}`,
    detail: gen.ok
      ? `model=${model} replied "${(content ?? "").trim()}" | flash models available: ${flashModels.slice(0, 8).join(", ")}`
      : gen.text,
  };
}

// --- 2. Groq ---
async function testGroq() {
  const key = env.GROQ_API_KEY;
  if (!key) return { name: "Groq", status: "SKIPPED (no key)" };
  const model = env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const res = await fetchJSON("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Responda apenas: OK" }],
      max_tokens: 10,
    }),
  });
  const content = extractContent(res.json);
  return {
    name: "Groq",
    status: res.ok ? "OK" : `FAIL ${res.status}`,
    detail: res.ok ? `model=${model} replied "${(content ?? "").trim()}"` : res.text,
  };
}

// --- 3. OpenRouter ---
async function testOpenRouter() {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return { name: "OpenRouter", status: "SKIPPED (no key)" };
  const model = env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const res = await fetchJSON("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Responda apenas: OK" }],
      max_tokens: 10,
    }),
  });
  const content = extractContent(res.json);
  return {
    name: "OpenRouter",
    status: res.ok ? "OK" : `FAIL ${res.status}`,
    detail: res.ok ? `model=${model} replied "${(content ?? "").trim()}"` : res.text,
  };
}

for (const t of [testGemini, testGroq, testOpenRouter]) {
  try {
    results.push(await t());
  } catch (e) {
    results.push({ name: t.name, status: "ERROR", detail: String(e).slice(0, 200) });
  }
}

console.log("=== AI provider probe ===");
for (const r of results) {
  console.log(`\n[${r.name}] ${r.status}`);
  if (r.detail) console.log(`  ${r.detail}`);
}
const okCount = results.filter((r) => r.status === "OK").length;
console.log(`\nSummary: ${okCount}/${results.length} providers reachable from this host`);
