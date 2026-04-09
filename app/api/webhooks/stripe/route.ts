import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as "starter" | "pro";
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId || !plan) break;

      await db
        .insert(subscriptions)
        .values({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          planName: plan,
          status: "active",
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            planName: plan,
            status: "active",
          },
        });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db
        .update(subscriptions)
        .set({
          status: sub.status as "active" | "canceled" | "past_due" | "trialing" | "incomplete",
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        })
        .where(eq(subscriptions.userId, userId));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db
        .update(subscriptions)
        .set({ planName: "free", status: "canceled", stripeSubscriptionId: null })
        .where(eq(subscriptions.userId, userId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await db
        .update(subscriptions)
        .set({ status: "past_due" })
        .where(eq(subscriptions.stripeCustomerId, customerId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
