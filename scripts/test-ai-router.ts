/**
 * Live test of the app's own AI router cascade (routeLlm) with the real keys
 * from .env. Expected in the sandbox: Gemini (400 geo) and Groq (403 geo)
 * fail fast, OpenRouter (nemotron-3-super-120b-a12b:free) serves the request.
 * Run: bun scripts/test-ai-router.ts
 */
import { defaultProviders, resetCircuits, routeLlm } from "../src/lib/ai/router";

const providers = defaultProviders();
console.log(
  "Cascata configurada:",
  providers.map((p) => p.name).join(" -> "),
);

// Simple factual JSON request (like the content pipeline makes).
const t0 = Date.now();
try {
  const res = await routeLlm({
    messages: [
      {
        role: "user",
        content:
          'Responda SOMENTE com um objeto JSON no formato {"capital": "..."} — qual é a capital do Brasil?',
      },
    ],
    json: true,
    maxTokens: 2000,
  });
  const ms = Date.now() - t0;
  console.log(`\nAtendido por: ${res.provider} | modelo: ${res.model} | ${ms}ms`);
  console.log(`Resposta: ${res.text.slice(0, 300)}`);

  // Second call — circuit breakers should skip the failed providers instantly.
  resetCircuits();
  const t1 = Date.now();
  const res2 = await routeLlm({
    messages: [
      { role: "user", content: 'Responda SOMENTE JSON {"area": "..."} — qual área da matemática estuda derivadas?' },
    ],
    json: true,
    maxTokens: 2000,
  });
  console.log(`\nSegunda chamada: ${res2.provider} (${res2.model}) em ${Date.now() - t1}ms`);
  console.log(`Resposta: ${res2.text.slice(0, 300)}`);
  console.log("\nROUTER CASCADE: OK");
} catch (e) {
  console.error("\nROUTER FALHOU:", (e as Error).message);
  process.exit(1);
}
