import IrminCore from '@/irmin-api';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';

import type {
  AuthenticatedUser,
  SelectedWorkspace,
} from '@/types/request-context';
import { AuthenticationError } from '@/types/request-context';

/**
 * Workspace Selection Middleware
 *
 * This middleware extracts the workspace slug from the X-Workspace-Slug header,
 * fetches the workspace details from the main Irmin API, and attaches the
 * selected workspace context to the request. This middleware is mandatory
 * and validates that the user has access to the specified workspace for
 * proper billing and access control.
 */
const workspaceMiddleware = async (
  req: IncomingMessage & {
    auth?: AuthenticatedUser;
    workspace?: SelectedWorkspace;
    log: unknown;
  },
  _res: ServerResponse,
  next: (error?: Error) => void
): Promise<void> => {
  try {
    // Extract workspace slug from X-Workspace-Slug header
    const workspaceSlug = req.headers['x-workspace-slug'] as string;

    // Workspace slug is mandatory for all API requests
    if (!workspaceSlug) {
      throw new AuthenticationError('X-Workspace-Slug header is required', 400);
    }

    // Ensure user is authenticated (workspace selection requires auth)
    if (!req.auth) {
      throw new AuthenticationError(
        'Authentication required for workspace selection'
      );
    }

    // Create Irmin Core client with the user's token
    const irminCore = new IrminCore(req.auth.token);

    // Fetch workspace details from the main Irmin API
    let workspaceResponse;
    try {
      workspaceResponse = await irminCore.workspaceService.fetchWorkspace({
        workspaceSlug,
      });
    } catch (apiError) {
      const apiErrorMessage =
        apiError instanceof Error ? apiError.message : 'Unknown API error';

      // Handle different error scenarios
      if (
        apiErrorMessage.includes('404') ||
        apiErrorMessage.includes('Not Found')
      ) {
        throw new AuthenticationError(
          `Workspace '${workspaceSlug}' not found`,
          404
        );
      } else if (
        apiErrorMessage.includes('403') ||
        apiErrorMessage.includes('Forbidden')
      ) {
        throw new AuthenticationError(
          `Access denied to workspace '${workspaceSlug}'`,
          403
        );
      } else {
        throw new AuthenticationError(
          `Failed to fetch workspace: ${apiErrorMessage}`,
          500
        );
      }
    }

    if (!workspaceResponse.data) {
      throw new AuthenticationError('Workspace data not found in API response');
    }

    // Attach selected workspace context to request
    const workspaceContext: SelectedWorkspace = {
      workspace: workspaceResponse.data,
      slug: workspaceSlug,
    };
    req.workspace = workspaceContext;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Don't send response here - let the hook handle it
    // Just pass the error to the next() callback
    const isAuthError = error instanceof AuthenticationError;
    const statusCode = isAuthError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : 'Workspace selection failed';

    const authError = new AuthenticationError(message, statusCode);
    next(authError);
    return;
  }
};

export const workspaceMiddlewareOnRequestHook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Only apply workspace middleware to /api routes
  if (request.url.startsWith('/api/')) {
    return new Promise<void>((resolve) => {
      const req = request.raw as IncomingMessage & {
        auth?: AuthenticatedUser;
        workspace?: SelectedWorkspace;
        log: typeof request.log;
      };
      const res = reply.raw;
      req.log = request.log;

      workspaceMiddleware(req, res, (error?: Error) => {
        if (error) {
          const statusCode = (error as AuthenticationError).statusCode || 500;
          reply
            .code(statusCode)
            .type('application/json')
            .send({
              error: 'WorkspaceError',
              message: error.message || 'Workspace selection failed',
              statusCode,
            });
          // Don't resolve - let Fastify handle the response termination
        } else {
          // Copy workspace from raw request to Fastify request
          if (req.workspace) {
            request.workspace = req.workspace;
          }
          resolve();
        }
      });
    });
  }
};
