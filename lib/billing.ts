import { db } from "@/lib/db";
import { subscriptions, usageRecords } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { PLANS, type PlanKey } from "@/lib/stripe";

export type LimitCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; upgrade: PlanKey };

// ─── Get or create a user subscription ──────────────────────────────────────
export async function getOrCreateSubscription(userId: string) {
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(subscriptions)
    .values({ userId, planName: "free", status: "active" })
    .returning();
  return created;
}

// ─── Get current period usage ────────────────────────────────────────────────
export async function getCurrentUsage(userId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const records = await db
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.periodStart, start),
        lte(usageRecords.periodEnd, end)
      )
    )
    .limit(1);

  if (records[0]) return records[0];

  const [created] = await db
    .insert(usageRecords)
    .values({ userId, periodStart: start, periodEnd: end })
    .returning();
  return created;
}

// ─── Check if upload is within limits ───────────────────────────────────────
export async function checkUploadLimit(
  userId: string,
  fileSizeMb: number,
  rowCount: number
): Promise<LimitCheckResult> {
  const sub = await getOrCreateSubscription(userId);
  const plan = PLANS[sub.planName as PlanKey];
  const usage = await getCurrentUsage(userId);

  if (fileSizeMb > plan.maxFileSizeMb) {
    return {
      allowed: false,
      reason: `File size ${fileSizeMb}MB exceeds your plan limit of ${plan.maxFileSizeMb}MB.`,
      upgrade: sub.planName === "free" ? "starter" : "pro",
    };
  }
  if (rowCount > plan.maxRowsPerFile) {
    return {
      allowed: false,
      reason: `File has ${rowCount.toLocaleString()} rows. Your plan supports up to ${plan.maxRowsPerFile.toLocaleString()}.`,
      upgrade: sub.planName === "free" ? "starter" : "pro",
    };
  }
  if (usage.uploadsUsed >= plan.monthlyUploads) {
    return {
      allowed: false,
      reason: `Monthly upload limit reached (${plan.monthlyUploads} uploads).`,
      upgrade: sub.planName === "free" ? "starter" : "pro",
    };
  }

  return { allowed: true };
}

// ─── Check if query is within limits ─────────────────────────────────────────
export async function checkQueryLimit(userId: string, provider: string): Promise<LimitCheckResult> {
  const sub = await getOrCreateSubscription(userId);
  const plan = PLANS[sub.planName as PlanKey];
  const usage = await getCurrentUsage(userId);

  if (!plan.allowedProviders.includes(provider as never)) {
    return {
      allowed: false,
      reason: `Model "${provider}" is not available on your plan.`,
      upgrade: sub.planName === "free" ? "starter" : "pro",
    };
  }
  if (usage.queriesUsed >= plan.monthlyQueries) {
    return {
      allowed: false,
      reason: `Monthly query limit reached (${plan.monthlyQueries} queries).`,
      upgrade: sub.planName === "free" ? "starter" : "pro",
    };
  }

  return { allowed: true };
}

// ─── Increment usage counters ────────────────────────────────────────────────
export async function incrementUsage(
  userId: string,
  type: "upload" | "query",
  tokens = 0
) {
  const usage = await getCurrentUsage(userId);
  await db
    .update(usageRecords)
    .set({
      uploadsUsed: type === "upload" ? usage.uploadsUsed + 1 : usage.uploadsUsed,
      queriesUsed: type === "query" ? usage.queriesUsed + 1 : usage.queriesUsed,
      tokensUsed: usage.tokensUsed + tokens,
    })
    .where(eq(usageRecords.id, usage.id));
}
