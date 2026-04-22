import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRevalidatePath = vi.fn();
const mockValidateCsrf = vi.fn();

const selectResults: unknown[] = [];
const mockSelect = vi.fn(() => selectResults.shift());
const mockSelectChain = () => ({
  from: () => ({
    where: () => ({
      orderBy: () => {
        const arr = selectResults.shift();
        // If .limit is called, return an object with .limit method
        // If .map is called, return the array directly
        const arrUnknown = arr as unknown[];
        return {
          limit: mockSelect,
          map: arrUnknown ? arrUnknown.map.bind(arrUnknown) : undefined,
          // For test code that does: const rows = await db...orderBy(...).limit(...)
          // or: const rows = await db...orderBy(...); rows.map(...)
          // This allows both usages to work
          [Symbol.iterator]: arrUnknown ? arrUnknown[Symbol.iterator].bind(arrUnknown) : undefined,
        };
      },
      limit: mockSelect
    })
  })
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(mockSelectChain),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockUpdate })) })),
    delete: vi.fn(() => ({ where: mockDelete })),
  },
}));
vi.mock("@/lib/db/schema", () => ({
  sessions: {},
  chatMessages: {},
  csvChunks: {},
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/csrf", () => ({ validateCsrf: mockValidateCsrf, CSRF_FIELD: "__csrf" }));

describe("sessions actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
  });

  it("getUserSessionsAction returns empty if not authenticated", async () => {
    const { getUserSessionsAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce(null);
    const result = await getUserSessionsAction();
    expect(result).toEqual({ sessions: [], hasMore: false, nextCursor: null });
  });

  it("getUserSessionsAction returns sessions if authenticated", async () => {
    const { getUserSessionsAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockSelect.mockResolvedValueOnce([
      { id: "s1", fileName: "f.csv", rowCount: 1, columnCount: 1, sizeBytes: 1, createdAt: new Date() }
    ]);
    const result = await getUserSessionsAction();
    expect(result.sessions.length).toBe(1);
  });

  it("getMoreSessionsAction returns empty if not authenticated", async () => {
    const { getMoreSessionsAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce(null);
    const result = await getMoreSessionsAction(new Date());
    expect(result).toEqual({ sessions: [], hasMore: false, nextCursor: null });
  });

  it("getMoreSessionsAction returns sessions if authenticated", async () => {
    const { getMoreSessionsAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mockSelect.mockResolvedValueOnce([
      { id: "s1", fileName: "f.csv", rowCount: 1, columnCount: 1, sizeBytes: 1, createdAt: new Date() }
    ]);
    const result = await getMoreSessionsAction(new Date());
    expect(result.sessions.length).toBe(1);
  });

  it("getSessionMessagesAction returns empty if not authenticated", async () => {
    const { getSessionMessagesAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce(null);
    const result = await getSessionMessagesAction("s1");
    expect(result).toEqual([]);
  });

  it("getSessionMessagesAction returns empty if not owned", async () => {
    const { getSessionMessagesAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    // owned returns empty
    mockSelect.mockResolvedValueOnce([]);
    const result = await getSessionMessagesAction("s1");
    expect(result).toEqual([]);
  });

  it("getSessionMessagesAction returns messages if owned", async () => {
    const { getSessionMessagesAction } = await import("../sessions");
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    // owned returns non-empty, then messages
    selectResults.push([ { id: "s1" } ]);
    selectResults.push([
      { id: "m1", role: "user", content: "hi" },
      { id: "m2", role: "assistant", content: "hello" }
    ]);
    const result = await getSessionMessagesAction("s1");
    expect(result).toEqual([
      { id: "m1", role: "user", content: "hi" },
      { id: "m2", role: "assistant", content: "hello" }
    ]);
  });

  it("renameSessionAction does nothing if CSRF fails", async () => {
    const { renameSessionAction } = await import("../sessions");
    mockValidateCsrf.mockRejectedValueOnce(new Error("bad csrf"));
    await renameSessionAction("s1", "name", "bad");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("renameSessionAction updates session if valid", async () => {
    const { renameSessionAction } = await import("../sessions");
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    await renameSessionAction("s1", "new name", "csrf");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("deleteSessionAction does nothing if CSRF fails", async () => {
    const { deleteSessionAction } = await import("../sessions");
    mockValidateCsrf.mockRejectedValueOnce(new Error("bad csrf"));
    await deleteSessionAction("s1", "bad");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deleteSessionAction deletes session if valid", async () => {
    const { deleteSessionAction } = await import("../sessions");
    mockValidateCsrf.mockResolvedValueOnce(undefined);
    mockGetSession.mockResolvedValueOnce({ user: { id: "u1" } });
    await deleteSessionAction("s1", "csrf");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
