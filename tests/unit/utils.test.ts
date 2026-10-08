import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class merge utility)", () => {
  it("merges conditional classes", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("last conflicting class wins (tailwind-merge)", () => {
    expect(cn("p-4", "p-6")).toBe("p-6");
  });
});
