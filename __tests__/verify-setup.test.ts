// Simple test to verify Jest setup
import { describe, it, expect, jest } from '@jest/globals';

describe('Jest Setup Verification', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async code', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should have jest defined', () => {
    expect(jest).toBeDefined();
  });
});
