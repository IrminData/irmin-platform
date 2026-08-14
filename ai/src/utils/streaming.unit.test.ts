/**
 * These tests protect stream cancellation: disconnecting clients must stop
 * upstream model consumption instead of continuing paid work in the background.
 */
/* eslint-disable import-x/no-unused-modules */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDeferredStream } from './streaming';

describe('createDeferredStream', () => {
  it('cancels the source stream and invokes the cancellation hook', async () => {
    let sourceCancelled = false;
    let cancellationReason: unknown;
    const source = new ReadableStream({
      cancel() {
        sourceCancelled = true;
      },
    });
    const deferred = createDeferredStream({
      onCancel(reason) {
        cancellationReason = reason;
      },
    });

    const piping = deferred.pipeFrom(source);
    await deferred.readable.cancel('user stopped');
    await piping;

    assert.equal(sourceCancelled, true);
    assert.equal(cancellationReason, 'user stopped');
  });
});
