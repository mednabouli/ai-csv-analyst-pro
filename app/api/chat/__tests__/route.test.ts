import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}));
vi.mock('@/lib/db', () => ({
  db: { query: { sessions: { findMany: vi.fn() } } }
}));
vi.mock('@/lib/chart-spec', () => ({
  buildChartSpecTool: vi.fn(() => ({})),
}));


function mockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/chat', () => {
  it('returns 401 if not authenticated', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 400 if sessionId is missing', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: '',
        emailVerified: false,
        name: ''
      },
      session: {
        id: 's1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'u1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        token: 'token1',
        ipAddress: null,
        userAgent: null
      }
    });
    const res = await POST(mockRequest({ messages: [{}] }));
    expect(res.status).toBe(400);
  });

  it('returns 403 if sessionId does not belong to user', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: {
        id: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: '',
        emailVerified: false,
        name: ''
      },
      session: {
        id: 's1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'u1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        token: 'token1',
        ipAddress: null,
        userAgent: null
      } 
    });
    vi.mocked(db.query.sessions.findMany).mockResolvedValueOnce([{
      userId: 'u2',
      id: '',
      fileName: '',
      rowCount: 0,
      columnCount: 0,
      sizeBytes: 0,
      columns: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    const res = await POST(mockRequest({ sessionId: 's1', messages: [{}] }));
    expect(res.status).toBe(403);
  });

  it('returns 400 if no columns found', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: '',
        emailVerified: false,
        name: ''
      },
      session: {
        id: 's1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'u1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        token: 'token1',
        ipAddress: null,
        userAgent: null
      }
    });
    vi.mocked(db.query.sessions.findMany).mockResolvedValueOnce([{
      userId: 'u1',
      id: '',
      fileName: '',
      rowCount: 0,
      columnCount: 0,
      sizeBytes: 0,
      columns: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    const res = await POST(mockRequest({ sessionId: 's1', messages: [{}] }));
    expect(res.status).toBe(400);
  });
});