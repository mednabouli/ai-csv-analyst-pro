import { describe, it, expect } from 'vitest';
import * as auth from '../auth';

describe('auth module', () => {
  it('should be an object with expected keys', () => {
    expect(typeof auth).toBe('object');
    // Optionally check for known config/utility exports if desired
  });

  it('emailTemplate returns expected HTML', () => {
    const html = auth.emailTemplate({
      heading: 'Test Heading',
      body: 'Test Body',
      cta: { label: 'Click Me', url: 'https://example.com' },
      footer: 'Test Footer',
    });
    expect(html).toContain('Test Heading');
    expect(html).toContain('Test Body');
    expect(html).toContain('Click Me');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Test Footer');
  });
});
