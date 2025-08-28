import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from '@/config/env';
import { seedDefaultModels } from '@/config/models';
import { chatRoutes } from '@/routes/chat';
import { conversationRoutes } from '@/routes/conversations';
import { streamingService } from '@/services/streaming';

// Create Fastify instance
const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
});

// Register CORS
server.register(cors, {
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
  credentials: env.CORS_CREDENTIALS,
});

// Global error handler
server.setErrorHandler((error, _, reply) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  server.log.error(error);

  reply.status(statusCode).send({
    error: error.name || 'Error',
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
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

// API routes
server.register(chatRoutes, { prefix: '/api' });
server.register(conversationRoutes, { prefix: '/api' });

// 404 handler
server.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
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
    // Cleanup streaming service and MCP connections
    await streamingService.cleanup();
    
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