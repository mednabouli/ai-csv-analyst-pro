import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Rate limiting — only active when Upstash env vars are present.
// In dev without Redis, all requests pass through freely.
const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Lazy-init the rate limiter to avoid crashing at module load in dev
let ratelimit: { limit: (key: string) => Promise<{ success: boolean }> } | null = null;

async function getRatelimit() {
  if (!hasRedis) return null;
  if (ratelimit) return ratelimit;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis }     = await import("@upstash/redis");
  ratelimit = new Ratelimit({
    redis:   Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix:  "proxy",
  });
  return ratelimit;
}

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

  // Static assets — always pass through
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Rate limiting on API routes (skipped in dev when Redis not configured)
  if (pathname.startsWith("/api/")) {
    const rl = await getRatelimit();
    if (rl) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
      const { success } = await rl.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }
  }

  // Public pages — no auth required
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();

  // Auth guard — redirect to login if no session
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)" ],
};
