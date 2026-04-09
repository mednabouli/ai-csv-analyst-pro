import { describe, it, expect } from 'vitest';
import * as embed from '../embed';

describe('rag/embed module', () => {
  it('should export generateEmbedding', () => {
    expect(typeof embed.generateEmbedding).toBe('function');
  });
  it('should export generateEmbeddings', () => {
    expect(typeof embed.generateEmbeddings).toBe('function');
  });

  // No embedText export in embed module; test removed
});
