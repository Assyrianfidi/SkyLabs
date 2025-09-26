// Import Jest types explicitly for better type checking
import { describe, it, expect, jest } from '@jest/globals';

describe('TypeScript Test Suite', () => {
  it('should pass a basic TypeScript test', () => {
    const result: number = 1 + 1;
    expect(result).toBe(2);
  });

  it('should handle async/await with TypeScript', async () => {
    const fetchData = (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('data'), 10);
      });
    };
    
    const result = await fetchData();
    expect(result).toBe('data');
  });

  it('should mock functions with TypeScript', () => {
    const mockFn = jest.fn((x: number, y: number): number => x + y);
    mockFn(1, 2);
    expect(mockFn).toHaveBeenCalledWith(1, 2);
    expect(mockFn.mock.results[0].value).toBe(3);
  });
});
