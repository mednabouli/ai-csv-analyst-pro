import { describe, it, expect } from 'vitest';
import * as stripe from '../stripe';

describe('stripe module', () => {
  it('should export PLANS', () => {
    expect(stripe.PLANS).toBeDefined();
  });
});
