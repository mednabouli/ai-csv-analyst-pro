# Testing Patterns

**Analysis Date:** 2026-04-20

## Test Framework

**Unit/Integration Runner:**
- Vitest 3.x
- Config: `vitest.config.ts`

**E2E Runner:**
- Playwright 1.59.x
- Config: `playwright.config.ts`

**Assertion Library:**
- Vitest built-in (`expect` from `vitest`) for unit tests
- Playwright built-in (`expect` from `@playwright/test`) for E2E

**Run Commands:**
```bash
pnpm test                  # Run all unit tests (vitest run)
pnpm test:watch            # Watch mode (vitest)
pnpm test:coverage         # Coverage report (vitest run --coverage)
pnpm test:e2e              # Run all E2E tests (playwright test)
pnpm test:e2e:ui           # Playwright interactive UI
pnpm test:e2e:debug        # Playwright debug mode
```

## Test File Organization

**Unit tests location:**
- Co-located in `__tests__/` subdirectories adjacent to source
- `lib/__tests__/` — tests for all `lib/` modules
- `lib/__tests__/rag/` — tests for `lib/rag/` submodules
- `lib/__tests__/observability/` — tests for `lib/observability/` submodules
- `app/actions/__tests__/` — tests for Server Actions
- `app/api/auth/__tests__/` — tests for API route handlers
- `lib/rag/__tests__/` — additional tests co-located with rag source

**E2E tests location:**
- `e2e/` at project root
- `e2e/fixtures/` — auth setup fixture (`auth.setup.ts`) and CSV fixture files
- `e2e/helpers/` — shared helpers (`auth.ts`)

**Naming:**
- Unit test files: `<module-name>.test.ts` — `billing.test.ts`, `chunk.test.ts`, `telemetry.test.ts`
- E2E test files: `<feature>.spec.ts` — `auth.spec.ts`, `billing.spec.ts`, `upload-chat.spec.ts`
- Auth setup: `auth.setup.ts` (matched by `/.*\.setup\.ts/` in Playwright config)

**Directory structure:**
```
lib/
  __tests__/
    vitest.setup.ts          # Global mock setup
    auth.test.ts
    billing.test.ts
    csrf.test.ts
    env.test.ts
    llm.test.ts
    redis.test.ts
    stripe.test.ts
    observability/
      telemetry.test.ts
    rag/
      chunk.test.ts
      strategy.test.ts
app/
  actions/__tests__/
    csrf.test.ts
  api/auth/__tests__/
    route.test.ts
lib/rag/__tests__/
  embed.test.ts
e2e/
  auth.spec.ts
  billing.spec.ts
  upload-chat.spec.ts
  fixtures/
    auth.setup.ts
    sample.csv
  helpers/
    auth.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("moduleName / featureName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset mutable shared state
  });

  it("describes expected behavior in plain English", () => {
    // arrange
    // act
    // assert
    expect(result).toBe(expected);
  });

  it("error condition description", async () => {
    await expect(fn()).rejects.toThrow("message");
  });
});
```

**Patterns:**
- `describe` blocks group by module export or feature area — `describe("parseCSV", ...)`, `describe("chunkRows", ...)`
- Individual `it` strings describe the concrete expected behavior — "returns correct rowCount and columnCount"
- `beforeEach(() => vi.clearAllMocks())` resets mock call state between tests
- Mutable test data arrays (e.g., `mockChunks`) are reset in `beforeEach` by setting `.length = 0` then repopulating
- Dynamic imports (`await import("@/lib/rag/strategy")`) used inside test bodies when mocks must be set up before module initialization

## Mocking

**Framework:** Vitest `vi.mock()` / `vi.fn()`

**Global mocks (applied to all unit tests via `lib/__tests__/vitest.setup.ts`):**
```typescript
// Next.js server APIs
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

// Sentry — prevent network calls
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  init: vi.fn(),
}));

// Langfuse — prevent network calls
vi.mock("langfuse", () => {
  const mockSpan = { end: vi.fn() };
  const mockTrace = {
    id: "test-trace-id",
    update: vi.fn(),
    span: vi.fn(() => mockSpan),
    flushAsync: vi.fn(() => Promise.resolve()),
  };
  return { Langfuse: vi.fn(() => ({ trace: vi.fn(() => mockTrace) })) };
});

// Database — mock entire @neondatabase/serverless
vi.mock("@neondatabase/serverless", () => ({
  neon: () => ({ query: vi.fn().mockResolvedValue({ rows: [] }) }),
}));

// Upstash Redis
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }) },
}));

// Stripe
vi.mock("stripe", () => ({
  default: class { customers = { create: vi.fn() }; checkout = { sessions: { create: vi.fn() } }; },
}));

// Vercel AI SDK embed
vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0, 1, 2] }),
  embedMany: vi.fn().mockResolvedValue({ embeddings: [[0, 1, 2], [3, 4, 5]] }),
}));
```

**Per-test mocks (in individual test files):**
```typescript
// Mock DB with controllable return data
const mockSelect = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelect })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockInsert })) })),
  },
}));

// Mock schema tables with string stubs
vi.mock("@/lib/db/schema", () => ({
  subscriptions: {},
  usageRecords: {},
}));

// Partial mock preserving real implementation
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, cosineDistance: vi.fn(() => "cosine_distance_expr") };
});
```

**What to Mock:**
- All network calls: database (Neon), Redis (Upstash), Sentry, Langfuse, Stripe SDK
- `next/headers` — `cookies()` and `headers()` (not available outside Next.js runtime)
- External AI provider SDKs when testing business logic around them
- `console.error` (silenced globally in `vitest.setup.ts`)

**What NOT to Mock:**
- Pure business logic in `lib/rag/chunk.ts` — `parseCSV` and `chunkRows` are tested against real CSV buffers
- Crypto operations in `lib/csrf.ts` — HMAC signing tested with real `crypto` module
- Zod schemas — tested with real parsing in `lib/env.ts`
- `lib/observability/telemetry.ts` — tested with mocked Langfuse/Sentry but real function logic

## Fixtures and Factories

**Test Data:**
```typescript
// Inline factory function pattern (chunk.test.ts)
function makeCSV(rows: Record<string, unknown>[], sep = ","): Buffer {
  const cols = Object.keys(rows[0] ?? {});
  const header = cols.join(sep);
  const body = rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(sep)).join("\n");
  return Buffer.from(`${header}\n${body}`, "utf-8");
}

// Large sample dataset built at module level
const SAMPLE_ROWS = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: +(Math.random() * 100).toFixed(2),
  category: ["Electronics", "Food", "Clothing"][i % 3],
  in_stock: i % 5 !== 0,
}));

// Mutable array reset in beforeEach for controllable DB mock returns
const mockChunks: Array<{ chunkText: string; chunkIndex: number }> = [];
beforeEach(() => {
  mockChunks.length = 0;
  for (let i = 0; i < 10; i++) mockChunks.push({ chunkText: `chunk-${i} data`, chunkIndex: i });
});
```

**E2E Fixtures:**
- `e2e/fixtures/sample.csv` — 20-row CSV used in upload/chat flow tests
- `e2e/fixtures/auth.setup.ts` — Playwright setup fixture that logs in and saves cookie state to `e2e/.auth/user.json`
- `e2e/helpers/auth.ts` — `TEST_USER` constants and `loginViaUI(page)` helper function

**Location:**
- Unit test factory functions: defined inline at the top of the test file
- E2E fixtures: `e2e/fixtures/`
- E2E helpers: `e2e/helpers/`

## Coverage

**Requirements:**
- Lines: 70% minimum
- Functions: 70% minimum
- Branches: 60% minimum
- Enforced via `vitest.config.ts` `thresholds`

**Coverage scope:**
- Included: `lib/**/*.ts`, `app/actions/**/*.ts`, `app/api/**/*.ts`
- Excluded: `lib/db/**` (schema/migrations), `lib/auth-client.ts`, `**/*.d.ts`

**View Coverage:**
```bash
pnpm test:coverage         # generates text + lcov + html reports
# HTML report output: coverage/ directory (open coverage/index.html)
```

**Provider:** `@vitest/coverage-v8` (V8 native coverage)

## Test Types

**Unit Tests (Vitest):**
- Scope: individual exported functions from `lib/` modules and Server Actions
- Test pure logic without network: CSV parsing, chunking, CSRF HMAC, billing plan config, LLM provider registry
- Mock all I/O (DB, Redis, Sentry, Langfuse, Stripe) via `vi.mock()`
- Environment: `node` (not jsdom — no browser APIs needed)

**Integration Tests (Vitest):**
- `parseCSV → chunkRows` integration in `lib/__tests__/rag/chunk.test.ts` tests the full pipeline together
- Strategy tests in `lib/__tests__/rag/strategy.test.ts` test RAG context building with mocked DB

**E2E Tests (Playwright):**
- Scope: full user flows against a running Next.js dev server (`pnpm dev`)
- Auth setup project runs first, saves `storageState` to `e2e/.auth/user.json`
- Chromium (desktop) and Mobile Chrome (Pixel 5) projects depend on auth setup
- Tests run fully parallel (`fullyParallel: true`)
- CI: 2 retries, 1 worker; local: 0 retries, unlimited workers
- `baseURL` defaults to `http://localhost:3000`; overridable via `BASE_URL` env var
- Auth tests explicitly clear `storageState` to test unauthenticated surfaces

## Common Patterns

**Async Testing:**
```typescript
// Async resolution
const result = await withTrace({ name: "test", fn: async () => 42 });
expect(result).toBe(42);

// Async rejection
await expect(
  withTrace({ name: "err", fn: async () => { throw new Error("boom"); } })
).rejects.toThrow("boom");
```

**Error Testing:**
```typescript
// Sync throws
expect(() => parseCSV(Buffer.from("", "utf-8"))).toThrow();

// Async throws  
await expect(fn()).rejects.toThrow("message");

// Mock call assertions after error
expect(Sentry.captureException).toHaveBeenCalledOnce();
expect(Sentry.captureException).not.toHaveBeenCalled();
```

**Export existence testing (smoke tests):**
```typescript
// Pattern used for auth, redis, stripe, env, embed modules
it("should export functionName", () => {
  expect(typeof module.functionName).toBe("function");
});
it("should export instanceName", () => {
  expect(module.instanceName).toBeDefined();
});
```

**E2E auth pattern:**
```typescript
// Tests requiring auth use storageState from auth setup (default)
// Tests requiring no-auth explicitly override:
test.use({ storageState: { cookies: [], origins: [] } });
```

**E2E file upload pattern:**
```typescript
const fileInput = page.locator('input[type="file"][name="file"]');
await fileInput.setInputFiles(path.join(__dirname, "fixtures/sample.csv"));
await page.waitForSelector("text=/file ready|sample\\.csv/i", { timeout: 30_000 });
```

## Vitest Configuration Details

- `globals: true` — `describe`, `it`, `expect`, `vi` available without imports (but tests still import explicitly for clarity)
- `include` pattern: `**/__tests__/**/*.test.ts` and `**/*.test.ts`
- `exclude`: `node_modules`, `.next`
- `setupFiles`: `./lib/__tests__/vitest.setup.ts` — runs before all test files
- tsconfig paths resolved via `vite-tsconfig-paths` plugin (enables `@/` alias in tests)
- Test environment: `node` (not browser)

---

*Testing analysis: 2026-04-20*
