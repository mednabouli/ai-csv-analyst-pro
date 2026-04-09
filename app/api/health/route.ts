import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // DB check
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Redis check
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const allOk = Object.values(checks).every(v => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
