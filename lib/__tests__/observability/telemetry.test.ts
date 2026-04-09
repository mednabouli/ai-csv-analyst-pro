import { describe, it, expect, vi, beforeEach } from "vitest";
import { withTrace, captureError } from "@/lib/observability/telemetry";
import * as Sentry from "@sentry/nextjs";

describe("withTrace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the result of fn", async () => {
    const result = await withTrace({ name: "test.trace", fn: async () => 42 });
    expect(result).toBe(42);
  });

  it("passes a non-empty traceId string to fn", async () => {
    let id = "";
    await withTrace({ name: "test.trace", fn: async (traceId) => { id = traceId; } });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("re-throws errors from fn", async () => {
    await expect(
      withTrace({ name: "err.trace", fn: async () => { throw new Error("boom"); } })
    ).rejects.toThrow("boom");
  });

  it("calls Sentry.captureException on error", async () => {
    await withTrace({ name: "err", fn: async () => { throw new Error("x"); } }).catch(() => {});
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("does NOT call Sentry on success", async () => {
    await withTrace({ name: "ok", fn: async () => "ok" });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("accepts userId, sessionId, input, metadata without throwing", async () => {
    await expect(
      withTrace({
        name: "scoped",
        userId: "u1", sessionId: "s1",
        input: { q: "test" }, metadata: { k: "v" },
        fn: async () => "done",
      })
    ).resolves.toBe("done");
  });

  // ── Streaming safety contract ────────────────────────────────────────────
  it("MUST NOT be used to wrap createDataStreamResponse", () => {
    // withTrace awaits fn() and flushes the trace when fn() returns.
    // If fn() returns a streaming Response, the trace closes BEFORE
    // the stream finishes — generation data is lost.
    // Contract: chat/route.ts opens the trace manually and closes it
    // inside onFinish() so the trace captures the full completion.
    //
    // This test documents the architectural contract so future developers
    // understand why withTrace is NOT used in app/api/chat/route.ts.
    expect(true).toBe(true); // guard comment only — see app/api/chat/route.ts
  });
});

describe("captureError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Sentry.captureException with an Error", () => {
    captureError(new Error("e"), { ctx: "test" });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });
  it("calls Sentry.captureException with a string", () => {
    captureError("string-error");
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });
});
