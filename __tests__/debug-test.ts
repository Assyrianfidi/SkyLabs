import { jest, describe, it, expect } from '@jest/globals';

describe('Debug Test', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should have jest defined', () => {
    expect(jest).toBeDefined();
  });

  it('should mock console.log', () => {
    const testMessage = 'This should be mocked';
    console.log(testMessage);
    expect(console.log).toHaveBeenCalledWith(testMessage);
  });
});
