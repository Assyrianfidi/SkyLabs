import { test, expect } from '@jest/globals';

// Simple TypeScript test
function add(a: number, b: number): number {
  return a + b;
}

describe('TypeScript Test Suite', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });
});
