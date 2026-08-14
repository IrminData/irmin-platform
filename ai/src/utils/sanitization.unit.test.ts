/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { textSanitizer } from './sanitization';

describe('user input normalization', () => {
  it('preserves valid SQL, Go, base64, and role-like content', () => {
    const input = `<|system|>\nSELECT * FROM x WHERE value = 'a';\npackage main\nYWJjZGVmZ2hpamtsbW5vcA==`;
    assert.equal(textSanitizer.sanitizeUserMessage(input).sanitized, input);
  });

  it('normalizes Unicode composition and line endings only', () => {
    assert.equal(
      textSanitizer.sanitizeUserMessage('Cafe\u0301\r\nnext').sanitized,
      'Café\nnext'
    );
  });

  it('rejects oversized input instead of silently truncating it', () => {
    assert.throws(
      () => textSanitizer.sanitizeUserMessage('1234', 3),
      /3 character limit/
    );
  });
});
