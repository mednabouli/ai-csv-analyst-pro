import { describe, it, expect } from 'vitest';
import * as route from '../[...all]/route';

describe('api/auth/[...all]/route', () => {
  it('should export GET and POST handlers', () => {
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
  });
});
