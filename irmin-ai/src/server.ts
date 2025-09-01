/* eslint-disable import-x/no-unused-modules */
import { authMiddlewareOnRequestHook } from '@/middleware/auth';
import { workspaceMiddlewareOnRequestHook } from '@/middleware/workspace';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { analyticsService } from '@/services/analytics';

import { agentRoutes } from '@/routes/agents';
import { chatRoutes } from '@/routes/chat';
import { conversationRoutes } from '@/routes/conversations';

import { env } from '@/config/env';
import { seedDefaultModels } from '@/config/models';

import { sendErrorResponse } from '@/utils/errors';

// Create Fastify instance
const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
});

// Register helmet middleware
server.register(helmet, {
  global: true,
});

// Register CORS
server.register(cors, {
  origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
  credentials: env.CORS_CREDENTIALS,
});

// Global error handler
server.setErrorHandler(async (error, request, reply) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  server.log.error(error);

  // Log error analytics
  await analyticsService.logError(
    'global_error',
    message,
    undefined,
    undefined
  );

  sendErrorResponse(
    reply,
    statusCode,
    error.name || 'Error',
    message,
    server.log
  );
});

// Health check endpoint
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
  };
});

// Add authentication hook for /api routes
server.addHook('onRequest', authMiddlewareOnRequestHook);

// Add workspace selection hook for /api routes (runs after auth)
server.addHook('onRequest', workspaceMiddlewareOnRequestHook);

// Register API routes
server.register(
  async function (fastify) {
    await fastify.register(chatRoutes);
    await fastify.register(conversationRoutes);
    await fastify.register(agentRoutes);
  },
  { prefix: '/api' }
);

// 404 handler
server.setNotFoundHandler(async (request, reply) => {
  // Log 404 analytics
  await analyticsService.logError(
    'not_found',
    `Route ${request.method} ${request.url} not found`,
    undefined,
    undefined
  );

  sendErrorResponse(
    reply,
    404,
    'Not Found',
    `Route ${request.method} ${request.url} not found`,
    server.log
  );
});

// Start server
async function start() {
  try {
    // Seed default AI models
    await seedDefaultModels();
    server.log.info('Database initialized and AI models seeded');

    // Start the server
    await server.listen({
      host: env.HOST,
      port: env.PORT,
    });

    server.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    server.log.info(`Health check: http://${env.HOST}:${env.PORT}/health`);
  } catch (error) {
    server.log.error(error as Error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Close server
    await server.close();
    server.log.info('Server closed');
    process.exit(0);
  } catch (error) {
    server.log.error(error as Error, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  start();
}

export { server };
