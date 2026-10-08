/**
 * LLM provider contract (doc section 3): every provider sits behind this
 * interface so the router can fail over transparently.
 */
export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmRequest {
  messages: ChatMessage[];
  /** Ask the model to answer with a single JSON object. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlmResponse {
  text: string;
  model: string;
  provider: string;
}

export interface LLMProvider {
  readonly name: string;
  isConfigured(): boolean;
  chat(request: LlmRequest): Promise<LlmResponse>;
}

/** Extracts the first JSON object from a model response (with fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** fetch with timeout (AbortController). */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
