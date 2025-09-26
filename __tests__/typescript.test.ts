// TypeScript test file
import { describe, it, expect } from '@jest/globals';

describe('TypeScript Test Suite', () => {
  it('should pass a basic TypeScript test', () => {
    const message: string = 'Hello, TypeScript!';
    expect(message).toBe('Hello, TypeScript!');
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('async result');
    expect(result).toBe('async result');
  });

  it('should support ES modules', () => {
    const obj = { a: 1 };
    const spread = { ...obj, b: 2 };
    expect(spread).toEqual({ a: 1, b: 2 });
  });
});
