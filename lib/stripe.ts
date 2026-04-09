import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
});

// ─── Plan definitions ────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    name: "Free",
    monthlyUploads: 5,
    monthlyQueries: 20,
    maxFileSizeMb: 5,
    maxRowsPerFile: 5_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b"],
    stripePriceId: null,
    price: 0,
    features: [
      "5 CSV uploads / month",
      "20 AI queries / month",
      "5MB max file size",
      "Gemma 4 & Gemini models",
    ],
  },
  starter: {
    name: "Starter",
    monthlyUploads: 50,
    monthlyQueries: 500,
    maxFileSizeMb: 20,
    maxRowsPerFile: 100_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b", "gemma_local_4b", "gpt4o"],
    stripePriceId: process.env.STRIPE_PRICE_STARTER!,
    price: 9,
    features: [
      "50 CSV uploads / month",
      "500 AI queries / month",
      "20MB max file size",
      "All free models + GPT-4o",
    ],
  },
  pro: {
    name: "Pro",
    monthlyUploads: 500,
    monthlyQueries: 5_000,
    maxFileSizeMb: 50,
    maxRowsPerFile: 1_000_000,
    allowedProviders: ["gemma26b", "gemma31b", "gemini25", "gemma_local_2b", "gemma_local_4b", "gpt4o", "claude"],
    stripePriceId: process.env.STRIPE_PRICE_PRO!,
    price: 29,
    features: [
      "500 CSV uploads / month",
      "5,000 AI queries / month",
      "50MB max file size",
      "All models including Claude",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
