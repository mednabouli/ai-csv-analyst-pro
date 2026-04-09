import { describe, it, expect } from 'vitest';
import * as csrf from '../csrf';

describe('csrf lib', () => {
  it('should export issueCsrfToken', () => {
    expect(typeof csrf.issueCsrfToken).toBe('function');
  });
});
