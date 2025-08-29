import { FastifyReply } from 'fastify';

import { ApiErrorSchema } from '@/types/errors';

export interface ErrorResponseData {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * Safely creates and sends a standardized error response
 * Uses safeParse to avoid throwing errors during error handling
 */
export function sendErrorResponse(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  const parseResult = ApiErrorSchema.safeParse({
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  });

  if (parseResult.success) {
    reply.status(statusCode).send(parseResult.data);
  } else {
    // Log the parsing failure if logger is provided
    if (logger) {
      logger.error(
        'Error schema validation failed: %s',
        parseResult.error.toString()
      );
    }

    // Fallback to basic error if parsing fails
    const fallbackError: ErrorResponseData = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    // If the original status code was not 500, try to preserve the error message
    if (statusCode !== 500) {
      fallbackError.error = error;
      fallbackError.message = message;
      fallbackError.statusCode = statusCode;
    }

    reply.status(fallbackError.statusCode).send(fallbackError);
  }
}

/**
 * Convenience function for 500 Internal Server Error responses
 */
export function sendInternalServerError(
  reply: FastifyReply,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendErrorResponse(reply, 500, 'Internal Server Error', message, logger);
}

/**
 * Convenience function for 404 Not Found responses
 */
export function sendNotFoundError(
  reply: FastifyReply,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendErrorResponse(reply, 404, 'Not Found', message, logger);
}

/**
 * Convenience function for 400 Bad Request responses
 */
export function sendBadRequestError(
  reply: FastifyReply,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendErrorResponse(reply, 400, 'Bad Request', message, logger);
}

/**
 * Convenience function for 401 Unauthorized responses
 */
export function sendUnauthorizedError(
  reply: FastifyReply,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendErrorResponse(reply, 401, 'Unauthorized', message, logger);
}

/**
 * Convenience function for 403 Forbidden responses
 */
export function sendForbiddenError(
  reply: FastifyReply,
  message: string,
  logger?: { error: (msg: string, ...args: unknown[]) => void }
): void {
  sendErrorResponse(reply, 403, 'Forbidden', message, logger);
}
