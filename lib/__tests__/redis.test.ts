import { describe, it, expect } from 'vitest';
import * as redis from '../redis';

describe('redis module', () => {
  it('should export redis instance', () => {
    expect(redis.redis).toBeDefined();
  });

  it('should export ratelimit instance', () => {
    expect(redis.ratelimit).toBeDefined();
  });

  // No getClient export in redis module; test removed
});
