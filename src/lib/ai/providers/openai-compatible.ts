import type { LLMProvider, LlmRequest, LlmResponse } from "./types";
import { fetchWithTimeout } from "./types";
import { ProviderError } from "./gemini";

/**
 * OpenAI-compatible providers: Groq, Cerebras and OpenRouter share the same
 * chat/completions contract — only the base URL and env differ.
 */
export class OpenAiCompatibleProvider implements LLMProvider {
  constructor(
    readonly name: "groq" | "cerebras" | "openrouter",
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.model);
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages.map((m) => ({
        role: m.role === "system" ? "system" : "user",
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
    };

    const response = await fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      request.timeoutMs ?? 30_000,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ProviderError(
        `${this.name} ${response.status}: ${errorText.slice(0, 300)}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new ProviderError(`${this.name}: resposta vazia`, 502);
    return { text, model: this.model, provider: this.name };
  }
}

/** Deterministic provider for unit tests and offline development. */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  private responses = new Map<string, string>();

  isConfigured(): boolean {
    return true;
  }

  /** Registers a canned response keyed by the first user message. */
  enqueue(userKey: string, response: string) {
    this.responses.set(userKey, response);
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const firstUser = request.messages.find((m) => m.role === "user")?.content ?? "";
    const text =
      this.responses.get(firstUser) ??
      this.responses.get("*") ??
      '{"ok": true, "note": "mock"}';
    return { text, model: "mock-model", provider: this.name };
  }
}
