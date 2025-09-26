// Simple TypeScript test with ESM imports
import { describe, it, expect } from '@jest/globals';
import { add } from '../src/utils/math';

describe('TypeScript + ESM Test', () => {
  it('should import and use TypeScript modules', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});
