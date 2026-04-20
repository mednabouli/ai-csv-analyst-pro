# Codebase Concerns

**Analysis Date:** 2026-04-20

## Tech Debt

**Deprecated `DashboardClient` + `ChatPanel` still present:**
- Issue: `ChatPanel` is a stub returning `null`, marked `@deprecated`. `DashboardClient` still imports it and renders the old two-column layout that is never used.
- Files: `app/dashboard/_components/ChatPanel.tsx`, `app/dashboard/_components/DashboardClient.tsx`
- Impact: Dead code confuses contributors; `DashboardClient` is never rendered but still ships in the bundle.
- Fix approach: Delete both files. Confirm neither is referenced from any live page (they are not — confirmed by inspection).

**`sizeBytes: 0` hardcoded in optimistic upload state:**
- Issue: When a new upload completes, the optimistic `SessionRow` inserted into the sidebar is created with `sizeBytes: 0` instead of the actual file size.
- Files: `app/dashboard/_components/DashboardShell.tsx` line 58
- Impact: The sidebar shows "0 B" for every freshly-uploaded file until a page reload. `UploadState` already carries `file.size` — it just isn't forwarded.
- Fix approach: Return `sizeBytes: file.size` from `uploadCSVAction` in `app/actions/upload.ts` and use it when constructing `newSess`.

**`UploadZone` success text contains garbled characters:**
- Issue: Line 64 of `app/dashboard/_components/UploadZone.tsx` reads `705 {state.fileName} 014 {state.rowCount?.toLocaleString()} rows ready` — the `705` and `014` are visible corruption artifacts (likely unicode escapes rendered as numeric codes).
- Files: `app/dashboard/_components/UploadZone.tsx` line 64
- Impact: The `UploadZone` component (the standalone upload card) displays garbled success text, breaking the UI for any surface that renders it directly.
- Fix approach: Replace with clean copy, e.g. `{state.fileName} — {state.rowCount?.toLocaleString()} rows ready`.

**Garbled text in `DashboardShell` header row count display:**
- Issue: Line 166 of `DashboardShell.tsx` renders `{activeSession.rowCount.toLocaleString()} rows  b7 {activeSession.columnCount} cols` — the `b7` is a stray corruption artifact in the display string.
- Files: `app/dashboard/_components/DashboardShell.tsx` line 166
- Impact: Visible to every authenticated user in the top header bar once a session is active.
- Fix approach: Replace `b7` with a proper separator such as `·`.

**Non-atomic usage counter increments (race condition):**
- Issue: `incrementUsage()` reads the current count, adds 1 in application code, then writes back. Under concurrent requests (e.g. rapid-fire chat queries) the read-modify-write cycle can yield duplicate counts.
- Files: `lib/billing.ts` lines 119–127
- Impact: Users could exceed plan limits without being blocked, or usage could be silently under-counted.
- Fix approach: Replace with a SQL-level atomic increment: `uploadsUsed: sql\`${usageRecords.uploadsUsed} + 1\`` etc., removing the prior `getCurrentUsage` fetch from this function.

**`enterprise` plan in DB enum but missing from `PLANS` config:**
- Issue: `lib/db/schema.ts` defines `planEnum` with `["free", "starter", "pro", "enterprise"]`, but `lib/stripe.ts` only defines `PLANS` for `free | starter | pro`. Casting `sub.planName` to `PlanKey` in `lib/billing.ts` will silently fall through to `undefined` for any enterprise row.
- Files: `lib/db/schema.ts` line 12, `lib/stripe.ts` lines 4–54, `lib/billing.ts` line 61
- Impact: A user ever assigned `enterprise` plan would cause a runtime crash (`plan.maxFileSizeMb` on `undefined`).
- Fix approach: Either add an `enterprise` entry to `PLANS` or remove it from `planEnum` if it is not yet launched.

**`cron/reset-usage` route is a no-op stub:**
- Issue: The monthly usage reset cron route (`app/api/cron/reset-usage/route.ts`) contains no actual reset logic — it only responds with a static message. Old `usageRecords` rows are never purged or archived.
- Files: `app/api/cron/reset-usage/route.ts`
- Impact: `usageRecords` table grows unboundedly. More critically, if the auto-create logic in `getCurrentUsage` ever fails to match the date window correctly, stale records could be returned.
- Fix approach: Implement actual archival or deletion of prior-period rows. At minimum, add a DELETE for records older than N months.

**`UploadZone` drag-and-drop UI is cosmetic only:**
- Issue: `UploadZone` and the `UploadArea` inner component in `DashboardShell` advertise "Drag & drop" in their UI, but no `onDrop`, `onDragOver`, or `onDragEnter` handlers are implemented. The browser's native file-dialog is the only working path.
- Files: `app/dashboard/_components/UploadZone.tsx`, `app/dashboard/_components/DashboardShell.tsx` lines 331–358
- Impact: UX expectation mismatch — drag-and-drop does nothing, frustrating users.
- Fix approach: Add `onDrop`/`onDragOver` handlers to the `<label>` element that populate a `FileList` and call `action(appendCsrf(fd))`.

## Known Bugs

**`verify-email` resend form is a fake stub:**
- Symptoms: Clicking "Resend verification" simulates a delay with `setTimeout`, sets `sent=true`, and displays "Verification email sent" — but never actually calls any API or server action.
- Files: `app/verify-email/page.tsx` lines 93–97 (marked with `// TODO`)
- Trigger: Any user with an expired or missing verification link who attempts to resend.
- Workaround: None — users must request a new verification link through other means or rely on the original email.

**`lib/redis.ts` crashes on module load when env vars are absent:**
- Symptoms: `Redis.fromEnv()` is called unconditionally at module load time. If `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are not set, `@upstash/redis` throws during import.
- Files: `lib/redis.ts` lines 1–11, `app/api/health/route.ts` line 4
- Trigger: The `/api/health` endpoint imports `lib/redis` directly. In an environment without Redis configured, this crashes the health check entirely.
- Workaround: `proxy.ts` uses a lazy-init pattern with `hasRedis` guard — the same guard is absent in `lib/redis.ts`.

## Security Considerations

**Non-null assertion on `stripe-signature` header:**
- Risk: `req.headers.get("stripe-signature")!` in the Stripe webhook handler uses a TypeScript non-null assertion. If Stripe sends a request without this header (misconfiguration, replay, or test probe), `constructEvent` receives `null` cast to `string`, which may produce an uninformative error rather than a clean 400.
- Files: `app/api/webhooks/stripe/route.ts` line 13
- Current mitigation: `constructEvent` will still throw and return 400, but the error message may be unclear.
- Recommendations: Replace `!` with an explicit null check: `if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 })`.

**Langfuse keys accessed with non-null assertion without env validation:**
- Risk: `process.env.LANGFUSE_PUBLIC_KEY!` and `process.env.LANGFUSE_SECRET_KEY!` are used in `lib/observability/langfuse.ts` but both are declared `optional` in `lib/env.ts`. If absent, Langfuse silently initialises with `undefined` keys and may leak trace data or throw at runtime.
- Files: `lib/observability/langfuse.ts` lines 8–9, `lib/env.ts` lines 46–47
- Current mitigation: None — Langfuse client is initialised unconditionally.
- Recommendations: Guard `getLangfuse()` with a no-op stub when keys are absent, or add the keys as conditionally required in `lib/env.ts` when `NODE_ENV === "production"`.

**No idempotency key on Stripe webhook events:**
- Risk: Stripe retries webhook delivery on network errors. The `checkout.session.completed` handler performs an upsert (`onConflictDoUpdate`) which is safe, but `customer.subscription.updated` and `customer.subscription.deleted` use plain `UPDATE` with no event deduplication. Replayed events could re-apply status changes out of order.
- Files: `app/api/webhooks/stripe/route.ts` lines 53–91
- Current mitigation: The upsert on `checkout.session.completed` is safe; other handlers have no guard.
- Recommendations: Store processed event IDs in Redis or the DB and skip already-seen events.

**Rate limiting bypassed on `/api/chat` by design:**
- Risk: The proxy middleware applies rate limiting only when Redis is configured. `/api/chat` is behind auth but has no per-user rate limit at the application layer — only the billing query-count check per month. A burst of requests in a short window will all pass until the monthly quota is consumed (or time out the serverless function).
- Files: `proxy.ts` lines 55–64, `app/api/chat/route.ts`
- Current mitigation: Monthly billing limit exists but is not a burst guard.
- Recommendations: Add a per-user sliding window rate limit (e.g., 10 requests/minute) via Upstash inside the chat route or the proxy, keyed on `session.user.id` rather than IP.

## Performance Bottlenecks

**Single-call `embedMany` for all chunks with no batching:**
- Problem: `generateEmbeddings()` passes all chunks to `embedMany` in a single call. For the Pro plan's 1,000,000-row limit with 50 rows/chunk, this produces 20,000 embeddings in one API call, likely exceeding the OpenAI `text-embedding-3-small` batch limit (2048 inputs) and causing a 400 error.
- Files: `lib/rag/embed.ts` lines 11–14, `app/actions/upload.ts` line 76
- Cause: No chunked batching of the `texts` array before calling `embedMany`.
- Improvement path: Split `texts` into batches of ≤2048, call `embedMany` per batch, and concatenate results. Also consider streaming inserts rather than a single `tx.insert` for all chunks.

**Full CSV context injected into system prompt without summarisation:**
- Problem: For `LARGE_CTX_PROVIDERS` (Gemma 4 variants), `buildRAGContext` returns the raw concatenated text of every chunk up to 800,000 characters. This is passed verbatim into the `system` prompt of every chat turn, inflating token usage and latency on every message — not just the first.
- Files: `app/api/chat/route.ts` lines 82–87, `lib/rag/strategy.ts` lines 25–38
- Cause: Full-context path makes no attempt to summarise or compress the CSV text.
- Improvement path: Cache the context per `sessionId` (Redis or in-memory LRU) and avoid recomputing it on every message. For very large CSVs always use vector search even on large-context models.

**No auto-scroll in chat message list:**
- Problem: The message list div (`DashboardShell.tsx` lines 220–282) uses `overflow-y-auto` but has no `useEffect`/`useRef` to scroll to the bottom when new messages arrive or the AI streams tokens. Users must manually scroll down.
- Files: `app/dashboard/_components/DashboardShell.tsx` lines 220–282
- Cause: Missing `useRef` + `useEffect` scroll-to-bottom logic.
- Improvement path: Add `const bottomRef = useRef<HTMLDivElement>(null)` at the end of the messages list, and `useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, isLoading])`.

**Cursor-based pagination uses `createdAt` timestamp (non-unique):**
- Problem: `getMoreSessionsAction` paginates using `lt(sessions.createdAt, cursor)`. Two sessions created in the same millisecond share the same cursor value, causing one to be silently skipped.
- Files: `app/actions/sessions.ts` lines 60–74
- Cause: `createdAt` is not guaranteed unique; a composite cursor `(createdAt, id)` is needed.
- Improvement path: Change pagination to `WHERE (created_at, id) < (cursor_ts, cursor_id)` using a composite cursor.

## Fragile Areas

**`DashboardShell` is a 362-line monolithic client component:**
- Files: `app/dashboard/_components/DashboardShell.tsx`
- Why fragile: A single file holds upload state, chat state, sidebar state, provider selection, CSRF, toast notifications, and rendering of all panels. Any state change re-renders the entire shell.
- Safe modification: Isolate state slices into custom hooks (`useUpload`, `useChat` already from AI SDK). Extract `UploadArea` (already a local function) and the message list into separate files.
- Test coverage: No unit tests for this component; only covered incidentally by E2E upload-chat spec.

**`buildRAGContext` fallback path runs a second DB query unconditionally:**
- Files: `lib/rag/strategy.ts` lines 61–69
- Why fragile: When vector similarity returns no results above the threshold, a fallback query runs without threshold and returns the `TOP_K` closest chunks regardless. If embeddings are misconfigured or all-zero, every query silently degrades to returning arbitrary chunks with no user-visible indication.
- Safe modification: Log a warning when the fallback path is taken; consider surfacing a "low confidence context" signal to the model prompt.
- Test coverage: The vitest strategy test mocks the DB and does not exercise the threshold path.

**`lib/redis.ts` always initialises at module load:**
- Files: `lib/redis.ts`
- Why fragile: Unlike `proxy.ts` which lazily inits Redis only when env vars exist, `lib/redis.ts` calls `Redis.fromEnv()` at import time. Any module importing it in a non-Redis environment (tests, health route in dev) will throw at module load rather than at call time.
- Safe modification: Wrap in a lazy getter function matching the pattern in `proxy.ts`.
- Test coverage: `lib/__tests__/redis.test.ts` imports the module directly — it relies on the vitest setup mocking `@upstash/redis`.

## Scaling Limits

**OpenAI embedding API: single call for all chunks:**
- Current capacity: Works for small/medium CSVs (free plan: 5,000 rows = 100 chunks; starter: 100,000 rows = 2,000 chunks).
- Limit: Fails at ~2,048 chunks (Pro plan: 1,000,000 rows = 20,000 chunks) due to OpenAI `embedMany` input limit.
- Scaling path: Batch `embedMany` calls in groups of ≤2,048.

**Serverless function timeout on large uploads:**
- Current capacity: `maxDuration = 60` seconds on the chat route. Upload action has no explicit timeout.
- Limit: Embedding 20,000 chunks serially through the OpenAI API will exceed 60 seconds. The Vercel default for serverless functions (non-streaming) is also 60 seconds.
- Scaling path: Move embedding generation to a background job (Vercel Queue, inngest) triggered after initial parse-and-store.

**Neon connection pool exhaustion on concurrent uploads:**
- Current capacity: Each upload opens a DB transaction that inserts all chunks in a single statement. On a busy Pro instance with many concurrent users uploading million-row CSVs, this can hold connections for several seconds.
- Limit: Neon serverless has a default connection pool of 10–20 per branch.
- Scaling path: Use `db.insert().values()` in batches with connection release between batches; or offload to a queue.

## Dependencies at Risk

**`next ^16.0.0` — very new major version:**
- Risk: Next.js 16 is the newest major release; ecosystem tooling (e.g. ESLint config, some shadcn/ui primitives) may not yet fully support it.
- Impact: Build warnings or subtle runtime differences vs. documented Next.js 15 behaviour.
- Migration plan: Pin to a specific `16.x.x` version rather than `^16`; audit release notes.

**`ollama-ai-provider ^1.0.0` — pre-stable ecosystem:**
- Risk: The Ollama Vercel AI provider is a community package with limited maintenance history. Its API surface may change before reaching v1 stability in the broader ecosystem.
- Impact: Local provider model IDs (`gemma4:e2b`, `gemma4:26b`) are not standard Ollama tag names; they may not resolve on end-user installations.
- Migration plan: Document exact `ollama pull` commands required; add a runtime check that the Ollama server is reachable before surfacing local models.

## Missing Critical Features

**Account settings / profile page absent:**
- Problem: The Terms of Service (`app/terms/page.tsx` line 150) explicitly states users can delete their account from "account settings", but no `/settings` or `/account` route exists.
- Blocks: GDPR/legal compliance around data deletion; user trust.

**No chart or data visualisation support:**
- Problem: The product goal mentions "charts" as a first-class deliverable, but no charting library (Recharts, Chart.js, Observable Plot) is installed and no visualisation components exist.
- Blocks: Core product value proposition; AI answers cannot include inline charts.

**Email verification resend is unimplemented (stub):**
- Problem: See Known Bugs above. Users with expired verification tokens have no working path to re-verify.
- Blocks: User onboarding for production email flows.

**No CSV export of analysis results:**
- Problem: `ExportButton` exports chat transcript as Markdown or plain text. There is no option to export AI-generated data summaries, computed aggregates, or filtered datasets back to CSV.
- Blocks: Core "exportable insights" product goal.

## Test Coverage Gaps

**`DashboardShell` has no unit tests:**
- What's not tested: Upload state transitions, provider selection, session switching, sidebar sync after delete/rename.
- Files: `app/dashboard/_components/DashboardShell.tsx`
- Risk: Regressions in the primary interaction surface go undetected until E2E tests run.
- Priority: High

**`incrementUsage` race condition path untested:**
- What's not tested: Concurrent calls to `incrementUsage` — only sequential mock-based calls are tested.
- Files: `lib/billing.ts`, `lib/__tests__/billing.test.ts`
- Risk: The non-atomic read-modify-write pattern silently undercounts under load.
- Priority: High

**Stripe webhook handler event processing untested:**
- What's not tested: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` event processing paths.
- Files: `app/api/webhooks/stripe/route.ts`
- Risk: Subscription status bugs go undetected; users may retain or lose access incorrectly.
- Priority: High

**`buildRAGContext` similarity threshold path not exercised:**
- What's not tested: The fallback query that runs when no chunks meet the `SIMILARITY_THRESHOLD = 0.6`. The mock in `lib/__tests__/rag/strategy.test.ts` returns data regardless of threshold.
- Files: `lib/rag/strategy.ts`, `lib/__tests__/rag/strategy.test.ts`
- Risk: Silent context degradation in production when queries are semantically distant from the uploaded data.
- Priority: Medium

**`verify-email` resend flow untested:**
- What's not tested: The resend form submit path — it is a stub and cannot be tested end-to-end until implemented.
- Files: `app/verify-email/page.tsx`
- Risk: Email verification regression goes unnoticed.
- Priority: Medium

---

*Concerns audit: 2026-04-20*
