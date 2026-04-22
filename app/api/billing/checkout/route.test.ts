import { describe, it, expect, vi } from "vitest";
import { POST } from "../checkout/route";

// Mocks
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_test" }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://stripe.com/checkout" }),
      },
    },
  }),
  PLANS: {
    pro: { stripePriceId: "price_123" },
    free: { stripePriceId: undefined },
  },
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
          limit: () => [],
        }),
      }),
    }),
  },
  subscriptions: {},
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const makeReq = (plan = "pro") => ({
  json: async () => ({ plan }),
});

describe("POST /api/billing/checkout", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for free plan", async () => {
    const res = await POST(makeReq("free"));
    expect(res.status).toBe(400);
  });

  it("returns Stripe checkout url for paid plan", async () => {
    const res = await POST(makeReq("pro"));
    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/stripe.com\/checkout/);
  });
});
