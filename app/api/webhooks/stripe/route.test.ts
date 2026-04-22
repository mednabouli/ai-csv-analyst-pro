import { describe, it, expect, vi } from "vitest";
import { POST } from "../stripe/route";
import { NextRequest } from "next/server";

function makeNextRequestMock() {
  const req = {
    headers: { get: () => "test-signature" },
    text: async () => "{}",
    cookies: {},
    nextUrl: {},
    page: {},
    ua: '',
    method: 'POST',
    url: '',
    clone: () => req,
  } as unknown as NextRequest;
  return req;
}

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user1", plan: "pro" },
            customer: "cus_test",
            subscription: "sub_test"
          }
        }
      }),
    },
  }),
}));

describe("POST /api/webhooks/stripe", () => {
  it("handles Stripe webhook event", async () => {
    const res = await POST(makeNextRequestMock());
    expect(res.status).toBe(200);
  });
});
