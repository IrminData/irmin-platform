/**
 * These tests protect the browser stream contract: valid NDJSON must decode
 * identically regardless of how proxies split bytes or Unicode code points.
 */
/* eslint-disable import-x/no-nodejs-modules, import-x/no-unused-modules */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeNDJSONStream } from './decodeNDJSONStream';

const encoder = new TextEncoder();
const records = [
  { event: 'metadata', data: { conversationId: 'conversation-1' } },
  { event: 'message', data: { delta: 'Tere 👋 maailm' } },
  { event: 'stream_end', data: { status: 'complete' } },
];
const encoded = encoder.encode(
  records.map((record) => JSON.stringify(record)).join('\n') + '\n'
);

function chunkedStream(splitPoints: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      let start = 0;
      for (const end of [...splitPoints, encoded.length]) {
        controller.enqueue(encoded.slice(start, end));
        start = end;
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const decoded: unknown[] = [];
  for await (const record of decodeNDJSONStream(stream)) decoded.push(record);
  return decoded;
}

describe('decodeNDJSONStream', () => {
  it('decodes records split at every possible byte boundary', async () => {
    for (let split = 1; split < encoded.length; split += 1) {
      assert.deepEqual(await collect(chunkedStream([split])), records);
    }
  });

  it('decodes a final record without a trailing newline', async () => {
    const value = { event: 'stream_end', data: { status: 'complete' } };
    const bytes = encoder.encode(JSON.stringify(value));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });

    const decoded: unknown[] = [];
    for await (const record of decodeNDJSONStream(stream)) decoded.push(record);
    assert.deepEqual(decoded, [value]);
  });

  it('cancels a blocked source when aborted', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const controller = new AbortController();
    const decoding = collectWithSignal(stream, controller.signal);

    controller.abort(new DOMException('Stopped', 'AbortError'));

    await assert.rejects(decoding, { name: 'AbortError' });
    assert.equal(cancelled, true);
  });
});

async function collectWithSignal(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal
) {
  const decoded: unknown[] = [];
  for await (const record of decodeNDJSONStream(stream, signal)) {
    decoded.push(record);
  }
  return decoded;
}
