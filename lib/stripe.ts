import Stripe from "stripe";

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    name:             "Free",
    monthlyUploads:   5,
    monthlyQueries:   20,
    maxFileSizeMb:    5,
    maxRowsPerFile:   5_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b"],
    stripePriceId:    null,
    price:            0,
    features: [
      "5 CSV uploads / month",
      "20 AI queries / month",
      "5 MB max file size",
      "Gemma 4 & Gemini models",
    ],
  },
  starter: {
    name:             "Starter",
    monthlyUploads:   50,
    monthlyQueries:   500,
    maxFileSizeMb:    20,
    maxRowsPerFile:   100_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b", "gemma_local_4b", "gpt4o"],
    stripePriceId:    process.env.STRIPE_PRICE_STARTER ?? null,
    price:            9,
    features: [
      "50 CSV uploads / month",
      "500 AI queries / month",
      "20 MB max file size",
      "All free models + GPT-4o",
    ],
  },
  pro: {
    name:             "Pro",
    monthlyUploads:   500,
    monthlyQueries:   5_000,
    maxFileSizeMb:    50,
    maxRowsPerFile:   1_000_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b", "gemma_local_4b", "gpt4o", "claude"],
    stripePriceId:    process.env.STRIPE_PRICE_PRO ?? null,
    price:            29,
    features: [
      "500 CSV uploads / month",
      "5,000 AI queries / month",
      "50 MB max file size",
      "All models including Claude",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ── Lazy Stripe client ────────────────────────────────────────────────────────
// Not initialised at module load — avoids crashing in dev without STRIPE_SECRET_KEY.
// Call getStripe() only in billing routes; it will throw a clear error if key missing.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable billing."
    );
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-03-31.basil",
    typescript:  true,
  });
  return _stripe;
}

/** True when Stripe is configured and billing is available. */
export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
