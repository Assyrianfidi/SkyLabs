import { describe, it, expect } from '@jest/globals';

describe('Basic TypeScript Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});
