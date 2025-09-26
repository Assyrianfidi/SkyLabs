// Simple test to verify Jest is working
test('1 + 1 equals 2', () => {
  expect(1 + 1).toBe(2);
});

describe('Basic test suite', () => {
  it('should pass a basic assertion', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });
});
