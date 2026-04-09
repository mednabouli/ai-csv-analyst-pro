import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Called by Vercel Cron on the 1st of each month at midnight UTC
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Usage records are period-scoped — new period auto-created on next query
  // This endpoint is a hook for any cleanup needed (e.g. archiving old records)
  return NextResponse.json({
    message: "Usage period reset — new records will be created on next usage.",
    timestamp: new Date().toISOString(),
  });
}
