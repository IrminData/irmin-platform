// import type { AIMessageChunk } from '@langchain/core/messages';
// import { toUIMessageStream } from '@ai-sdk/langchain';
// import { createUIMessageStreamResponse } from 'ai';

// TODO: We should be doing this in Next.js
// /**
//  * Convert LangChain agent stream to Vercel AI SDK format
//  * Uses Vercel's official utilities for proper formatting
//  */
// export function convertLangChainToVercelStream(
//   stream: ReadableStream<AIMessageChunk>
// ) {
//   return createUIMessageStreamResponse({
//     stream: toUIMessageStream(stream),
//   });
// }

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
            // Stringify the chunk and send it
            const chunk = JSON.stringify(value) + '\n';
            controller.enqueue(textEncoder.encode(chunk));
          }
        }
      } catch (error) {
        console.error('Error in stream conversion:', error);
        controller.error(error);
      } finally {
        controller.close();
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
