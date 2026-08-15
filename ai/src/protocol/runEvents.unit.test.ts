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

  it('filters internal summarization streams and operational usage', () => {
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_chat_model_stream',
        metadata: { lc_source: 'summarization' },
        data: { chunk: { content: 'private summary' } },
      }),
      []
    );
    assert.deepEqual(
      normalizeLangChainEvent({
        event: 'on_chat_model_stream',
        data: {
          chunk: {
            content: '',
            usage_metadata: { input_tokens: 10, output_tokens: 2 },
          },
        },
      }),
      []
    );
  });

  it('never forwards raw tool arguments or results', () => {
    const serialized = JSON.stringify([
      ...normalizeLangChainEvent({
        event: 'on_tool_start',
        run_id: 'tool-1',
        name: 'irmin_repository_object_upload_url',
        data: { input: { headers: { Authorization: 'Bearer secret' } } },
      }),
      ...normalizeLangChainEvent({
        event: 'on_tool_end',
        run_id: 'tool-1',
        name: 'irmin_repository_object_upload_url',
        data: { output: { token: 'secret', content: 'private' } },
      }),
    ]);
    assert.doesNotMatch(serialized, /Bearer secret|private|"token"|"headers"/);
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

  it('delivers a terminal event even when persistence callbacks reject', async () => {
    const stream = createRunEventStream({
      runId: 'run-callback-failure',
      agentId: 'assistant',
      conversationId: 'conversation-callback-failure',
      signal: new AbortController().signal,
      onEvent: async (event) => {
        if (event.type === 'run.completed') throw new Error('database down');
      },
      source: async () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue({
              event: 'on_chat_model_stream',
              data: { chunk: { content: 'Complete' } },
            });
            controller.close();
          },
        }),
    });

    const events = await readEvents(stream);
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

    assert.equal(recorded.at(-1), 'run.cancelled');
    assert.equal(controller.signal.aborted, true);
  });
});
