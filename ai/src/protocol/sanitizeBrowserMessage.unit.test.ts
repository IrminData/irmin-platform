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
        { type: 'reasoning', reasoning: 'also private' },
        { type: 'text', text: 'public' },
      ],
      additional_kwargs: {
        reasoning_details: [{ private: true }],
        reasoning_content: 'actual OpenRouter reasoning',
      },
      response_metadata: { thinking: 'private', model: 'example' },
      usage_metadata: { input_tokens: 10, output_tokens: 2 },
      tool_calls: [
        { name: 'upload', args: { headers: { Authorization: 'secret' } } },
      ],
    },
  };

  const sanitized = sanitizeBrowserMessage(original) as typeof original;
  assert.deepEqual(sanitized.data.content, [{ type: 'text', text: 'public' }]);
  assert.deepEqual(sanitized.data.additional_kwargs, {});
  assert.deepEqual(sanitized.data.response_metadata, {});
  assert.equal('usage_metadata' in sanitized.data, false);
  assert.equal('tool_calls' in sanitized.data, false);
  assert.equal(original.data.content.length, 3);
});

it('replaces tool results with a curated checkpoint summary', () => {
  const sanitized = sanitizeBrowserMessage({
    type: 'tool',
    data: {
      content: '{"token":"secret","customer":"private"}',
      name: 'irmin_repository_object_content_get',
      tool_call_id: 'call-1',
      artifact: { headers: { Authorization: 'secret' } },
    },
  });
  assert.deepEqual(sanitized, {
    type: 'tool',
    data: {
      content: 'Authorized tool execution completed.',
      name: 'irmin_repository_object_content_get',
      tool_call_id: 'call-1',
    },
  });
});
