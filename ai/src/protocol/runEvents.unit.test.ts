/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRunEventStream, normalizeLangChainEvent } from './runEvents';

export {};

async function readEvents(stream: ReadableStream<Uint8Array>) {
  return (await new Response(stream).text())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

describe('RunEventV1', () => {
  it('emits only curated progress text for workflow phases', () => {
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_chat_model_start',
        data: { input: 'private prompt' },
      }),
      [
        {
          type: 'reasoning.summary',
          data: { summary: 'Reviewing context and planning the next step.' },
        },
      ]
    );
  });

  it('never forwards raw reasoning blocks', () => {
    const events = normalizeLangChainEvent({
      event: 'on_chat_model_stream',
      data: {
        chunk: {
          content: [
            { type: 'thinking', thinking: 'private chain of thought' },
            { type: 'text', text: 'Safe answer' },
          ],
        },
      },
    });

    assert.deepEqual(events, [
      { type: 'message.delta', data: { delta: 'Safe answer' } },
    ]);
  });

  it('filters internal summarization model events', () => {
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_chat_model_stream',
        metadata: { lc_source: 'summarization' },
        data: { chunk: { content: 'private conversation summary' } },
      }),
      []
    );
  });

  it('never forwards raw tool payloads or exact token counts', () => {
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_tool_start',
        run_id: 'tool-1',
        name: 'irmin_repository_upload',
        data: { input: { Authorization: 'secret' } },
      }).at(-1),
      {
        type: 'tool.started',
        data: {
          toolCallId: 'tool-1',
          toolName: 'irmin_repository_upload',
        },
      }
    );
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_chat_model_stream',
        data: {
          chunk: {
            usage_metadata: {
              input_tokens: 100,
              output_tokens: 10,
              total_tokens: 110,
            },
          },
        },
      }),
      [{ type: 'usage', data: { reported: true } }]
    );
  });

  it('emits a safe approval event for a staged destructive tool', () => {
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_tool_end',
        run_id: 'tool-2',
        name: 'irmin_repository_object_delete',
        data: {
          output: JSON.stringify({
            requires_approval: true,
            pending_operation_id: 'pending-1',
            approval_preview: 'Delete object',
            workspace_slug: 'acme',
            arguments: { token: 'secret' },
          }),
        },
      }),
      [
        {
          type: 'tool.approval_required',
          data: {
            toolCallId: 'tool-2',
            toolName: 'irmin_repository_object_delete',
            pendingOperationId: 'pending-1',
            approvalPreview: 'Delete object',
            workspaceSlug: 'acme',
          },
        },
      ]
    );
  });

  it('emits monotonic envelopes and exactly one successful terminal event', async () => {
    const controller = new AbortController();
    const stream = createRunEventStream({
      runId: 'run-1',
      agentId: 'assistant',
      conversationId: 'conversation-1',
      signal: controller.signal,
      source: async () =>
        new ReadableStream({
          start(sourceController) {
            sourceController.enqueue({
              event: 'on_chat_model_stream',
              data: { chunk: { content: 'Hello' } },
            });
            sourceController.close();
          },
        }),
    });

    const events = await readEvents(stream);
    assert.deepEqual(
      events.map((event) => [event.sequence, event.type]),
      [
        [1, 'run.started'],
        [2, 'message.delta'],
        [3, 'run.completed'],
      ]
    );
    assert.ok(events.every((event) => event.version === 1));
  });

  it('normalizes an aborted upstream run as cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await readEvents(
      createRunEventStream({
        runId: 'run-2',
        agentId: 'assistant',
        conversationId: 'conversation-2',
        signal: controller.signal,
        source: async () => new ReadableStream(),
      })
    );

    assert.equal(events.at(-1)?.type, 'run.cancelled');
    assert.equal(
      events.filter((event) => event.type.startsWith('run.')).length,
      2
    );
  });

  it('delivers a terminal event even when persistence fails', async () => {
    const events = await readEvents(
      createRunEventStream({
        runId: 'run-side-effect-failure',
        agentId: 'assistant',
        conversationId: 'conversation-4',
        signal: new AbortController().signal,
        onEvent: (event) => {
          if (event.type === 'run.completed') {
            throw new Error('database unavailable');
          }
        },
        source: async () =>
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
      })
    );
    assert.equal(events.at(-1)?.type, 'run.completed');
  });

  it('records cancellation when the downstream consumer disconnects', async () => {
    const controller = new AbortController();
    const recorded: string[] = [];
    const stream = createRunEventStream({
      runId: 'run-3',
      agentId: 'assistant',
      conversationId: 'conversation-3',
      signal: controller.signal,
      onCancel: () => controller.abort(),
      onEvent: (event) => {
        recorded.push(event.type);
      },
      source: async () =>
        new ReadableStream({
          pull(sourceController) {
            void sourceController;
          },
        }),
    });
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel();
    await Promise.resolve();

    assert.equal(recorded.at(-1), 'run.cancelled');
    assert.equal(controller.signal.aborted, true);
  });
});
