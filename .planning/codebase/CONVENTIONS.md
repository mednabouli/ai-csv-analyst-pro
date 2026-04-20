# Coding Conventions

**Analysis Date:** 2026-04-20

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `DashboardShell.tsx`, `CSVPreview.tsx`, `MarkdownMessage.tsx`
- Utility/lib modules: camelCase `.ts` — `billing.ts`, `csrf.ts`, `telemetry.ts`
- Next.js App Router files: lowercase reserved names — `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`
- Hooks: `use-` prefix, kebab-case — `use-csrf.ts`, `use-toast.ts`
- Test files: `*.test.ts` inside `__tests__/` subdirectories adjacent to source

**Functions:**
- Server Actions: `camelCase` with `Action` suffix — `uploadCSVAction`, `deleteSessionAction`, `getCsrfTokenAction`
- API Route handlers: standard HTTP verbs exported as named constants — `export async function POST(...)`, `export async function GET(...)`
- Library utilities: `camelCase` descriptive verbs — `getOrCreateSubscription`, `checkUploadLimit`, `buildRAGContext`, `issueCsrfToken`, `validateCsrf`
- Helper functions (private): `camelCase`, no suffix — `makeToken`, `isTokenValid`, `csrfForm`
- React components: PascalCase — `DashboardShell`, `UploadArea`, `SessionSidebar`
- Hooks: `use` prefix camelCase — `useCsrf`, `useToast`

**Variables and Constants:**
- Module-level configuration objects: `SCREAMING_SNAKE_CASE` — `PROVIDERS`, `PROVIDER_META`, `PLANS`, `SUGGESTION_CHIPS`, `PAGE_SIZE`, `CSRF_FIELD`
- Local variables and parameters: `camelCase`
- Unused parameters that must be declared: `_` prefix — `_prev`, `_user`, `_setSidebarHasMore`
- Type union discriminants use object property pattern — `{ allowed: true } | { allowed: false; reason: string }`

**Types and Interfaces:**
- Exported types: PascalCase with descriptive noun — `UploadState`, `LimitCheckResult`, `SessionRow`, `SessionPage`, `TraceParams`, `ProviderKey`, `PlanKey`
- Component prop interfaces: `Props` (local to file, not exported)
- Zod schemas: `camelCase` with `Schema` suffix — `envSchema`
- Database enums: `camelCase` with `Enum` suffix — `planEnum`, `subStatusEnum`

## Code Style

**Formatting:**
- Tool: Prettier 3.x
- Print width: 100 characters
- Indent: 2 spaces
- Quotes: double quotes (`"`) — enforced by `.prettierrc`
- Semicolons: required
- Trailing commas: `es5` (objects/arrays yes, function parameters no)
- Tailwind class sorting: `prettier-plugin-tailwindcss` auto-sorts class lists

**Linting:**
- ESLint 9 with `eslint-config-next` + `typescript-eslint`
- `@typescript-eslint/no-unused-vars`: error — unused vars must be prefixed `_`
- `@typescript-eslint/no-explicit-any`: error — no `any` allowed
- `@typescript-eslint/consistent-type-imports`: error — use `import type` for type-only imports
- `no-console`: warn (only `console.warn` and `console.error` allowed)
- `prefer-const`: error
- `no-var`: error
- E2E and scripts directories are excluded from lint

**TypeScript:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2022
- Module resolution: `bundler`
- Path alias: `@/*` maps to project root — use `@/lib/...`, `@/app/...`, `@/hooks/...`

## Import Organization

**Order (enforced by `eslint-config-next`):**
1. External packages — `import { streamText } from "ai"`
2. Internal aliases — `import { db } from "@/lib/db"`, `import { auth } from "@/lib/auth"`
3. Relative imports — `import { SessionSidebar } from "./SessionSidebar"`

**Type imports:**
- Use `import type` for type-only imports (enforced by ESLint rule) — `import type { Message } from "ai"`, `import type Stripe from "stripe"`

**Path Aliases:**
- `@/*` — project root alias; use for all cross-directory imports
- Never use relative `../../` paths across module boundaries

## Error Handling

**Server Actions:**
- Return typed error payloads rather than throwing — `return { error: "Not authenticated" }`
- Return shape mirrors success shape with optional `error` and `upgradeRequired` fields
- `UploadState` union type: `{ error?: string; upgradeRequired?: boolean; sessionId?: string; ... } | null`

**API Routes:**
- Return `Response` with appropriate HTTP status codes — `new Response("Unauthorized", { status: 401 })`
- Billing limit failures return 402 with JSON body including `upgradeRequired: true`
- Catch JSON parse errors inline — `.catch(() => null)` then null-check

**Library functions:**
- Async errors propagate via thrown exceptions in utility functions (`issueCsrfToken`, `validateCsrf`)
- CSRF validation throws an augmented Error: `Object.assign(new Error("..."), { csrf: true, status: 403 })`
- `withTrace` re-throws after logging to Langfuse + Sentry — callers must handle
- Fire-and-forget async operations use `.catch(() => {})` — e.g., `langfuse.flushAsync().catch(() => {})`

**Client Components:**
- Errors surfaced via `useToast` hook with `variant: "error"` — never bare `alert()`
- `useActionState` for Server Action error propagation to UI

## Logging

**Framework:** Sentry (`@sentry/nextjs`) for error capture; Langfuse for LLM observability; `console.warn` / `console.error` only

**Patterns:**
- `Sentry.captureException(err, { tags: { scope: "...", traceId: "..." } })` — always include `scope` tag
- `captureError(err, ctx)` utility in `lib/observability/telemetry.ts` for fire-and-forget error capture
- `console.warn` only in dev-mode setup (`lib/env.ts`) for missing optional env vars
- No `console.log` in source — banned by ESLint
- All LLM calls traced via `withTrace` or manual Langfuse `trace` + `span` + `generation` calls

## Comments

**When to Comment:**
- Architectural contracts and non-obvious decisions get block comments — see `app/api/chat/route.ts` explaining why `withTrace` must NOT wrap `createDataStreamResponse`
- Section dividers use `// ── Section Name ──` style (80-char dashes)
- Inline fixups annotated with `// ── FIX N: description` pattern to explain why a workaround exists
- JSDoc on public exported functions — `lib/csrf.ts`, `lib/observability/telemetry.ts` use `/** ... */` blocks
- `@deprecated` JSDoc on stale files kept for import compatibility — `app/dashboard/_components/ChatPanel.tsx`

**JSDoc/TSDoc:**
- Used on all exported lib functions — describes purpose, parameters, important behavioral contracts
- Component files do not require JSDoc; complex state logic gets inline comments

## Function Design

**Size:** Functions stay small and single-purpose; large orchestration functions (`uploadCSVAction`, `POST` in chat route) are split into labeled sections with divider comments

**Parameters:**
- Prefer named object params for functions with 3+ arguments — `withTrace({ name, userId, fn })`
- Server Actions always receive `(_prev: State, formData: FormData)` signature for `useActionState` compatibility
- Unused first param named `_prev`

**Return Values:**
- Explicit return types on all exported functions
- Discriminated unions for results that can succeed or fail — `LimitCheckResult`, `UploadState`
- Async functions always return `Promise<T>` with explicit `T`

## Module Design

**Exports:**
- Named exports throughout — no default exports in lib or actions
- Next.js pages and layouts use default exports (framework requirement)
- API route handlers use named exports (`GET`, `POST`, `PUT`, `DELETE`)
- Constants exported as `const` objects at module level — `PROVIDERS`, `PLANS`, `PROVIDER_META`

**Barrel Files:**
- Not used — import directly from the specific module file
- `lib/db/index.ts` exports `db` client; `lib/db/schema.ts` exports all table definitions

## Directive Patterns

**Server Components (default):** No directive; used for all `page.tsx` and `layout.tsx` files
**Client Components:** `"use client"` at top of file — `DashboardShell.tsx`, hooks, interactive components
**Server Actions:** `"use server"` at top of file — all files under `app/actions/`

## Alignment Style

Properties in object literals and type definitions are sometimes column-aligned with spaces for readability — see `lib/env.ts`, `lib/llm.ts`, `app/dashboard/_components/DashboardShell.tsx`. This is cosmetic and not enforced by tooling.

---

*Convention analysis: 2026-04-20*
