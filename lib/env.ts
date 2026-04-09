import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  // Database
  DATABASE_URL: z.string().startsWith("postgres", "DATABASE_URL must be a postgres connection string"),

  // AI (at least one required)
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().startsWith("AIza").optional(),

  // Upstash
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_STARTER: z.string().startsWith("price_"),
  STRIPE_PRICE_PRO: z.string().startsWith("price_"),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Ollama (optional local)
  OLLAMA_BASE_URL: z.string().url().optional(),
});

// Validate at startup — crashes with clear error message if misconfigured
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  console.error(
    JSON.stringify(
      _env.error.flatten().fieldErrors,
      null,
      2
    )
  );
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing or invalid environment variables. Deployment aborted.");
  }
}

export const env = _env.success
  ? _env.data
  : (process.env as unknown as z.infer<typeof envSchema>);
