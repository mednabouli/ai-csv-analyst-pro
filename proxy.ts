import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60s"),
  analytics: true,
  prefix: "csv-analyst:rl",
});

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth guard
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/billing")) {
    const session = getSessionCookie(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Rate limiting
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/webhooks")) {
    const ip = request.ip ?? "anonymous";
    const { success, remaining } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/billing/:path*", "/api/:path*"],
  skipProxyUrlNormalize: true,
};
