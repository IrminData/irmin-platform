import type { User } from '@/irmin-api/types/user';

/**
 * Authenticated user context attached to Fastify request
 */
export interface AuthenticatedUser {
  user: User;
  token: string;
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
 * Extended Fastify request interface with authentication context
 */
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthenticatedUser;
  }
}
