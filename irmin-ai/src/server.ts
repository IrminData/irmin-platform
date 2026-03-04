import './instrument';

import { AgentsManager } from '@/agents';
import { closeDatabase, runMigrations } from '@/database';
import { indexingService } from '@/vector';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import * as Sentry from '@sentry/node';
import Fastify, { FastifyError } from 'fastify';
import { createHash } from 'node:crypto';

import { analyticsService } from '@/services/analytics';
import { preloadAllDocs } from '@/services/staticDocs';

import { authMiddlewareOnRequestHook } from '@/middleware/auth';
import { systemAuthMiddlewareOnRequestHook } from '@/middleware/systemAuth';
import { workspaceMiddlewareOnRequestHook } from '@/middleware/workspace';

import { agentRoutes } from '@/routes/agents';
import { conversationRoutes } from '@/routes/conversations';
import { embeddingRoutes } from '@/routes/embeddings';
import { infoRoutes } from '@/routes/info';
import { systemEmbeddingRoutes } from '@/routes/systemEmbeddings';
import { systemScriptRoutes } from '@/routes/systemScripts';

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

// Register CORS before rate limiting so that 429 responses include CORS headers
// (otherwise browsers interpret rate-limited cross-origin responses as network errors)
server.register(cors, {
  origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
  credentials: env.CORS_CREDENTIALS,
  // Ensure custom headers are exposed so the browser can read them
  exposedHeaders: ['X-Conversation-Id', 'X-Agent-Id', 'X-Message-Id'],
});

// Register rate limiting - especially important for LLM endpoints to prevent cost abuse
server.register(rateLimit, {
  max: 100, // max requests per window
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit by a hash of the auth header to avoid storing raw JWTs in memory
    const authHeader = request.headers.authorization;
    if (authHeader) {
      return createHash('sha256').update(authHeader).digest('hex');
    }
    return request.ip;
  },
});

// Register Swagger
server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Irmin AI API',
      description:
        'LangChain-based AI chat and agents API for Irmin, with streaming responses, Groq/OpenAI integration, and MCP tools support.',
      version: process.env.npm_package_version || '1.0.0',
      contact: {
        name: 'Irmin Team',
        email: 'hello@irmin.co',
      },
    },
    externalDocs: {
      url: 'https://docs.irmin.co',
      description: 'Find more info here',
    },
    servers: [
      {
        url: env.URL,
        description: 'Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        workspaceHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Workspace-Slug',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
          required: ['error', 'message', 'statusCode'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        workspaceHeader: [],
      },
    ],
  },
});

// Register Swagger UI
server.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (_request, _reply, next) {
      next();
    },
    preHandler: function (_request, _reply, next) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

// Register Sentry error handler FIRST (before custom error handler)
Sentry.setupFastifyErrorHandler(server);

// Global error handler
server.setErrorHandler(async (error: FastifyError, _, reply) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Capture error in Sentry before handling
  Sentry.captureException(error);

  server.log.error(error);

  // Log error analytics
  analyticsService.logEvent({
    eventType: 'global_error',
    eventData: {
      message,
      stack: error.stack,
    },
  });

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

// Add system authentication hook for /api/system routes
server.addHook('onRequest', systemAuthMiddlewareOnRequestHook);

// Add authentication hook for /api routes (excluding system routes)
server.addHook('onRequest', authMiddlewareOnRequestHook);

// Add workspace selection hook for /api routes (runs after auth, excluding system routes)
server.addHook('onRequest', workspaceMiddlewareOnRequestHook);

// Create a single shared AgentsManager instance for all routes
const sharedAgentsManager = new AgentsManager();

// Decorate Fastify with shared services
server.decorate('agentsManager', sharedAgentsManager);

// Register API routes
server.register(
  async function (fastify) {
    await fastify.register(conversationRoutes);
    await fastify.register(agentRoutes);
    await fastify.register(embeddingRoutes);
    await fastify.register(infoRoutes);
    await fastify.register(systemEmbeddingRoutes);
    await fastify.register(systemScriptRoutes);
  },
  { prefix: '/api' }
);

// 404 handler
server.setNotFoundHandler(async (request, reply) => {
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
    // Run database migrations (safe to call multiple times)
    await runMigrations();
    server.log.info('Database migrations completed');

    // Seed default AI models
    await seedDefaultModels();
    server.log.info('AI models seeded');

    // Run parallel initialization tasks
    await Promise.all([
      // Ensure system collections exist
      indexingService.ensureSystemCollections(),
      // Preload static docs into cache for faster first requests
      preloadAllDocs(),
    ]);
    server.log.info('System collections and static docs initialized');

    // Start the server
    await server.listen({
      host: env.HOST,
      port: env.PORT,
    });

    server.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    server.log.info(`Health check: http://${env.HOST}:${env.PORT}/health`);
    server.log.info(`API Documentation: http://${env.HOST}:${env.PORT}/docs`);
  } catch (error) {
    server.log.error(error as Error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Close server (stops accepting new requests, waits for in-flight)
    await server.close();
    server.log.info('Server closed');

    // Close database connection pool
    await closeDatabase();
    server.log.info('Database connections closed');

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

// eslint-disable-next-line import-x/no-unused-modules
export { server };
