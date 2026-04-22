
import { describe, it, expect, vi } from "vitest";
import { POST } from "../stripe/route";


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

const makeReq = () => ({
  headers: { get: () => "test-signature" },
  text: async () => "{}",
});

describe("POST /api/webhooks/stripe", () => {
  it("handles Stripe webhook event", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
  });
});
