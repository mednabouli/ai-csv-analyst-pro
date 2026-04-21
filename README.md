<div align="center">

# CSV Analyst Pro

**AI-powered CSV analysis. Upload any dataset. Ask questions in plain language. Get instant insights.**

[![CI](https://github.com/mednabouli/ai-csv-analyst-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/mednabouli/ai-csv-analyst-pro/actions/workflows/ci.yml)
[![Deploy](https://github.com/mednabouli/ai-csv-analyst-pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/mednabouli/ai-csv-analyst-pro/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)

[Live Demo](https://ai-csv-analyst-pro.vercel.app) · [Report Bug](https://github.com/mednabouli/ai-csv-analyst-pro/issues) · [Request Feature](https://github.com/mednabouli/ai-csv-analyst-pro/issues)

</div>

---

## Overview

CSV Analyst Pro lets anyone — from data engineers to business analysts — have a natural language conversation with their CSV data. No SQL. No Python. Just upload a file and ask.

It uses a **smart RAG strategy**: models with large context windows (Gemma 4, Gemini 2.5) receive the full dataset; smaller context models fall back to **pgvector semantic search** to retrieve the most relevant chunks before answering.

---


## Features

- **Multi-model support** — Gemma 4 (free via Vercel AI Gateway), GPT-4o, Claude Sonnet, Gemini 2.5 Flash, and local Ollama models — switchable per query
- **Smart RAG** — full-context for Gemma 4 (1M token window), pgvector similarity search fallback for other providers
- **Streaming responses** — token-by-token via Vercel AI SDK with optimistic UI
- **Chart enhancements** — Switch between Bar, Line, and Pie charts; each chart displays a descriptive caption and optional insight below; copy chart as SVG image to clipboard
- **Secure auth** — email/password + Google + GitHub OAuth via better-auth
- **Tiered billing** — Free / Starter ($9) / Pro ($29) with Stripe + usage enforcement
- **Rate limiting** — Upstash Redis sliding window on all API routes
- **Observability** — Langfuse AI traces with spans + generation logs; Sentry error capture
- **Type-safe DB** — Drizzle ORM + Neon serverless Postgres with pgvector
- **40+ unit tests** — Vitest suite covering chunking, RAG, billing, LLM config, telemetry

---

## Phase 4: Chart Enhancements (Complete)

- Chart type switcher: Instantly switch between bar, line, and pie charts for the same data.
- Insight captions: AI-generated captions appear below each chart.
- One-click copy: Copy chart images (SVG) and text answers to clipboard with a single click.
- All features verified in UAT and documented in CHANGELOG.md.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, PPR, React Compiler, Turbopack) |
| Language | TypeScript 5.8 (strict) |
| AI | Vercel AI SDK 4 — `streamText`, `useChat`, `useOptimistic` |
| Models | Gemma 4 · Claude Sonnet · GPT-4o · Gemini 2.5 · Ollama |
| Auth | better-auth 1.2 — email, Google, GitHub |
| Database | Neon serverless Postgres + Drizzle ORM + pgvector |
| Cache / RL | Upstash Redis + `@upstash/ratelimit` |
| Billing | Stripe Checkout + Customer Portal + Webhooks |
| Observability | Langfuse (AI traces) + Sentry (errors + replay) |
| Styling | Tailwind CSS v4 (`@theme`) — zero config file |
| Testing | Vitest 3 + `@vitest/coverage-v8` |
| CI/CD | GitHub Actions → Vercel (preview on PR, prod on `main`) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js 16                         │
│                                                         │
│  app/                                                   │
│  ├── page.tsx                  Landing page             │
│  ├── login/                    better-auth              │
│  ├── dashboard/                Upload + Chat UI         │
│  ├── billing/                  Plans + Usage meters     │
│  └── api/                                               │
│      ├── auth/[...all]         better-auth handler      │
│      ├── chat                  streamText + RAG         │
│      ├── billing/checkout      Stripe Checkout          │
│      ├── billing/portal        Stripe Portal            │
│      ├── webhooks/stripe       Event handler            │
│      ├── health                DB + Redis ping          │
│      └── cron/reset-usage      Monthly usage reset      │
│                                                         │
│  lib/                                                   │
│  ├── auth.ts                   better-auth config       │
│  ├── db/schema.ts              Drizzle + pgvector       │
│  ├── llm.ts                    Multi-provider registry  │
│  ├── billing.ts                Limit checks + counters  │
│  ├── stripe.ts                 Plan config + client     │
│  ├── rag/                                               │
│  │   ├── chunk.ts              CSV parse + row chunks   │
│  │   ├── embed.ts              text-embedding-3-small   │
│  │   └── strategy.ts          Full-ctx vs pgvector      │
│  └── observability/                                     │
│      ├── langfuse.ts           Singleton client         │
│      └── telemetry.ts         withTrace · spans · gen  │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- A [Neon](https://neon.tech) database (free tier works)
- An [Upstash Redis](https://upstash.com) instance (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/mednabouli/ai-csv-analyst-pro.git
cd ai-csv-analyst-pro
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the required variables (minimum to run locally):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=<openssl rand -base64 32>
DATABASE_URL=postgres://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
GOOGLE_GENERATIVE_AI_API_KEY=...   # free — enables Gemma 4
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Models

| Model | Badge | Context | Provider |
|---|---|---|---|
| Gemma 4 26B | **Free** | 1M tokens | Vercel AI Gateway |
| Gemma 4 31B | **Free** | 1M tokens | Vercel AI Gateway |
| Gemini 2.5 Flash | **Free** | 1M tokens | Google AI Studio |
| GPT-4o | Paid | 128K tokens | OpenAI |
| Claude Sonnet | Paid | 200K tokens | Anthropic |
| Gemma 4 E2B (Local) | Local | — | Ollama |
| Gemma 4 E4B (Local) | Local | — | Ollama |
| Gemma 4 26B (Local) | Local | — | Ollama |

All models are registered in `lib/llm.ts` and switchable per query from the dashboard UI.

---

## Billing Plans

| | Free | Starter | Pro |
|---|---|---|---|
| **Price** | $0 | $9/mo | $29/mo |
| **Uploads/month** | 5 | 50 | 500 |
| **Queries/month** | 20 | 500 | 5,000 |
| **Max file size** | 5 MB | 20 MB | 50 MB |
| **Max rows** | 5,000 | 100,000 | 1,000,000 |
| **Models** | Gemma 4, Gemini | + GPT-4o | + Claude |

Billing is enforced server-side in `lib/billing.ts` before every upload and query. Stripe webhooks keep subscription state in sync.

---

## Deployment

The app is configured for **one-click Vercel deployment**. On every push to `main`, GitHub Actions:

1. Runs type check, lint, and the full Vitest suite
2. Builds via `vercel build --prod`
3. Deploys to production
4. Runs `pnpm db:migrate`
5. Verifies `/health` returns `200`

Pull requests get an automatic Vercel preview URL posted as a PR comment.

### Deploy to Vercel

```bash
pnpm add -g vercel
vercel link
vercel env pull .env.local
vercel deploy --prod
```

Add the following to your GitHub repository secrets for CI/CD:

```
VERCEL_TOKEN · VERCEL_ORG_ID · VERCEL_PROJECT_ID
BETTER_AUTH_SECRET · DATABASE_URL
UPSTASH_REDIS_REST_URL · UPSTASH_REDIS_REST_TOKEN
OPENAI_API_KEY · STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET · STRIPE_PRICE_STARTER · STRIPE_PRICE_PRO
```

---

## Testing

```bash
pnpm test              # run all tests once
pnpm test:watch        # watch mode
pnpm test:coverage     # generate coverage report → ./coverage/index.html
```

The test suite covers:

| File | Tests | Covers |
|---|---|---|
| `lib/__tests__/rag/chunk.test.ts` | 22 | `parseCSV`, `chunkRows`, edge cases |
| `lib/__tests__/observability/telemetry.test.ts` | 8 | `withTrace`, `captureError`, Sentry |
| `lib/__tests__/billing.test.ts` | 9 | Plan limits, provider access rules |
| `lib/__tests__/llm.test.ts` | 6 | Provider registry, metadata |
| `lib/__tests__/rag/strategy.test.ts` | 3 | Full-context vs pgvector strategy |

Coverage thresholds: **70% lines**, **70% functions**, **60% branches**.

---

## Project Structure

```
ai-csv-analyst-pro/
├── app/
│   ├── actions/upload.ts         # Server Action — parse, embed, persist
│   ├── api/
│   │   ├── auth/[...all]/        # better-auth
│   │   ├── billing/              # Stripe checkout + portal
│   │   ├── chat/                 # Streaming AI endpoint
│   │   ├── cron/reset-usage/     # Monthly Vercel cron
│   │   ├── health/               # DB + Redis health check
│   │   └── webhooks/stripe/      # Stripe event handler
│   ├── billing/                  # Billing page + components
│   ├── dashboard/                # Main app UI
│   └── login/                    # Auth page
├── lib/
│   ├── db/
│   │   ├── index.ts              # Drizzle + Neon client
│   │   └── schema.ts             # Tables: sessions, chunks, messages, plans, subs, usage
│   ├── observability/
│   │   ├── langfuse.ts           # Langfuse singleton
│   │   └── telemetry.ts          # withTrace, createSpan, recordGeneration
│   ├── rag/
│   │   ├── chunk.ts              # CSV parser + row chunker
│   │   ├── embed.ts              # text-embedding-3-small
│   │   └── strategy.ts           # Context strategy (full-ctx vs pgvector)
│   ├── auth.ts                   # better-auth server config
│   ├── auth-client.ts            # better-auth client hooks
│   ├── billing.ts                # checkUploadLimit, checkQueryLimit, incrementUsage
│   ├── env.ts                    # Zod env validation (startup crash on bad config)
│   ├── llm.ts                    # Multi-provider registry + metadata
│   ├── redis.ts                  # Upstash client + rate limiter
│   └── stripe.ts                 # Stripe client + PLANS config
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # typecheck → lint → test → build → preview
│   │   ├── deploy.yml            # Production deploy on main push
│   │   └── audit.yml             # Weekly dependency audit
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
├── drizzle.config.ts
├── next.config.ts                # Turbopack, React Compiler, PPR
├── proxy.ts                      # Auth guard + rate limiting (Next.js 16)
├── vercel.json                   # Regions, timeouts, security headers, cron
├── vitest.config.ts
└── vitest.setup.ts
```

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes and ensure all checks pass: `pnpm typecheck && pnpm lint && pnpm test`
4. Commit using conventional commits: `git commit -m "feat: add export to PDF"`
5. Push and open a pull request — a Vercel preview will be deployed automatically

---

## License

MIT © [med nabouli](https://github.com/mednabouli)
