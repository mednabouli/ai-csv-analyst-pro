import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrCreateSubscription, getCurrentUsage } from "@/lib/billing";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { PricingCards } from "./_components/PricingCards";
import { UsageMeter } from "./_components/UsageMeter";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const params = await searchParams;
  const sub = await getOrCreateSubscription(session.user.id);
  const usage = await getCurrentUsage(session.user.id);
  const plan = PLANS[sub.planName as PlanKey];

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Current plan: <span className="font-semibold text-foreground">{plan.name}</span>
        </p>
      </div>

      {params.success && (
        <div className="p-4 rounded-[var(--radius-card)] bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
          ✅ Subscription activated successfully!
        </div>
      )}
      {params.canceled && (
        <div className="p-4 rounded-[var(--radius-card)] bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          Checkout canceled. Your plan was not changed.
        </div>
      )}

      <UsageMeter usage={usage} plan={plan} />
      <PricingCards currentPlan={sub.planName as PlanKey} hasStripeCustomer={!!sub.stripeCustomerId} />
    </main>
  );
}
