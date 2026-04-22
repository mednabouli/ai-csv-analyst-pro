import { describe, it, expect, vi } from "vitest";
import { POST } from "../portal/route";
import { NextRequest } from "next/server";

function makeNextRequestMock(jsonData: Record<string, unknown> = {}) {
  const req = {
    json: async () => jsonData,
    cookies: {},
    nextUrl: {},
    page: {},
    ua: '',
    method: 'POST',
    url: '',
    headers: { get: () => undefined },
    clone: () => req,
  } as unknown as NextRequest;
  return req;
}

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://stripe.com/portal" }),
      },
    },
  }),
}));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "user1", email: "test@example.com", name: "Test User" },
      }),
    },
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [{ stripeCustomerId: "cus_test" }],
        }),
      }),
    }),
  },
  subscriptions: {},
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

describe("POST /api/billing/portal", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    (auth.api.getSession as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    const res = await POST(makeNextRequestMock());
    expect(res.status).toBe(401);
  });

  it("returns Stripe portal url if authenticated", async () => {
    const res = await POST(makeNextRequestMock());
    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/stripe.com\/portal/);
  });
});
