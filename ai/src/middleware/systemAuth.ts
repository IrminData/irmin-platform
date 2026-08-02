import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';

import { env } from '@/config/env';

import { AuthenticationError } from '@/types/request-context';

/**
 * System Token Authentication Middleware
 *
 * This middleware validates the AI_API_SYSTEM_TOKEN for system-level operations
 * that bypass user/workspace authentication requirements. Used for internal
 * operations and system-managed collections.
 */
const systemAuthMiddleware = async (
  req: IncomingMessage & {
    systemAuth?: boolean;
    log: unknown;
  },
  _res: ServerResponse,
  next: (error?: Error) => void
): Promise<void> => {
  try {
    // Extract token from Authorization header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.slice(7); // Remove 'Bearer ' prefix
    } else {
      token = req.headers.authorization;
    }

    if (!token) {
      throw new AuthenticationError('System token is required', 401);
    }

    // Validate against system token
    if (token !== env.AI_API_SYSTEM_TOKEN) {
      throw new AuthenticationError('Invalid system token', 403);
    }

    // Mark request as system authenticated
    req.systemAuth = true;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    const isAuthError = error instanceof AuthenticationError;
    const statusCode = isAuthError ? error.statusCode : 401;
    const message =
      error instanceof Error ? error.message : 'System authentication failed';

    const authError = new AuthenticationError(message, statusCode);
    next(authError);
  }
};

export const systemAuthMiddlewareOnRequestHook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Only apply to system routes
  if (request.url.startsWith('/api/system/')) {
    return new Promise<void>((resolve) => {
      const req = request.raw as IncomingMessage & {
        systemAuth?: boolean;
        log: typeof request.log;
      };
      const res = reply.raw;
      req.log = request.log;

      systemAuthMiddleware(req, res, (error?: Error) => {
        if (error) {
          const statusCode = (error as AuthenticationError).statusCode || 401;
          reply
            .code(statusCode)
            .type('application/json')
            .send({
              error: 'SystemAuthenticationError',
              message: error.message || 'System authentication failed',
              statusCode,
            });
        } else {
          // Copy system auth from raw request to Fastify request
          if (req.systemAuth) {
            (request as FastifyRequest & { systemAuth?: boolean }).systemAuth =
              req.systemAuth;
          }
          resolve();
        }
      });
    });
  }
};
