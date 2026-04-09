import { describe, it, expect, vi } from "vitest";

vi.mock("stripe", () => ({ default: vi.fn().mockReturnValue({}) }));

import { PLANS } from "@/lib/stripe";

// ── Mock DB so no real Neon connection needed ────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mockSelect }) ) })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockInsert })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdate })) })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  subscriptions: {},
  usageRecords: {},
}));

// ─────────────────────────────────────────────────────────────────────────────

describe("PLANS config", () => {
  it("free plan has no stripePriceId", () => {
    expect(PLANS.free.stripePriceId).toBeNull();
  });

  it("starter plan is cheaper than pro", () => {
    expect(PLANS.starter.price).toBeLessThan(PLANS.pro.price);
  });

  it("pro allows more uploads than starter", () => {
    expect(PLANS.pro.monthlyUploads).toBeGreaterThan(PLANS.starter.monthlyUploads);
  });

  it("pro allows more queries than starter", () => {
    expect(PLANS.pro.monthlyQueries).toBeGreaterThan(PLANS.starter.monthlyQueries);
  });

  it("pro supports larger files than starter", () => {
    expect(PLANS.pro.maxFileSizeMb).toBeGreaterThan(PLANS.starter.maxFileSizeMb);
  });

  it("pro supports more rows per file than starter", () => {
    expect(PLANS.pro.maxRowsPerFile).toBeGreaterThan(PLANS.starter.maxRowsPerFile);
  });

  it("free plan cannot use claude", () => {
    expect(PLANS.free.allowedProviders).not.toContain("claude");
  });

  it("pro plan can use claude", () => {
    expect(PLANS.pro.allowedProviders).toContain("claude");
  });

  it("all plans allow gemma26b", () => {
    expect(PLANS.free.allowedProviders).toContain("gemma26b");
    expect(PLANS.starter.allowedProviders).toContain("gemma26b");
    expect(PLANS.pro.allowedProviders).toContain("gemma26b");
  });
});
