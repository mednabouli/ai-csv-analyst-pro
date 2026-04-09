import { z } from "zod";

const envSchema = z.object({
  // ── App ────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Auth ───────────────────────────────────────────────────────────────
  BETTER_AUTH_SECRET: z.string().min(32),

  // ── Database ───────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1),

  // ── OAuth (optional in dev) ────────────────────────────────────────────
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID:     z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers (at least one required) ──────────────────────────────
  OPENAI_API_KEY:              z.string().optional(),
  ANTHROPIC_API_KEY:           z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

  // ── Email ──────────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  EMAIL_DOMAIN:   z.string().optional(),

  // ── Redis ──────────────────────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL:   z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // ── Stripe ─────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY:      z.string().optional(),
  STRIPE_WEBHOOK_SECRET:  z.string().optional(),
  STRIPE_PRICE_STARTER:   z.string().optional(),
  STRIPE_PRICE_PRO:       z.string().optional(),

  // ── Observability ──────────────────────────────────────────────────────
  SENTRY_DSN:              z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN:  z.string().optional(),
  SENTRY_ENVIRONMENT:      z.string().default("development"),
  LANGFUSE_PUBLIC_KEY:     z.string().optional(),
  LANGFUSE_SECRET_KEY:     z.string().optional(),
  LANGFUSE_HOST:           z.string().default("https://cloud.langfuse.com"),
  LANGFUSE_ENVIRONMENT:    z.string().default("development"),

  // ── Cron ───────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function createEnv(): Env {
  // ── SKIP_ENV_VALIDATION bypass ──────────────────────────────────────────
  // Used by: CI build job, Next.js build in preview environments.
  // Never set in production — Zod validation is the runtime safety net.
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return process.env as unknown as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `❌ Invalid environment variables:\n${formatted}\n\nCheck your .env.local file.`
    );
  }

  return result.data;
}

export const env = createEnv();
