/**
 * Decode newline-delimited JSON without assuming that transport chunks align
 * with record or UTF-8 boundaries.
 *
 * @param stream - Byte stream containing newline-delimited JSON records.
 * @param signal - Optional cancellation signal for the upstream request.
 * @returns Parsed records in transport order.
 */
export async function* decodeNDJSONStream<T>(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<T> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const cancelReader = () => {
    void reader.cancel(signal?.reason).catch(() => undefined);
  };

  if (signal?.aborted) {
    cancelReader();
    reader.releaseLock();
    throw (
      signal.reason ??
      new DOMException('The operation was aborted', 'AbortError')
    );
  }

  signal?.addEventListener('abort', cancelReader, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf('\n');

      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) yield JSON.parse(line) as T;
        newlineIndex = buffer.indexOf('\n');
      }
    }

    if (signal?.aborted) {
      throw (
        signal.reason ??
        new DOMException('The operation was aborted', 'AbortError')
      );
    }

    buffer += decoder.decode();
    const finalLine = buffer.trim();
    if (finalLine) yield JSON.parse(finalLine) as T;
  } finally {
    signal?.removeEventListener('abort', cancelReader);
    reader.releaseLock();
  }
}
