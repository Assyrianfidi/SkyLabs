const { expect, test } = require('@jest/globals');

test('basic test', () => {
  expect(1 + 1).toBe(2);
});

test('async test', async () => {
  const result = await Promise.resolve('test');
  expect(result).toBe('test');
});
