#!/usr/bin/env tsx
/**
 * Creates Stripe products and prices for the three subscription tiers.
 * Run once per Stripe account (test + prod separately).
 *
 * Usage:
 *   pnpm stripe:setup                    # uses .env.local STRIPE_SECRET_KEY
 *   STRIPE_SECRET_KEY=sk_live_... pnpm stripe:setup
 *
 * Output: copy the printed env vars into .env.local and Vercel dashboard.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const PLANS = [
  {
    key:         "starter",
    name:        "Starter",
    description: "5 uploads/day · 10,000 rows · 100 queries/day · 5 MB max file",
    monthly:     1200,   // $12/month in cents
    yearly:      11520,  // $9.60/month billed yearly ($115.20/yr)
  },
  {
    key:         "pro",
    name:        "Pro",
    description: "Unlimited uploads · 1M rows · Unlimited queries · 50 MB max file · Priority support",
    monthly:     3900,   // $39/month
    yearly:      37440,  // $32.50/month billed yearly ($374.40/yr)
  },
] as const;

async function main() {
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`\nStripe setup — ${mode} mode`);
  console.log("=".repeat(48));

  const output: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`\nCreating: ${plan.name}`);

    const product = await stripe.products.create({
      name:        plan.name,
      description: plan.description,
      metadata:    { plan: plan.key },
    });
    console.log(`  Product: ${product.id}`);

    const priceMonthly = await stripe.prices.create({
      product:    product.id,
      currency:   "usd",
      unit_amount: plan.monthly,
      recurring:  { interval: "month" },
      metadata:   { plan: plan.key, billing: "monthly" },
    });
    console.log(`  Monthly price: ${priceMonthly.id}  ($${plan.monthly / 100}/mo)`);

    const priceYearly = await stripe.prices.create({
      product:    product.id,
      currency:   "usd",
      unit_amount: plan.yearly,
      recurring:  { interval: "year" },
      metadata:   { plan: plan.key, billing: "yearly" },
    });
    console.log(`  Yearly price:  ${priceYearly.id}  ($${plan.yearly / 100}/yr)`);

    output[`STRIPE_PRICE_${plan.key.toUpperCase()}_MONTHLY`] = priceMonthly.id;
    output[`STRIPE_PRICE_${plan.key.toUpperCase()}_YEARLY`]  = priceYearly.id;
  }

  console.log("\n" + "=".repeat(48));
  console.log("Copy these into .env.local and Vercel environment variables:\n");
  for (const [k, v] of Object.entries(output)) {
    console.log(`${k}=${v}`);
  }
  console.log("\nDone! Also set up the Stripe webhook:");
  console.log("  stripe listen --forward-to localhost:3000/api/billing/webhook");
  console.log("  Add STRIPE_WEBHOOK_SECRET to .env.local");
}

main().catch((e) => { console.error(e); process.exit(1); });
