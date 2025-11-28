/**
 * Convert LangChain agent stream to text stream for Fastify
 * Streams chunks live as they arrive - Fastify requires string or Buffer chunks
 * Handles LangChain agent stream events and extracts content
 */
export function stringifyLangChainStream(
  stream: ReadableStream
): ReadableStream {
  const textEncoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      try {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (!done && value) {
            try {
              // Stringify the chunk and send it
              const chunk = JSON.stringify(value) + '\n';
              controller.enqueue(textEncoder.encode(chunk));
            } catch (error) {
              // If processing fails (e.g. JSON.stringify error), we must signal the error
              // to the downstream consumer before closing.
              console.error('Error processing stream chunk:', error);

              try {
                controller.error(error);
              } catch (e) {
                // Ignore if controller is already closed/errored
                console.warn(
                  'Failed to signal error to closed stream controller',
                  e
                );
              }

              // Cancel the reader to ensure upstream cleanup since we're stopping early
              await reader.cancel();
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error in stream conversion:', error);
        try {
          if (controller.desiredSize !== null) {
            controller.error(error);
          }
        } catch (e) {
          // Ignore error if controller is already closed/errored
          console.warn('Failed to signal error to closed stream controller', e);
        }
      } finally {
        try {
          // Check if controller is already closed/errored before trying to close
          if (controller.desiredSize !== null) {
            controller.close();
          }
        } catch (e) {
          // Ignore error if controller is already closed
          console.warn('Failed to close stream controller', e);
        }
        reader.releaseLock();
      }
    },
  });
}

/**
 * Apply streaming-friendly headers to the response
 */
export function applyStreamingHeaders(
  reply: { header: (key: string, value: string) => void },
  customHeaders: Record<string, string> = {}
) {
  reply.header('Content-Type', 'application/x-ndjson; charset=utf-8');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');
  reply.header('Transfer-Encoding', 'chunked');

  // Add custom headers
  Object.entries(customHeaders).forEach(([key, value]) => {
    reply.header(key, value);
  });
}
