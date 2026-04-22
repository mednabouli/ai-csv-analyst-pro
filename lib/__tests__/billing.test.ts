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

describe("billing logic", () => {
  it("getOrCreateSubscription returns existing subscription", async () => {
    const { getOrCreateSubscription } = await import("../billing");
    mockSelect.mockReturnValueOnce([{ id: 1, userId: "user1", planName: "free", status: "active" }]);
    const result = await getOrCreateSubscription("user1");
    expect(result).toEqual({ id: 1, userId: "user1", planName: "free", status: "active" });
  });

  it("getOrCreateSubscription creates new subscription if none exists", async () => {
    const { getOrCreateSubscription } = await import("../billing");
    mockSelect.mockReturnValueOnce([]);
    mockInsert.mockReturnValueOnce([{ id: 2, userId: "user2", planName: "free", status: "active" }]);
    const result = await getOrCreateSubscription("user2");
    expect(result).toEqual({ id: 2, userId: "user2", planName: "free", status: "active" });
  });

  it("getCurrentUsage returns existing usage record", async () => {
    const { getCurrentUsage } = await import("../billing");
    mockSelect.mockReturnValueOnce([{ id: 1, userId: "user1", uploadsUsed: 1, queriesUsed: 2, tokensUsed: 3 }]);
    const result = await getCurrentUsage("user1");
    expect(result).toEqual({ id: 1, userId: "user1", uploadsUsed: 1, queriesUsed: 2, tokensUsed: 3 });
  });

  it("getCurrentUsage creates new usage record if none exists", async () => {
    const { getCurrentUsage } = await import("../billing");
    mockSelect.mockReturnValueOnce([]);
    mockInsert.mockReturnValueOnce([{ id: 2, userId: "user2", uploadsUsed: 0, queriesUsed: 0, tokensUsed: 0 }]);
    const result = await getCurrentUsage("user2");
    expect(result).toEqual({ id: 2, userId: "user2", uploadsUsed: 0, queriesUsed: 0, tokensUsed: 0 });
  });

  it("checkUploadLimit returns allowed true if within limits", async () => {
    const { checkUploadLimit } = await import("../billing");
    mockSelect.mockReturnValue([{ id: 1, userId: "user1", planName: "pro", status: "active" }]);
    mockInsert.mockReturnValue([{ id: 1, userId: "user1", uploadsUsed: 0, queriesUsed: 0, tokensUsed: 0 }]);
    const result = await checkUploadLimit("user1", 1, 10);
    expect(result).toEqual({ allowed: true });
  });

  it("checkQueryLimit returns allowed true if within limits", async () => {
    const { checkQueryLimit } = await import("../billing");
    mockSelect.mockReturnValue([{ id: 1, userId: "user1", planName: "pro", status: "active" }]);
    mockInsert.mockReturnValue([{ id: 1, userId: "user1", uploadsUsed: 0, queriesUsed: 0, tokensUsed: 0 }]);
    const result = await checkQueryLimit("user1", "claude");
    expect(result).toEqual({ allowed: true });
  });

  it("incrementUsage updates usage counters", async () => {
    const { incrementUsage } = await import("../billing");
    mockSelect.mockReturnValue([{ id: 1, userId: "user1", uploadsUsed: 1, queriesUsed: 2, tokensUsed: 3 }]);
    await incrementUsage("user1", "upload", 10);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
