import { z } from "zod";

const IS_DEV = process.env.NODE_ENV === "development";

const envSchema = z.object({
  // ── App ────────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Auth (required everywhere) ─────────────────────────────────────────────
  BETTER_AUTH_SECRET: z.string().min(32),

  // ── Database (required everywhere) ────────────────────────────────────────
  DATABASE_URL: z.string().min(1),

  // ── OAuth — optional in dev, social login simply won't appear ─────────────
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID:     z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers — at least one needed to use chat ─────────────────────────
  OPENAI_API_KEY:               z.string().optional(),
  ANTHROPIC_API_KEY:            z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL:              z.string().optional(),

  // ── Email — optional; dev logs to console instead ─────────────────────────
  RESEND_API_KEY: z.string().optional(),
  EMAIL_DOMAIN:   z.string().optional(),

  // ── Redis / Upstash — optional in dev; rate limiting skipped when absent ──
  UPSTASH_REDIS_REST_URL:   z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── Stripe — optional; billing UI shows but checkout disabled without key ─
  STRIPE_SECRET_KEY:     z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER:  z.string().optional(),
  STRIPE_PRICE_PRO:      z.string().optional(),

  // ── Observability — optional everywhere ───────────────────────────────────
  SENTRY_DSN:             z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT:     z.string().default("development"),
  LANGFUSE_PUBLIC_KEY:    z.string().optional(),
  LANGFUSE_SECRET_KEY:    z.string().optional(),
  LANGFUSE_HOST:          z.string().default("https://cloud.langfuse.com"),
  LANGFUSE_ENVIRONMENT:   z.string().default("development"),

  // ── Cron ───────────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function createEnv(): Env {
  // CI / preview builds bypass validation (no secrets available at build time)
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return process.env as unknown as Env;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${formatted}\n
Tip: copy .env.example to .env.local and fill in the required values.`);
  }

  // Warn about missing optional-but-important vars in dev
  if (IS_DEV) {
    const warnings: string[] = [];
    if (!result.data.UPSTASH_REDIS_REST_URL)   warnings.push("UPSTASH_REDIS_REST_URL (rate limiting disabled)");
    if (!result.data.RESEND_API_KEY)            warnings.push("RESEND_API_KEY (emails logged to console)");
    if (!result.data.STRIPE_SECRET_KEY)         warnings.push("STRIPE_SECRET_KEY (billing checkout disabled)");
    if (!result.data.GOOGLE_CLIENT_ID)          warnings.push("GOOGLE_CLIENT_ID (Google OAuth disabled)");
    if (!result.data.GITHUB_CLIENT_ID)          warnings.push("GITHUB_CLIENT_ID (GitHub OAuth disabled)");
    if (warnings.length) {
      console.warn("⚠️  Dev mode — optional services not configured:\n" + warnings.map(w => `   · ${w}`).join("\n"));
    }
  }

  return result.data;
}

export const env = createEnv();
export const isDev  = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
