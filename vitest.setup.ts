import { vi } from "vitest";

// ── Silence console.error in tests ──────────────────────────────────────────
vi.spyOn(console, "error").mockImplementation(() => {});

// ── Stub Next.js headers() ──────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

// ── Stub Sentry (no network in tests) ───────────────────────────────────────
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  init: vi.fn(),
  consoleIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

// ── Stub Langfuse (no network in tests) ─────────────────────────────────────
vi.mock("langfuse", () => {
  const mockSpan = { end: vi.fn() };
  const mockTrace = {
    id: "test-trace-id",
    update: vi.fn(),
    span: vi.fn(() => mockSpan),
    flushAsync: vi.fn(() => Promise.resolve()),
  };
  return {
    Langfuse: vi.fn(() => ({
      trace: vi.fn(() => mockTrace),
      span: vi.fn(() => mockSpan),
      generation: vi.fn(),
      on: vi.fn(),
      flushAsync: vi.fn(() => Promise.resolve()),
    })),
  };
});
