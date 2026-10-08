import { describe, expect, it, beforeEach } from "vitest";
import { routeLlm, resetCircuits, tripCircuit } from "@/lib/ai/router";
import { MockProvider } from "@/lib/ai/providers/openai-compatible";
import { ProviderError } from "@/lib/ai/providers/gemini";
import type { LLMProvider, LlmRequest, LlmResponse } from "@/lib/ai/providers/types";

function ok(name: string, text: string): LLMProvider {
  return {
    name,
    isConfigured: () => true,
    chat: async (): Promise<LlmResponse> => ({
      text,
      model: `${name}-model`,
      provider: name,
    }),
  };
}

function failing(name: string, status: number): LLMProvider {
  return {
    name,
    isConfigured: () => true,
    chat: async () => {
      throw new ProviderError(`${name} error`, status);
    },
  };
}

const REQUEST: LlmRequest = { messages: [{ role: "user", content: "oi" }] };

beforeEach(() => {
  resetCircuits();
});

describe("AI router", () => {
  it("uses the first healthy provider", async () => {
    const result = await routeLlm(REQUEST, {
      providers: [ok("a", "resposta A"), ok("b", "resposta B")],
    });
    expect(result.provider).toBe("a");
    expect(result.text).toBe("resposta A");
  });

  it("falls back when the first provider fails", async () => {
    const result = await routeLlm(REQUEST, {
      providers: [failing("a", 500), ok("b", "resposta B")],
    });
    expect(result.provider).toBe("b");
  });

  it("falls back on 429 AND opens the circuit breaker", async () => {
    const result = await routeLlm(REQUEST, {
      providers: [failing("a", 429), ok("b", "resposta B")],
    });
    expect(result.provider).toBe("b");

    // Circuit open: provider "a" is skipped entirely now (even if healthy).
    const healthyA = ok("a", "agora estou saudável");
    const second = await routeLlm(REQUEST, {
      providers: [healthyA, ok("b", "resposta B")],
    });
    expect(second.provider).toBe("b");
  });

  it("retries transient errors before giving up", async () => {
    let calls = 0;
    const flaky: LLMProvider = {
      name: "flaky",
      isConfigured: () => true,
      chat: async () => {
        calls += 1;
        if (calls === 1) throw new ProviderError("transiente", 503);
        return { text: "recuperei", model: "m", provider: "flaky" };
      },
    };
    const result = await routeLlm(REQUEST, { providers: [flaky], retries: 1 });
    expect(result.text).toBe("recuperei");
    expect(calls).toBe(2);
  });

  it("does NOT retry client errors (4xx)", async () => {
    let calls = 0;
    const bad: LLMProvider = {
      name: "bad",
      isConfigured: () => true,
      chat: async () => {
        calls += 1;
        throw new ProviderError("bad request", 400);
      },
    };
    await expect(
      routeLlm(REQUEST, { providers: [bad], retries: 2 }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("throws when every provider fails", async () => {
    await expect(
      routeLlm(REQUEST, {
        providers: [failing("a", 500), failing("b", 500)],
      }),
    ).rejects.toThrow();
  });

  it("skips providers with open circuits", async () => {
    tripCircuit("a");
    const result = await routeLlm(REQUEST, {
      providers: [ok("a", "não deveria"), ok("b", "resposta B")],
    });
    expect(result.provider).toBe("b");
  });

  it("mock provider returns registered responses", async () => {
    const mock = new MockProvider();
    mock.enqueue("oi", '{"reply": "olá!", "gave_answer": false}');
    const result = await routeLlm(REQUEST, { providers: [mock] });
    expect(result.text).toContain("olá!");
  });
});
