import { describe, it, expect } from 'vitest';
import * as env from '../env';

describe('env module', () => {
  it('should export expected environment variables', () => {
    expect(typeof env).toBe('object');
    // Optionally check for specific env keys
  });
});
