import type { LLMProvider, LlmRequest, LlmResponse } from "./types";
import { fetchWithTimeout } from "./types";

/**
 * Google Gemini via the REST API (model name in GEMINI_MODEL).
 * Endpoint: generativelanguage.googleapis.com — OpenAI-compatible route
 * is not used to keep full control of JSON mode.
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.model);
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const user = request.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 4096,
        ...(request.json ? { responseMimeType: "application/json" } : {}),
      },
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    };

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      },
      request.timeoutMs ?? 30_000,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ProviderError(
        `Gemini ${response.status}: ${errorText.slice(0, 300)}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new ProviderError("Gemini: resposta vazia", 502);
    return { text, model: this.model, provider: this.name };
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
