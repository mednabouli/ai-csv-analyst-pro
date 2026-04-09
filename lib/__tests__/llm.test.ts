import { describe, it, expect } from "vitest";
import { PROVIDERS, PROVIDER_META } from "@/lib/llm";

describe("PROVIDERS", () => {
  it("default provider exists", () => {
    expect(PROVIDERS.default).toBeDefined();
  });

  it("all keys in PROVIDER_META exist in PROVIDERS", () => {
    const metaKeys = Object.keys(PROVIDER_META);
    const providerKeys = Object.keys(PROVIDERS);
    metaKeys.forEach((k) => {
      expect(providerKeys).toContain(k);
    });
  });

  it("every provider has label, badge and tag in meta", () => {
    Object.entries(PROVIDER_META).forEach(([key, meta]) => {
      expect(meta.label, `${key} missing label`).toBeTruthy();
      expect(meta.badge, `${key} missing badge`).toBeTruthy();
      expect(meta.tag, `${key} missing tag`).toBeTruthy();
    });
  });

  it("gemma26b is tagged as Free", () => {
    expect(PROVIDER_META.gemma26b.badge).toBe("Free");
  });

  it("claude is tagged as Paid", () => {
    expect(PROVIDER_META.claude.badge).toBe("Paid");
  });

  it("local providers are tagged as Local", () => {
    expect(PROVIDER_META.gemma_local_2b.badge).toBe("Local");
    expect(PROVIDER_META.gemma_local_4b.badge).toBe("Local");
    expect(PROVIDER_META.gemma_local_26b.badge).toBe("Local");
  });
});
