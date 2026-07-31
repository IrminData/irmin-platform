import { FastifyReply } from 'fastify';
import { z } from 'zod';

/**
 * Safely sends a structured response validated against a Zod schema
 * Uses safeParse to avoid throwing errors during response handling
 */
function sendStructuredResponse<T extends z.ZodTypeAny>(
  reply: FastifyReply,
  statusCode: number,
  schema: T,
  data: z.infer<T>,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  const parseResult = schema.safeParse(data);

  if (parseResult.success) {
    reply.status(statusCode).send(parseResult.data);
  } else {
    // Log the parsing failure if logger is provided
    if (logger) {
      logger.error(
        'Response schema validation failed: %s',
        parseResult.error.toString()
      );
    }

    // Fallback to basic error if parsing fails
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Response validation failed',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Convenience function for 200 OK responses
 */
export function sendOkResponse<T extends z.ZodTypeAny>(
  reply: FastifyReply,
  schema: T,
  data: z.infer<T>,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendStructuredResponse(reply, 200, schema, data, logger);
}

/**
 * Convenience function for 201 Created responses
 */
export function sendCreatedResponse<T extends z.ZodTypeAny>(
  reply: FastifyReply,
  schema: T,
  data: z.infer<T>,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendStructuredResponse(reply, 201, schema, data, logger);
}

/**
 * Convenience function for 204 No Content responses
 */
export function sendNoContentResponse(reply: FastifyReply): void {
  reply.status(204).send();
}
