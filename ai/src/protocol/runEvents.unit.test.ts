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
