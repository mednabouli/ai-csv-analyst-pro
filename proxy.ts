import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "proxy",
});

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
]);

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_next",
  "/favicon",
  "/images",
  "/fonts",
];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public prefixes
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Rate limit all API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Allow public pages without auth
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Require auth for all other routes
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
