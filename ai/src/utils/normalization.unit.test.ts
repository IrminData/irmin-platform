/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { textNormalizer } from './normalization';

describe('user input normalization', () => {
  it('preserves valid SQL, Go, base64, and role-like content', () => {
    const input = `<|system|>\nSELECT * FROM x WHERE value = 'a';\npackage main\nYWJjZGVmZ2hpamtsbW5vcA==`;
    assert.equal(textNormalizer.normalizeUserMessage(input), input);
  });

  it('normalizes Unicode composition and line endings only', () => {
    assert.equal(
      textNormalizer.normalizeUserMessage('Cafe\u0301\r\nnext'),
      'Café\nnext'
    );
  });

  it('rejects oversized input instead of silently truncating it', () => {
    assert.throws(
      () => textNormalizer.normalizeUserMessage('1234', 3),
      /3 character limit/
    );
  });
});
