// Vitest global setup for mocking external services and env vars
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/testdb';
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret-123456789012345678901234567890';
// Mock Next.js cookies API for server actions
vi.mock('next/headers', () => ({
  cookies: () => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })
}));
// Mock Sentry for observability tests
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((cb) => cb()),
}));
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-token';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_123';
process.env.STRIPE_PRICE_STARTER = process.env.STRIPE_PRICE_STARTER || 'price_test_starter';
process.env.STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || 'price_test_pro';

// Mock Neon (Postgres) client
vi.mock('@neondatabase/serverless', () => ({
  neon: () => ({ query: vi.fn().mockResolvedValue({ rows: [] }) })
}));

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }) }
}));

// Mock Upstash Ratelimit
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class { static slidingWindow() {}; constructor() { return { limit: vi.fn() }; } }
}));

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: class {
      customers = { create: vi.fn(), retrieve: vi.fn() };
      checkout = { sessions: { create: vi.fn(), retrieve: vi.fn() } };
      prices = { retrieve: vi.fn() };
    }
  };
});

// Mock OpenAI for llm.ts and embed.ts usage
vi.mock('@ai-sdk/openai', () => ({
  openai: Object.assign(
    vi.fn(() => vi.fn()),
    {
      embedding: vi.fn(() => ({
        // Return a mock embedding model object
        // that can be passed to embed({ model, value })
        id: 'mock-embedding-model',
      })),
    }
  ),
  default: vi.fn(() => vi.fn()),
}));

// Mock ai embed functions
vi.mock('ai', () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0, 1, 2] }),
  embedMany: vi.fn().mockResolvedValue({ embeddings: [[0, 1, 2], [3, 4, 5]] })
}));
