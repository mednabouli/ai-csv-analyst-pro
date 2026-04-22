import { describe, it, expect, vi } from "vitest";
import { POST } from "../portal/route";

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

const makeReq = () => ({ json: async () => ({}) });

describe("POST /api/billing/portal", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    auth.api.getSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns Stripe portal url if authenticated", async () => {
    const res = await POST(makeReq());
    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/stripe.com\/portal/);
  });
});
