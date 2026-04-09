import { describe, it, expect, vi, beforeEach } from "vitest";
import { withTrace, captureError } from "@/lib/observability/telemetry";
import * as Sentry from "@sentry/nextjs";

describe("withTrace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the result of fn", async () => {
    const result = await withTrace({
      name: "test.trace",
      fn: async () => 42,
    });
    expect(result).toBe(42);
  });

  it("passes a traceId string to fn", async () => {
    let receivedId: string | undefined;
    await withTrace({
      name: "test.trace",
      fn: async (id) => {
        receivedId = id;
      },
    });
    expect(typeof receivedId).toBe("string");
    expect(receivedId!.length).toBeGreaterThan(0);
  });

  it("re-throws error from fn", async () => {
    await expect(
      withTrace({
        name: "error.trace",
        fn: async () => { throw new Error("boom"); },
      })
    ).rejects.toThrow("boom");
  });

  it("calls Sentry.captureException on error", async () => {
    await withTrace({
      name: "error.trace",
      fn: async () => { throw new Error("sentry-test"); },
    }).catch(() => {});
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("does not call Sentry on success", async () => {
    await withTrace({ name: "ok.trace", fn: async () => "ok" });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("accepts optional userId and sessionId without throwing", async () => {
    await expect(
      withTrace({
        name: "scoped.trace",
        userId: "user-123",
        sessionId: "sess-456",
        input: { query: "test" },
        fn: async () => "done",
      })
    ).resolves.toBe("done");
  });
});

describe("captureError", () => {
  it("calls Sentry.captureException", () => {
    captureError(new Error("test-error"), { context: "unit-test" });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("accepts non-Error values", () => {
    captureError("string-error");
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });
});
