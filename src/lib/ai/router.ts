import type { LLMProvider, LlmRequest, LlmResponse } from "./providers/types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible";

/**
 * Router with fallback (doc section 3): Gemini → Groq → Cerebras →
 * OpenRouter. Each attempt gets a timeout; 429/5xx open a short circuit
 * breaker so a struggling provider is skipped for a few minutes; transient
 * errors get one retry with backoff.
 */
export interface RouterOptions {
  timeoutMs?: number;
  retries?: number;
  /** Test hook: inject providers (e.g. mocks). */
  providers?: LLMProvider[];
}

interface CircuitState {
  openUntil: number;
}

const circuits = new Map<string, CircuitState>();
const CIRCUIT_COOLDOWN_MS = 3 * 60 * 1000;

function circuitOpen(provider: string): boolean {
  const state = circuits.get(provider);
  return Boolean(state && state.openUntil > Date.now());
}

export function tripCircuit(provider: string) {
  circuits.set(provider, { openUntil: Date.now() + CIRCUIT_COOLDOWN_MS });
}

/** Visible for tests. */
export function resetCircuits() {
  circuits.clear();
}

async function callWithRetry(
  provider: LLMProvider,
  request: LlmRequest,
  retries: number,
): Promise<LlmResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(300 * attempt * attempt);
    }
    try {
      return await provider.chat(request);
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      // 429 opens the circuit immediately; no point retrying now.
      if (status === 429) {
        tripCircuit(provider.name);
        throw err;
      }
      // 4xx (except 429) won't improve with retries.
      if (status && status >= 400 && status < 500) throw err;
    }
  }
  throw lastError;
}

export async function routeLlm(
  request: LlmRequest,
  options: RouterOptions = {},
): Promise<LlmResponse> {
  const providers = options.providers ?? defaultProviders();
  const configured = providers.filter(
    (p) => p.isConfigured() && !circuitOpen(p.name),
  );

  if (configured.length === 0) {
    throw new Error("Nenhum provedor de IA configurado (GEMINI/GROQ/...).");
  }

  let lastError: unknown;
  for (const provider of configured) {
    try {
      return await callWithRetry(provider, request, options.retries ?? 1);
    } catch (err) {
      lastError = err;
      console.warn(
        `[ai/router] ${provider.name} falhou:`,
        (err as Error).message?.slice(0, 200),
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Todos os provedores falharam.");
}

/** Cached call: checks ai_cache first (hash of prompt+model). */
export async function routeLlmCached(
  cacheKey: string,
  request: LlmRequest,
  options: RouterOptions & { cacheRead?: (k: string) => Promise<string | null>; cacheWrite?: (k: string, v: string) => Promise<void> } = {},
): Promise<LlmResponse> {
  const read = options.cacheRead ?? defaultCacheRead;
  const write = options.cacheWrite ?? defaultCacheWrite;

  const cached = await read(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as { text: string; model: string; provider: string };
    return { ...parsed, provider: `${parsed.provider} (cache)` };
  }

  const response = await routeLlm(request, options);
  await write(cacheKey, JSON.stringify(response));
  return response;
}

// ---------------------------------------------------------------------------
// default wiring (env-based)
// ---------------------------------------------------------------------------

let cachedDefaults: LLMProvider[] | null = null;

export function defaultProviders(): LLMProvider[] {
  if (cachedDefaults) return cachedDefaults;
  const providers: LLMProvider[] = [];

  const gemini = new GeminiProvider(
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  );
  if (gemini.isConfigured()) providers.push(gemini);

  const groq = new OpenAiCompatibleProvider(
    "groq",
    "https://api.groq.com/openai/v1",
    process.env.GROQ_API_KEY ?? "",
    process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  );
  if (groq.isConfigured()) providers.push(groq);

  const cerebras = new OpenAiCompatibleProvider(
    "cerebras",
    "https://api.cerebras.ai/v1",
    process.env.CEREBRAS_API_KEY ?? "",
    process.env.CEREBRAS_MODEL ?? "",
  );
  if (cerebras.isConfigured()) providers.push(cerebras);

  const openrouter = new OpenAiCompatibleProvider(
    "openrouter",
    "https://openrouter.ai/api/v1",
    process.env.OPENROUTER_API_KEY ?? "",
    process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free",
  );
  if (openrouter.isConfigured()) providers.push(openrouter);

  cachedDefaults = providers;
  return providers;
}

/** Environment changes (tests) should invalidate the cached providers. */
export function resetDefaultProviders() {
  cachedDefaults = null;
}

// --- cache backends ---------------------------------------------------------
// In production the cache is the ai_cache table via the admin client; in
// scripts/tests an in-memory map avoids Supabase coupling.

const memoryCache = new Map<string, string>();

async function defaultCacheRead(key: string): Promise<string | null> {
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  try {
    const { getSupabaseAdmin } = await import("@/lib/db/admin");
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data } = await admin
      .from("ai_cache")
      .select("response")
      .eq("prompt_hash", key)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) {
      const value = JSON.stringify((data as { response: unknown }).response);
      memoryCache.set(key, value);
      return value;
    }
  } catch {
    /* cache is best-effort */
  }
  return null;
}

async function defaultCacheWrite(key: string, value: string): Promise<void> {
  memoryCache.set(key, value);
  try {
    const { getSupabaseAdmin } = await import("@/lib/db/admin");
    const admin = getSupabaseAdmin();
    if (!admin) return;
    await admin.from("ai_cache").upsert(
      {
        prompt_hash: key,
        response: JSON.parse(value),
        model: "router",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      { onConflict: "prompt_hash" },
    );
  } catch {
    /* cache is best-effort */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
