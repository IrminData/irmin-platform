/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AIAgentExecuteResponseSchema } from './responses';

describe('agent execution response', () => {
  it('accepts typed specialist output and discards provider messages', () => {
    const parsed = AIAgentExecuteResponseSchema.parse({
      specialistResult: { kind: 'go', code: 'package main\n' },
      messages: [{ response_metadata: { provider: 'internal' } }],
    });

    assert.deepEqual(parsed, {
      specialistResult: { kind: 'go', code: 'package main\n' },
    });
  });
});
