import { describe, it, expect } from '@jest/globals';

describe('TypeScript Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});
