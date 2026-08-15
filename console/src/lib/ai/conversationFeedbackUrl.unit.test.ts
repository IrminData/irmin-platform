/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { conversationFeedbackUrl } from './conversationFeedbackUrl';

describe('conversationFeedbackUrl', () => {
  it('keeps hostile identifiers inside encoded path segments', () => {
    const url = new URL(
      conversationFeedbackUrl(
        'https://ai.irmin.dev',
        '../../admin?redirect=https://evil.example/#fragment',
        '//evil.example/messages/1?overwrite=true'
      )
    );

    assert.equal(url.origin, 'https://ai.irmin.dev');
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
    assert.equal(
      url.pathname,
      '/api/conversations/..%2F..%2Fadmin%3Fredirect%3Dhttps%3A%2F%2Fevil.example%2F%23fragment/feedback/%2F%2Fevil.example%2Fmessages%2F1%3Foverwrite%3Dtrue'
    );
  });
});
