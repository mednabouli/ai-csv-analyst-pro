"use client";
import { useState } from "react";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { useRouter } from "next/navigation";

const PLAN_KEYS: PlanKey[] = ["free", "starter", "pro"];

interface Props { currentPlan: PlanKey; hasStripeCustomer: boolean; }

export function PricingCards({ currentPlan, hasStripeCustomer }: Props) {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const router = useRouter();

  async function handleUpgrade(plan: PlanKey) {
    if (plan === "free" || plan === currentPlan) return;
    setLoading(plan);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const { url } = await res.json();
    if (url) router.push(url);
    setLoading(null);
  }

  async function handlePortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) router.push(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plans</h2>
        {hasStripeCustomer && (
          <button onClick={handlePortal}
            className="text-sm text-primary underline underline-offset-4 hover:opacity-80">
            Manage billing →
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === currentPlan;
          const isLoading = loading === key;

          return (
            <div key={key}
              className={`relative p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] space-y-5 ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""} ${key === "pro" ? "bg-brand-50" : ""}`}>
              {key === "pro" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="font-bold text-xl">{plan.name}</h3>
                <p className="text-3xl font-bold mt-1">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(key)}
                disabled={isCurrent || key === "free" || isLoading}
                className={`w-full py-2 rounded-[var(--radius-card)] text-sm font-medium transition-all ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : key === "free"
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                }`}>
                {isLoading ? "Redirecting…" : isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
