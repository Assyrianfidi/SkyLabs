import test from 'node:test';
import assert from 'node:assert';

test('synchronous passing test', (t) => {
  assert.strictEqual(1, 1);
});

test('asynchronous passing test', async (t) => {
  const result = await Promise.resolve('hello');
  assert.strictEqual(result, 'hello');
});
