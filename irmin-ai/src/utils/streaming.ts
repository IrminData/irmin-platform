/**
 * Stream event types for the streaming protocol
 */
interface StreamingEvent {
  event: string;
  data: unknown;
  timestamp?: number;
}

/**
 * Creates a deferred stream that allows pushing events before the source stream is ready.
 * This enables sending initial events (like "thinking" indicators) immediately while
 * the actual agent execution is still being set up in the background.
 *
 * @returns An object containing the readable stream and a controller for pushing events
 */
export function createDeferredStream(): {
  readable: ReadableStream<Uint8Array>;
  pushEvent: (event: StreamingEvent) => void;
  pipeFrom: (
    sourceStream: ReadableStream,
    onFirstChunk?: () => void
  ) => Promise<void>;
  close: () => void;
  error: (err: Error) => void;
} {
  const textEncoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isClosed = false;

  const readable = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      // Client disconnected - stop consuming from source stream
      console.log('[Streaming] Client disconnected, marking stream as closed');
      isClosed = true;
    },
  });

  const pushEvent = (event: StreamingEvent) => {
    if (isClosed || !controller) return;
    try {
      const eventWithTimestamp = { ...event, timestamp: Date.now() };
      const chunk = JSON.stringify(eventWithTimestamp) + '\n';
      controller.enqueue(textEncoder.encode(chunk));
    } catch (e) {
      console.warn('Failed to push event to stream:', e);
    }
  };

  const pipeFrom = async (
    sourceStream: ReadableStream,
    onFirstChunk?: () => void
  ) => {
    if (isClosed || !controller) return;

    const reader = sourceStream.getReader();
    let isFirstChunk = true;
    try {
      while (true) {
        // Check if stream was closed externally - stop consuming LLM tokens
        if (isClosed) {
          console.log('[Streaming] Stream closed, stopping LLM consumption');
          break;
        }

        const { value, done } = await reader.read();
        if (done) break;

        if (value && controller && !isClosed) {
          // Track first actual chunk from LLM
          if (isFirstChunk) {
            isFirstChunk = false;
            onFirstChunk?.();
          }
          try {
            const chunk = JSON.stringify(value) + '\n';
            controller.enqueue(textEncoder.encode(chunk));
          } catch (e) {
            // Stringify failure is a data integrity issue - notify client and stop
            console.error('Error stringifying stream chunk:', e);
            const errorEvent =
              JSON.stringify({
                event: 'error',
                data: {
                  message: 'Failed to serialize stream data',
                  type: 'serialization_error',
                },
                timestamp: Date.now(),
              }) + '\n';
            controller.enqueue(textEncoder.encode(errorEvent));
            isClosed = true;
            controller.error(e instanceof Error ? e : new Error(String(e)));
            break;
          }
        } else if (isClosed) {
          // Stream was closed while we were processing - exit loop
          break;
        }
      }
    } catch (e) {
      console.error('Error piping from source stream:', e);
      if (controller && !isClosed) {
        isClosed = true;
        try {
          controller.error(e);
        } catch {
          // Ignore if already closed
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const close = () => {
    if (isClosed || !controller) return;
    isClosed = true;
    try {
      controller.close();
    } catch {
      // Ignore if already closed
    }
  };

  const error = (err: Error) => {
    if (isClosed || !controller) return;
    isClosed = true;
    try {
      controller.error(err);
    } catch {
      // Ignore if already closed
    }
  };

  return { readable, pushEvent, pipeFrom, close, error };
}

/**
 * Apply streaming-friendly headers to the response.
 * Note: Don't set Transfer-Encoding manually - Fastify handles it automatically
 * when sending a stream, and setting both Transfer-Encoding and Content-Length
 * violates HTTP/1.1 protocol.
 */
export function applyStreamingHeaders(
  reply: { header: (key: string, value: string) => void },
  customHeaders: Record<string, string> = {}
) {
  reply.header('Content-Type', 'application/x-ndjson; charset=utf-8');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');

  // Add custom headers
  Object.entries(customHeaders).forEach(([key, value]) => {
    reply.header(key, value);
  });
}
