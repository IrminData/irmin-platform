import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

/**
 * Authenticated user context attached to Fastify request
 */
export interface AuthenticatedUser {
  user: User;
  token: string;
}

/**
 * Selected workspace context attached to Fastify request
 */
export interface SelectedWorkspace {
  workspace: Workspace;
  slug: string;
}

/**
 * Error types for authentication middleware
 */
export class AuthenticationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

/**
 * Extended Fastify request interface with authentication and workspace context
 */
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthenticatedUser;
    workspace?: SelectedWorkspace;
    systemAuth?: boolean;
  }
}
