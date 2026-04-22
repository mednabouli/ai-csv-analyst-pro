import { describe, it, expect, vi } from "vitest";
import * as healthModule from "../health/route";

vi.mock("@/lib/db", () => ({ db: { execute: vi.fn().mockResolvedValue(true) } }));
vi.mock("@/lib/redis", () => ({ redis: { ping: vi.fn().mockResolvedValue("PONG") } }));

describe("GET /api/health", () => {
  it("returns 200 and healthy status", async () => {
    const res = await healthModule.GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.checks.database).toBe("ok");
    expect(data.checks.redis).toBe("ok");
  });
});
