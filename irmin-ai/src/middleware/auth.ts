import IrminCore from '@/irmin-api';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';

import type { AuthenticatedUser } from '@/types/request-context';
import { AuthenticationError } from '@/types/request-context';

/**
 * JWT Authentication Middleware
 *
 * This middleware extracts the JWT token from the Authorization header,
 * fetches the user profile from the main Irmin API, and attaches the
 * authenticated user context to the request.
 */
const authMiddleware = async (
  req: IncomingMessage & { auth?: AuthenticatedUser; log: unknown },
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
      token = req.headers.authorization.slice(7); // Remove 'Bearer ' prefix if it exists
      if (!token) {
        throw new AuthenticationError('JWT token is required');
      }
    } else {
      token = req.headers.authorization;
    }
    if (!token) {
      throw new AuthenticationError('JWT token is required');
    }

    // Create Irmin Core client with the token
    const irminCore = new IrminCore(token);

    // Fetch user profile from the main Irmin API with 5-second timeout
    let profileResponse;
    try {
      profileResponse = await irminCore.profileService.getProfile(5000);
    } catch (apiError) {
      const apiErrorMessage =
        apiError instanceof Error ? apiError.message : 'Unknown API error';

      // Log the error for debugging
      console.error('Auth middleware: Failed to fetch user profile:', {
        error: apiErrorMessage,
        isTimeout: apiErrorMessage.includes('timeout'),
      });

      throw new AuthenticationError(
        `Failed to fetch user profile: ${apiErrorMessage}`,
        apiErrorMessage.includes('401') ||
        apiErrorMessage.includes('Unauthorized')
          ? 401
          : 500
      );
    }

    if (!profileResponse.data) {
      throw new AuthenticationError('User profile not found in API response');
    }

    // Attach authenticated user context to request
    const authContext: AuthenticatedUser = {
      user: profileResponse.data,
      token,
    };
    req.auth = authContext;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Don't send response here - let the hook handle it
    // Just pass the error to the next() callback
    const isAuthError = error instanceof AuthenticationError;
    const statusCode = isAuthError ? error.statusCode : 401;
    const message =
      error instanceof Error ? error.message : 'Authentication failed';

    const authError = new AuthenticationError(message, statusCode);
    next(authError);
    return;
  }
};

export const authMiddlewareOnRequestHook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Only apply auth to /api routes
  if (request.url.startsWith('/api/')) {
    return new Promise<void>((resolve) => {
      const req = request.raw as IncomingMessage & {
        auth?: AuthenticatedUser;
        log: typeof request.log;
      };
      const res = reply.raw;
      req.log = request.log;

      authMiddleware(req, res, (error?: Error) => {
        if (error) {
          const statusCode = (error as AuthenticationError).statusCode || 401;
          reply
            .code(statusCode)
            .type('application/json')
            .send({
              error: 'AuthenticationError',
              message: error.message || 'Authentication failed',
              statusCode,
            });
          // Don't resolve - let Fastify handle the response termination
        } else {
          // Copy auth from raw request to Fastify request
          if (req.auth) {
            request.auth = req.auth;
          }
          resolve();
        }
      });
    });
  }
};
