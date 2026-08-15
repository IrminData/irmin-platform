/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { sanitizeBrowserMessage } from './sanitizeBrowserMessage';

export {};

it('removes reasoning artifacts without mutating the checkpoint message', () => {
  const original = {
    type: 'ai',
    data: {
      content: [
        { type: 'thinking', thinking: 'private' },
        { type: 'reasoning', reasoning: 'private OpenRouter reasoning' },
        { type: 'text', text: 'public' },
      ],
      additional_kwargs: {
        reasoning_details: [{ private: true }],
        reasoning_content: 'private OpenRouter reasoning',
      },
      response_metadata: { thinking: 'private', model: 'example' },
    },
  };

  const sanitized = sanitizeBrowserMessage(original) as typeof original;
  assert.deepEqual(sanitized.data.content, [{ type: 'text', text: 'public' }]);
  assert.deepEqual(sanitized.data.additional_kwargs, {});
  assert.deepEqual(sanitized.data.response_metadata, { model: 'example' });
  assert.equal(original.data.content.length, 3);
});
