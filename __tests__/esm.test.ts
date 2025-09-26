// Simple test to verify ESM + TypeScript + Jest setup
import { describe, it, expect } from '@jest/globals';

describe('ESM Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should support ES modules', () => {
    const obj = { a: 1 };
    const spread = { ...obj, b: 2 };
    expect(spread).toEqual({ a: 1, b: 2 });
  });
});
