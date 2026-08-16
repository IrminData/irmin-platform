/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules -- Node test entrypoint. */
import type { StoredMessage } from '@langchain/core/messages';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMessageRunStatus } from './storedMessageHelpers';

describe('stored message run status', () => {
  it('distinguishes failed assistant messages from successful responses', () => {
    const failed = {
      type: 'ai',
      data: {
        content: 'The assistant could not complete this response.',
        role: undefined,
        name: undefined,
        tool_call_id: undefined,
        response_metadata: { runStatus: 'failed' },
      },
    } as unknown as StoredMessage;
    const successful = {
      type: 'ai',
      data: {
        content: 'A normal response.',
        role: undefined,
        name: undefined,
        tool_call_id: undefined,
        response_metadata: {},
      },
    } as unknown as StoredMessage;

    assert.equal(getMessageRunStatus(failed), 'failed');
    assert.equal(getMessageRunStatus(successful), undefined);
  });
});
