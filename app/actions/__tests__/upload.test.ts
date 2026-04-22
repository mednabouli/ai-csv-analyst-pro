import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockValidateCsrf = vi.fn();
const mockCheckUploadLimit = vi.fn();
const mockWithTrace = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("@/lib/csrf", () => ({ validateCsrf: mockValidateCsrf }));
vi.mock("@/lib/billing", () => ({ checkUploadLimit: mockCheckUploadLimit, incrementUsage: vi.fn() }));
vi.mock("@/lib/rag/chunk", () => ({
  parseCSV: vi.fn(() => ({ data: [{ a: 1 }], meta: { rowCount: 1, columnCount: 1, columns: ["a"] } })),
  chunkRows: vi.fn(() => [{ text: "chunk" }])
}));
vi.mock("@/lib/rag/embed", () => ({ generateEmbeddings: vi.fn(() => [ [0.1], [0.2] ]) }));
vi.mock("@/lib/observability/telemetry", () => ({ withTrace: (opts: any) => opts.fn("traceid"), createSpan: () => ({ end: vi.fn() }) }));
vi.mock("uuid", () => ({ v4: () => "session-uuid" }));
vi.mock("@/lib/db", () => ({ db: { transaction: vi.fn(async (fn) => fn({ insert: vi.fn(() => ({ values: vi.fn() })) }) ) } }));
vi.mock("@/lib/db/schema", () => ({ sessions: {}, csvChunks: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

describe("uploadCSVAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error if not authenticated", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce(null);
    const result = await uploadCSVAction(null, new FormData());
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error if CSRF fails", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockRejectedValueOnce(new Error("bad csrf"));
    const fd = new FormData();
    fd.set("file", new File(["a,b\n1,2"], "test.csv"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "Request validation failed. Please refresh the page." });
  });

  it("returns error if no file provided", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    const fd = new FormData();
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "No file provided" });
  });

  it("returns error if file extension is not .csv", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    const fd = new FormData();
    fd.set("file", new File(["a,b\n1,2"], "test.txt"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "Only .csv files are accepted" });
  });

  it("returns error if file size check fails", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockCheckUploadLimit.mockResolvedValueOnce({ allowed: false, reason: "too big" });
    const fd = new FormData();
    fd.set("file", new File(["a,b\n1,2"], "test.csv"));
    Object.defineProperty(fd.get("file"), "size", { value: 100 * 1024 * 1024 });
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "too big", upgradeRequired: true });
  });

  it("returns error if CSV is empty", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockCheckUploadLimit.mockResolvedValueOnce({ allowed: true });
    const { parseCSV } = await import("@/lib/rag/chunk");
    (parseCSV as any).mockImplementationOnce(() => ({ data: [], meta: { rowCount: 0, columnCount: 1, columns: ["a"] } }));
    const fd = new FormData();
    fd.set("file", new File(["a\n"], "test.csv"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "CSV file is empty" });
  });

  it("returns error if CSV parse fails", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockCheckUploadLimit.mockResolvedValueOnce({ allowed: true });
    const { parseCSV } = await import("@/lib/rag/chunk");
    (parseCSV as any).mockImplementationOnce(() => { throw new Error("parse error"); });
    const fd = new FormData();
    fd.set("file", new File(["bad"], "test.csv"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "Failed to parse CSV. Ensure it is valid UTF-8 with headers." });
  });

  it("returns error if row count check fails after parse", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockCheckUploadLimit.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false, reason: "too many rows" });
    const { parseCSV } = await import("@/lib/rag/chunk");
    (parseCSV as any).mockImplementationOnce(() => ({ data: [{ a: 1 }], meta: { rowCount: 1000, columnCount: 1, columns: ["a"] } }));
    const fd = new FormData();
    fd.set("file", new File(["a\n1"], "test.csv"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toEqual({ error: "too many rows", upgradeRequired: true });
  });

  it("returns success for valid CSV upload", async () => {
    const { uploadCSVAction } = await import("../upload");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockCheckUploadLimit.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: true });
    const { parseCSV } = await import("@/lib/rag/chunk");
    (parseCSV as any).mockImplementationOnce(() => ({ data: [{ a: 1 }], meta: { rowCount: 1, columnCount: 1, columns: ["a"] } }));
    const fd = new FormData();
    fd.set("file", new File(["a\n1"], "test.csv"));
    const result = await uploadCSVAction(null, fd);
    expect(result).toMatchObject({
      sessionId: expect.any(String),
      fileName: "test.csv",
      rowCount: 1,
      columns: ["a"],
      previewRows: [{ a: 1 }],
    });
  });
});
