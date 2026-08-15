/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RunEventType, RunEventV1 } from './runEvents';
import {
  finalizeRunState,
  initialRunState,
  reduceRunEvent,
} from './runReducer';

function event(
  sequence: number,
  type: RunEventType,
  data: unknown = {}
): RunEventV1 {
  return {
    version: 1,
    sequence,
    timestamp: '2026-08-15T12:00:00.000Z',
    runId: 'run-1',
    type,
    data,
  };
}

describe('run reducer', () => {
  it('ignores duplicate events without duplicating content', () => {
    const started = reduceRunEvent(initialRunState, event(1, 'run.started'));
    const withText = reduceRunEvent(
      started,
      event(2, 'message.delta', { delta: 'Hi' })
    );
    const duplicate = reduceRunEvent(
      withText,
      event(2, 'message.delta', { delta: 'Hi' })
    );
    assert.equal(duplicate.content, 'Hi');
    assert.equal(duplicate.nextSequence, 3);
  });

  it('fails deterministically on an out-of-order event', () => {
    const state = reduceRunEvent(
      initialRunState,
      event(2, 'message.delta', { delta: 'late' })
    );
    assert.equal(state.status, 'failed');
    assert.equal(state.error?.code, 'out_of_order');
  });

  it('does not let a late failure replace a completed terminal state', () => {
    const started = reduceRunEvent(initialRunState, event(1, 'run.started'));
    const completed = reduceRunEvent(started, event(2, 'run.completed'));
    const late = reduceRunEvent(completed, event(3, 'run.failed'));
    assert.equal(late.status, 'completed');
  });

  it('fails a stream that ends without a terminal event', () => {
    const started = reduceRunEvent(initialRunState, event(1, 'run.started'));
    assert.equal(finalizeRunState(started).error?.code, 'missing_terminal');
  });

  it('stores only the approval handle and preview for destructive tools', () => {
    const started = reduceRunEvent(initialRunState, event(1, 'run.started'));
    const pending = reduceRunEvent(
      started,
      event(2, 'tool.approval_required', {
        toolCallId: 'tool-1',
        toolName: 'irmin_repository_object_delete',
        pendingOperationId: 'pending-1',
        approvalPreview: 'delete repository object',
        workspaceSlug: 'workspace-a',
      })
    );
    assert.deepEqual(pending.tools['tool-1'], {
      id: 'tool-1',
      name: 'irmin_repository_object_delete',
      status: 'approval_required',
      input: undefined,
      output: undefined,
      error: undefined,
      pendingOperationId: 'pending-1',
      approvalPreview: 'delete repository object',
      workspaceSlug: 'workspace-a',
    });
  });
});
