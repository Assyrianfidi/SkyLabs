test('basic test', () => {
  expect(1 + 1).toBe(2);
});

test('async test', async () => {
  const result = await Promise.resolve('hello');
  expect(result).toBe('hello');
});
