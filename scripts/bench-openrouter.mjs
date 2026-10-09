/**
 * Bench candidate OpenRouter :free models for the StudyMoon content pipeline:
 * a small structured-JSON generation task in Portuguese (ENEM style).
 * Usage: node scripts/bench-openrouter.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const env = {};
for (const line of readFileSync(path.join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.OPENROUTER_API_KEY;

const MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "thinkingmachines/inkling:free",
];

const PROMPT = `Gere UMA questão estilo ENEM de Matemática (topic: probabilidade básica) como JSON estrito, sem texto fora do JSON.
Schema: {"enunciado": string, "alternativas": [5 strings rotuladas A-E no início], "correta": "A"|"B"|"C"|"D"|"E", "explicacao": string}
Requisitos: enunciado com contexto real brasileiro, 4 distratores plausíveis, explicação passo a passo em 2-3 frases.`;

async function bench(model) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: PROMPT }],
        max_tokens: 900,
        temperature: 0.7,
      }),
    });
    const ms = Date.now() - t0;
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* raw */ }
    const content = body?.choices?.[0]?.message?.content ?? "";
    // try to parse the JSON out of the reply (allowing ```json fences)
    const m = content.match(/\{[\s\S]*\}/);
    let parsed = null, jsonOk = false, has5 = false, corretaOk = false;
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
        jsonOk = true;
        has5 = Array.isArray(parsed.alternativas) && parsed.alternativas.length === 5;
        corretaOk = /^[A-E]$/.test(parsed.correta ?? "");
      } catch { jsonOk = false; }
    }
    const usage = body?.usage;
    return {
      model, httpOk: res.ok, status: res.status, ms,
      jsonOk, has5, corretaOk,
      chars: content.length,
      usage: usage ? `${usage.prompt_tokens}p/${usage.completion_tokens}c` : "-",
      err: res.ok ? null : text.slice(0, 200),
    };
  } catch (e) {
    return { model, httpOk: false, status: "ERR", ms: Date.now() - t0, err: String(e).slice(0, 120) };
  } finally {
    clearTimeout(to);
  }
}

console.log("Model | HTTP | ms | JSON válido | 5 alternativas | correta ok | tokens | obs");
for (const m of MODELS) {
  const r = await bench(m);
  console.log(
    `${r.model} | ${r.httpOk ? r.status : "FAIL " + r.status} | ${r.ms}ms | ${r.jsonOk ? "SIM" : "NAO"} | ${r.has5 ? "SIM" : "NAO"} | ${r.corretaOk ? "SIM" : "NAO"} | ${r.usage} | ${r.err ?? (r.chars + " chars")}`,
  );
}
